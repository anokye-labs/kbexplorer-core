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
- **Identity** — configurable, source-agnostic addresses of the form
  `<scheme>://<authority>/<body>`. The scheme is configurable (default `kg`), the
  authority is optional (it names the system of record), and the **body is
  opaque** — it names a resource and does not encode the entity's type, so an
  entity can be re-typed or re-homed without its id changing. Mint addresses with
  `buildAddress(body, { scheme, authority })`; configure defaults via
  `KBConfig.identity`. The legacy `kg://<type>/<slug>` helpers (`buildId` /
  `ID_RE`) are retained for back-compat.
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
    "@anokye-labs/kbexplorer-core": "github:anokye-labs/kbexplorer-core#v0.1.0"
  }
}
```

Pin to a release tag (e.g. `#v0.1.0`) or a commit SHA — not a moving branch — so
builds are reproducible.

## Releases

### 0.1.0

First tagged release — the **Wave 0a** identity foundation. Strictly additive and
back-compatible (defaults unchanged; `kg://` stays the default scheme, and
`buildId` / `ID_RE` are retained as legacy helpers):

- **Configurable, source-agnostic identity** — addresses of the form
  `<scheme>://<authority>/<body>` with an **opaque** body (no embedded type). New:
  `buildAddress` / `parseAddress` / `isAddress`, `AddressingOptions` /
  `ParsedAddress`, and `KBConfig.identity` (`IdentityAddressingConfig`).
- **Alias-based people** — `aliasBody` / `buildPersonAddress`, plus an optional
  `alias?` on the `person` node source (display names are never identity).
- **Markdown sources** — `NodeSourceFile.format` now includes `'markdown'`.

## Develop

```bash
npm ci
npm run typecheck
npm run build      # tsup -> dist/ (esm + cjs + d.ts)
npm test           # vitest
```
