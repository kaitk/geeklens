# Trace Geekbench 7 instruction sets with Intel SDE

**Status:** blocked on a go/no-go decision.
**Owner:** unassigned.
**Raised:** 2026-07-28.

Every Geekbench 7 per-workload mapping in `src/isa/benchmarkMapV7.ts` is
`inferred` and renders an amber warning. This task is the only identified route
to a `confirmed` mapping. It needs a decision before it starts because it
requires a Linux environment and a ~400 MB download.

## Decision required

Approve or reject running an Intel SDE instruction-mix analysis against the
Geekbench 7 Linux build.

**Cost:** a Linux box or WSL, a 393 MB tarball, Intel SDE, and a few hours of
benchmark runs under emulation (SDE is slow — expect the suite to take
considerably longer than a native run).

**Benefit:** reproducible per-workload instruction counts, which is criterion 2
in the [evidence bar](../geekbench7-sources.md#evidence-needed-for-confirmation).
Without it, Geekbench 7 badges stay permanently amber unless Primate Labs
publishes an internals document.

## Why nothing cheaper will work

A source review on 2026-07-28 covered the official documents, the launch press,
and community discussion. Recording the dead ends so they are not re-run:

- **`geekbench7-cpu-workloads.pdf` contains no instruction-set information at
  all.** Unlike the Geekbench 6 internals document, it has no ISA appendix and
  no per-workload ISA sentences. Confirmed by reading the full document.
- **No Geekbench 7 benchmark-internals document exists.** `geekbench.com/doc/`
  lists none, and the launch blog post does not mention instruction sets.
- **The AnandTech release thread has effectively nothing.** Pages 43–48 were
  checked. Two mentions only, neither usable:
  - `whoshere`, page 46, post #1146: `perf` profiling showing "approximately 95%
    of sampled cycles execute within `geekbench_avx2`", ~1.5–2% in libm, ~2.5–3%
    in libc. Useful as background (see below) but not per-workload.
  - `igor_kavinski`, page 47: "ST Photo Editor, Video Player, MT Photo Library,
    HDR and MT Photo Editor could be using AVX-512." Speculation from score
    patterns, with no evidence. **Do not act on this.**
- **"Geekbench 7 dropped AVX-512" is an unverified rumour.** Search engines
  assert it confidently, but it could not be traced to any primary post and the
  trail appears to lead back to an old Geekbench 6 discussion. Treat as
  unconfirmed. See below for the defensible version of this claim.
- **ServeTheHome, Signal65, Tom's Hardware, MacRumors, 9to5Mac and the Hacker
  News thread** name libraries and codecs but no instruction sets.
- **Chips and Cheese has not published a Geekbench 7 article.** Their
  Geekbench 6 article is the source of the method proposed here.

## Method

Follow the approach Chester Lam used in
[Evaluating Geekbench 6](https://chipsandcheese.com/p/evaluating-geekbench-6):
run the benchmark under **Intel SDE** with instruction mix collection. SDE gives
exact instruction counts and can emulate ISA extensions regardless of the host
CPU, so a single machine can answer "which extensions would this workload use if
they were available".

Emulate several ISA targets so extension use can be isolated by differencing:

| SDE target        | Flag   | Covers          |
| ----------------- | ------ | --------------- |
| Granite Rapids    | `-grr` | AVX-512 + AMX   |
| Ice Lake (server) | `-icx` | AVX-512, no AMX |
| Haswell           | `-hsw` | AVX2 baseline   |
| Ivy Bridge        | `-ivb` | AVX only        |
| Prescott          | `-p4p` | x86-64 baseline |

Sketch:

```sh
curl -O https://cdn.geekbench.com/Geekbench-7.0.0-Linux.tar.gz   # 393 MB
tar xzf Geekbench-7.0.0-Linux.tar.gz
sde64 -grr -mix -omix mix-grr.txt -- ./geekbench7 --cpu --single-core
```

Run each workload in isolation where the CLI allows it. If it does not, use
SDE's per-region or per-thread mix output to attribute counts to workloads, and
say so in the write-up.

## Prerequisites

- Linux, or WSL2 on this Windows machine.
- Intel SDE (free download from Intel; licence permits this use).
- ~2 GB free disk for the tarball, extraction, and mix output.

## What to record

`docs/geekbench7-sources.md` already specifies the required metadata. Repeating
it here so this file stands alone:

- Geekbench version, build, platform, architecture.
- CPU model and reported metric `20000`.
- Single-core or multi-core workload.
- Tool and exact command used.
- Instruction counts, or representative instructions.
- How base-build instructions were distinguished from workload-specific
  dispatch.
- Whether the result reproduces across multiple runs.

## Two traps specific to this analysis

**1. Base build versus runtime dispatch.** Geekbench ships multiple builds per
platform and selects the most advanced base ISA the system supports; on x86 the
base sets are SSE2 and AVX2. `whoshere`'s profiling confirms Geekbench 7 keeps
this scheme and that the AVX2 build is the one selected. So _every_ workload
will show AVX2 instructions from ordinary compiler codegen. Those are base-build
instructions, not evidence that a workload deliberately accelerates itself with
AVX2, and must not be badged as such. Only counts that appear above the base
build — or that differ between SDE targets — indicate guarded dispatch.

**2. Documented intrinsics are not the same as the measured instruction mix.**
Geekbench 6's internals document describes hand-written intrinsics guarded by
runtime checks. SDE measures everything the compiler emitted. These diverge:
Chips and Cheese measured AVX-512 as _prominent_ in Structure from Motion, while
the Geekbench 6 document lists only AVX2, NEON and NEON FP16 for that workload.

GeekLens badges currently answer the first question. Decide before publishing
results whether a `confirmed` badge means "documented intrinsic" or "measured in
the instruction mix", and make the badge copy say which. Silently mixing the two
will make correct mappings look wrong.

## Workload delta that shapes the expected result

Cross-referencing the Geekbench 6 internals document against the Geekbench 7
workload document gives a prediction worth testing. Every Geekbench 6 CPU
workload that named a heavy ISA is gone from Geekbench 7, except Photo Library:

| Geekbench 6 workload              | ISAs named in GB6 internals                        | Geekbench 7              |
| --------------------------------- | -------------------------------------------------- | ------------------------ |
| Background Blur                   | AVX, AVX2, **AVX-512**, NEON, SME                  | Removed (GPU-only now)   |
| Object Detection                  | AVX-VNNI, AVX512-VNNI, **AMX**, DOTPROD, I8MM, SME | Removed                  |
| Photo Filter                      | AVX2, NEON, NEON FP16                              | Replaced by Photo Editor |
| Object Remover, Horizon Detection | none                                               | Removed                  |
| Photo Library                     | AVX-VNNI, AVX512-VNNI, AMX, DOTPROD, I8MM, SME     | **Retained**             |
| Structure from Motion             | AVX2, NEON, NEON FP16                              | **Retained**             |

Background Blur was the only Geekbench 6 CPU workload naming generic AVX-512,
and it is gone. This is the defensible version of the "Geekbench 7 dropped
AVX-512" rumour, and it is a documented deduction rather than a forum claim.
Photo Library is now the sole surviving carrier of the VNNI/AMX/SME cluster,
which is exactly the current inferred mapping.

**Predictions to test:** generic AVX-512 has little or no presence in the
Geekbench 7 CPU suite; AMX and AVX512-VNNI appear only in Photo Library, if at
all.

Note also that Geekbench 7 excludes some workloads from the multi-core suite
when the modelled task is not genuinely multi-threaded (HTML5 Browser is named
explicitly in the launch post), so single-core and multi-core runs cover
different workload sets. Trace both.

## Acceptance criteria

The task is done when either:

1. Per-workload instruction mixes have been captured, reproduced across at least
   two runs, written up in `docs/geekbench7-sources.md`, and the affected
   entries in `src/isa/benchmarkMapV7.ts` have been updated — promoted to
   `confirmed`, corrected, or removed — with the framing decision from trap 2
   reflected in the badge copy; or
2. The analysis was attempted and could not attribute instructions to individual
   workloads, in which case record why in `docs/geekbench7-sources.md` so it is
   not retried blindly.

Note that this analysis is x86-only. ARM (NEON, DOTPROD, I8MM, SVE, SME) and
RISC-V (RVV) mappings stay `inferred` regardless of the outcome and need a
separate approach.

## Sources

- [Geekbench 7 CPU Workloads](https://www.geekbench.com/doc/geekbench7-cpu-workloads.pdf)
- [Geekbench 6 Benchmark Internals](https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf)
- [Geekbench 7 launch post](https://www.geekbench.com/blog/2026/07/geekbench-7/)
- [Chips and Cheese: Evaluating Geekbench 6](https://chipsandcheese.com/p/evaluating-geekbench-6)
- [AnandTech: Geekbench 7 released, page 46](https://forums.anandtech.com/threads/geekbench-7-released.2610597/page-46)
- [AnandTech: Geekbench 7 released, page 47](https://forums.anandtech.com/threads/geekbench-7-released.2610597/page-47)
