# Working on GeekLens

GeekLens is a Svelte 5/TypeScript browser extension that annotates Geekbench CPU
result and comparison pages with the instruction sets used by each workload.

## Start here

- Read [docs/architecture.md](docs/architecture.md) before changing page parsing,
  benchmark metadata, caching, or browser manifests.
- Check [docs/tasks/](docs/tasks/) for known open questions and deferred work.
  [code-audit-follow-ups.md](docs/tasks/code-audit-follow-ups.md) collects items
  needing a live Geekbench session; [geekbench7-sde-instruction-trace.md](docs/tasks/geekbench7-sde-instruction-trace.md)
  covers confirming Geekbench 7 ISA mappings. Add to these rather than guessing.
- Treat Geekbench HTML, URLs, benchmark names, and version-specific metadata as
  external interfaces. Keep version-specific assumptions explicit.
- Make source changes under `src/`. `dist/` and `GeekLens-*.zip` are generated.
- Preserve compatibility with both Chrome (Manifest V3) and Firefox (Manifest V2).
- Follow the existing TypeScript and Svelte style; avoid unrelated cleanup.

## Validate

### Codex

In the Codex environment, formatting, linting, tests, type/Svelte checks, and
browser builds must be run with user-approved elevated execution. Request
approval rather than retrying these commands inside the sandbox after a
permissions-related failure (for example, Oxfmt reporting `spawn EPERM`).

Run the checks relevant to the change:

```sh
bun run format:check
bun run lint
bun test
bun run check
bun run build:chrome
bun run build:firefox
```

Use `bun run format` to format supported project files with Oxfmt.

For DOM integration changes, also load the unpacked build and manually exercise a
single CPU result and a comparison page. Build output is in `dist/<browser>/`.
