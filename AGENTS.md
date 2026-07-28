# Working on GeekLens

GeekLens is a Svelte 5/TypeScript browser extension that annotates Geekbench CPU
result and comparison pages with the instruction sets used by each workload.

## Start here

- Read [docs/architecture.md](docs/architecture.md) before changing page parsing,
  benchmark metadata, caching, or browser manifests.
- Check [docs/follow-ups.md](docs/follow-ups.md) for known open questions that
  need a live Geekbench session to settle. Add to it rather than guessing.
- Treat Geekbench HTML, URLs, benchmark names, and version-specific metadata as
  external interfaces. Keep version-specific assumptions explicit.
- Make source changes under `src/`. `dist/` and `GeekLens-*.zip` are generated.
- Preserve compatibility with both Chrome (Manifest V3) and Firefox (Manifest V2).
- Follow the existing TypeScript and Svelte style; avoid unrelated cleanup.

## Validate

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
