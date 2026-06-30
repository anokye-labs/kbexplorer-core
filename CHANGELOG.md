# Changelog

All notable changes to `@anokye-labs/kbexplorer-core` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Because this package is a shared **contract**, additive changes (new exported
types/interfaces/fields) are minor releases; renames or removals are breaking.

## [Unreleased]

### Added

- **Identity-claims contract** (#25) — new `src/identity-claims.ts` exposing the
  open `IdentityClaimKind` union and `IdentityClaim` interface (claims only — no
  auto-merge). `KBNode` gains optional `identityClaims?: IdentityClaim[]` and a
  host-neutral `linkedRefs?: SourceRef[]` that generalizes the legacy
  `person { login, linked }` witness. Core performs zero merging; E3 referent
  conflation consumes this substrate and can order conflicting claims by each
  claim's `source` key via the source-precedence contract.

## [0.2.0] - 2026-06-30

Wave 1 — four additive, back-compatible contract additions. No breaking changes.

### Added

- **Presentation-token contract** (#15) — new `src/presentation.ts` exposing an
  open, optional `PresentationTokens` bag (typography, corner radius, density,
  spacing) plus `TypographyTokens` / `CornerRadiusTokens` / `SpacingTokens` and
  the `TypographyScale` / `CornerRadiusStep` / `Density` open unions. Wired as
  `RepresentationOptions.presentation` so any render target can surface deep
  design choice without hardcoding it in a consumer.
- **`canvas` Representation target convention** (#16) — named `'canvas'` in the
  open `RepresentationTarget` union and added the `CANVAS_TARGET` constant plus a
  contract note, so consumers register host-embeddable renderers under one agreed
  key.
- **SourceRef / provenance contract** (#23) — new `src/source-ref.ts` with
  `ExternalRef` (host-neutral `kind`/`href`), `SourceRef` (adds `resourceKind` /
  `contentHash` / `role`), `Evidence` (observed support) and `Provenance`.
  `KBNode` and `KBEdge` now `extends Provenance`, so nodes/edges can carry
  `sourceId` / `sourceRefs[]` / `evidence[]` alongside the still-required
  `NodeSource`. Deterministic, no timestamps; reuses the structured `ContentHash`.
- **Derivation contract** (#24) — new `src/derivation.ts` with `Derivation`
  (`mode` discriminating observed-from-source vs derived-from-inputs, plus
  `generator` and `inputs: SourceRef[]`) and the open `DerivationMode` union.
  `KBNode` and `KBEdge` gain an optional `derivation` field, enabling
  change-detection/recompute via input `contentHash` — no timestamps.

## [0.1.0] - Initial release

- Pure graph types (`KBNode` / `KBEdge` / `KBGraph` / `Cluster` / `Connection` /
  `NodeSource`), the JSON-LD envelope + `buildJsonLd`, the `KBConfig` contract,
  `kg://` identity helpers + the relation taxonomy, and the Source / GraphProvider
  / GraphStore / Representation interface seams.

[0.2.0]: https://github.com/anokye-labs/kbexplorer-core/releases/tag/v0.2.0
[0.1.0]: https://github.com/anokye-labs/kbexplorer-core/releases/tag/v0.1.0
