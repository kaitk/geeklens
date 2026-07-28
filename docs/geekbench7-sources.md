# Geekbench 7 data sources and confidence

This document records where GeekLens obtains Geekbench 7 instruction-set data
and how the provisional per-workload mappings were chosen. It is intentionally
explicit about inference: Geekbench 7 does not currently have a public
benchmark-internals document comparable to the Geekbench 6 document.

Last reviewed: 2026-07-28.

## Primary sources

### Geekbench 7 CPU Workloads

- [Geekbench 7 CPU Workloads](https://www.geekbench.com/doc/geekbench7-cpu-workloads.pdf)

This is the main official description of the Geekbench 7 CPU suite. It lists the
workloads, input data, algorithms, codecs, and selected libraries. Unlike the
Geekbench 6 internals document, it does not list instruction-set implementations
or runtime dispatch behavior.

Relevant details include:

- File Compression processes three archives using LZ4, zlib, and Zstandard and
  verifies them with SHA1.
- Photo Library imports JPEG, JPEG XL, and DNG images and uses MobileNetV1 SSD
  for tagging.
- Text Processing uses Python 3.13.
- Photo Editor combines a wider range of image operations than the Geekbench 6
  Photo Filter workload.
- Ray Tracer uses Blender Cycles and Intel Embree.
- Structure from Motion processes nine images to reconstruct 3D geometry.
- Game Physics uses Jolt Physics.
- Video Encoder uses AOM AV1, Audio Encoder uses Opus, and Video Decoder/Player
  combines AV1, Opus, resampling, and Whisper speech recognition.

### Geekbench 7 announcement

- [Geekbench 7](https://www.geekbench.com/blog/2026/07/geekbench-7/)

The official launch announcement confirms that Geekbench 7 contains new and
updated workloads, larger datasets, and a redesigned multi-core benchmark. It is
useful evidence that workload-name continuity does not necessarily mean
implementation continuity.

### Geekbench Browser result pages

Representative pages used during implementation:

- [Single result 1248](https://browser.geekbench.com/v7/cpu/1248)
- [Comparison 1248 vs. 1262](https://browser.geekbench.com/v7/cpu/compare/1248?baseline=1262)
- [Example `.gb6` payload](https://browser.geekbench.com/v7/cpu/1356.gb6)

Observed behavior:

- Public HTML omits the Instruction Sets row that Geekbench 6 result pages
  expose.
- Result payloads contain the detected instruction-set string in metric
  `20000`.
- The payload uses `document_version: 7`.
- The `.gb6` payload endpoint is undocumented and may only work when the
  Geekbench Browser session has no comparison baseline selected.
- Fetching a comparison URL without a baseline clears that state; GeekLens
  restores the original baseline afterward.

The DOM selectors and row ordering were checked against logged-in snapshots of
the representative single-result and comparison pages on 2026-07-28. These
observations are implementation evidence, not a stable public API.

## Geekbench 6 reference material

- [Geekbench 6 Benchmark Internals](https://www.geekbench.com/doc/geekbench6-benchmark-internals.pdf)
- [Geekbench 6 CPU Workloads](https://www.geekbench.com/doc/geekbench6-cpu-workloads.pdf)

The Geekbench 6 internals document explicitly associates instruction sets with
individual workloads. It is used only as historical evidence when a Geekbench 7
workload appears closely related. A Geekbench 6 association is not treated as
confirmation for Geekbench 7.

Important Geekbench 6 associations:

- File Compression: AES-NI, VAES, SHA-NI, ARMv8 AES, and ARMv8 SHA1.
- Photo Library: AVX-VNNI, AVX512-VNNI, AMX, DOTPROD, I8MM, and SME.
- Text Processing: AES-NI, VAES, and ARMv8 AES because its files were stored in
  an encrypted in-memory filesystem.
- Photo Filter: AVX2, NEON, and NEON FP16.
- Structure from Motion: AVX2, NEON, and NEON FP16.

## Secondary sources

- [ServeTheHome: Geekbench 7 is Out with a Major Overhaul](https://www.servethehome.com/geekbench-7-is-out-with-a-major-overhaul/)

ServeTheHome summarizes the workload changes and confirms several implementation
details from the official workload document. It does not provide per-workload
instruction traces and is not used as sole evidence for an ISA mapping.

Community discussions may identify leads, but should not be considered
confirmation without reproducible traces or a primary source.

## Current per-workload mappings

All current Geekbench 7 mappings are marked `inferred` and display an amber
warning in the extension.

### File Compression

Mapped instructions:

- x86 SHA-NI
- ARMv8 SHA1

Reasoning:

- Geekbench 7 explicitly documents SHA1 verification.
- Geekbench 6 used hardware SHA implementations for its SHA1 verification path.

Not mapped:

- AES-NI, VAES, and ARMv8 AES.

Geekbench 6 documented an encrypted in-memory filesystem, while the Geekbench 7
workload document does not mention encryption. Carrying the AES mapping forward
would therefore be a weaker assumption.

### Photo Library

Mapped instructions:

- AVX-VNNI
- AVX512-VNNI
- AMX
- ARM DOTPROD
- ARM I8MM
- ARM SME/SME2

Reasoning:

- Both generations use a MobileNet-family image model.
- Geekbench 6 explicitly used quantized machine-learning dispatch for this
  workload.

Uncertainty:

- The Geekbench 7 document names MobileNetV1 SSD but does not state whether its
  model is quantized or which optimized kernels are enabled.

### Structure from Motion

Mapped instructions:

- AVX2
- NEON
- NEON FP16

Reasoning:

- Both documents describe the same nine-image reconstruction task.
- Geekbench 6 explicitly documented these SIMD paths.

Uncertainty:

- Geekbench 7 does not confirm that the same image-processing implementation or
  dispatch code is retained.

## Deliberately unmapped workloads

GeekLens currently makes no per-test ISA claim for:

- Navigation
- HTML5 Browser
- PDF Viewer
- Clang
- Text Processing
- Asset Compression
- HDR
- Photo Editor
- Ray Tracer
- Game Physics
- Video Encoder
- Audio Encoder
- Video Player/Decoder

Some of these libraries are known to contain SIMD implementations in other
contexts, but that does not prove those paths are compiled, selected, or
performance-relevant in Geekbench 7.

Text Processing is specifically not given the Geekbench 6 AES mapping because
the Geekbench 7 workload document does not mention the encrypted in-memory
filesystem that justified it in Geekbench 6. Photo Editor is not automatically
given the old Photo Filter mapping because it is a broader, changed workload.

## Evidence needed for confirmation

A mapping can be promoted from `inferred` to `confirmed` with one of:

1. An official Geekbench 7 internals document or statement naming the workload
   and instruction set.
2. A reproducible instruction trace from the Geekbench 7 binary, ideally across
   more than one platform and with runtime dispatch controlled.
3. Binary or symbol analysis that identifies a workload-specific implementation
   and demonstrates that the dispatch path is selected.

Useful research should record:

- Geekbench version, build, platform, and architecture.
- CPU model and reported metric `20000`.
- Single-core or multi-core workload.
- Tool and command used for tracing.
- Instruction counts or representative instructions.
- How base-build instructions were distinguished from workload-specific
  dispatch.
- Whether the result reproduces across multiple runs.

Library documentation alone is insufficient because a library may be built with
features disabled, use a different code path, or contribute too little work to
justify labeling the entire workload.

A concrete plan for obtaining criterion 2, along with the source review that
ruled out cheaper options, is in
[tasks/geekbench7-sde-instruction-trace.md](tasks/geekbench7-sde-instruction-trace.md).
It is blocked on a go/no-go decision.

## Known unknowns

- Whether metric `20000` means detected, enabled, or actually used instruction
  sets in Geekbench 7.
- Whether Geekbench 7 retains all Geekbench 6 runtime-dispatch implementations.
- Whether Photo Library remains quantized on every platform.
- Whether new media workloads use codec-library SIMD dispatch and which
  extensions are selected.
- Whether Whisper inference in Video Player/Decoder uses quantized CPU kernels.
- Whether Blender Cycles or Embree dispatches AVX2/AVX-512 paths in the shipped
  Geekbench build.
- Whether ARM SVE/SME and RISC-V RVV paths differ from Geekbench 6.
- Whether `.gb6` endpoint and baseline behavior are intentional or stable.
