# @anokye-labs/kbexplorer-core

Shared contracts for the **kbexplorer** system. This package is the single source
of truth for the types and interface seams that both
[`kbexplorer-cli`](https://github.com/anokye-labs/kbexplorer-cli) and
[`kbexplorer-template`](https://github.com/anokye-labs/kbexplorer-template) — and
any third-party provider — depend on.

It is intentionally **dependency-free** and **side-effect-free**: pure data types
and interfaces, no runtime engine, no I/O.

## What lives here

- **Graph types** — `KBNode` / `KBEdge` / `KBGraph` / `KBConfig` (pure data; no
  styling, no engine imports).
- **Identity** — the `kg://` URN scheme and helpers for minting/parsing stable
  node ids.
- **Relation taxonomy** — the canonical edge-relation vocabulary.
- **JSON-LD helpers** — deterministic serialization of the pure graph.
- **Seams** — the `Source`, `GraphProvider`, `GraphStore`, and `Representation`
  interfaces that make providers, optional content-addressed caches, and render
  targets pluggable.

> Phase 1 stands up the package; the contracts above are filled in by the
> follow-up tasks tracked in this repo.

## Consuming (git dependency)

Until this is published to npm, consumers depend on it directly from git. npm
runs the package's `prepare` script on install, which builds `dist/`:

```jsonc
// package.json
{
  "dependencies": {
    "@anokye-labs/kbexplorer-core": "github:anokye-labs/kbexplorer-core#<commit-sha>"
  }
}
```

Pin to a commit SHA (not a moving branch) so builds are reproducible.

## Develop

```bash
npm ci
npm run typecheck
npm run build      # tsup -> dist/ (esm + cjs + d.ts)
npm test           # vitest
```
