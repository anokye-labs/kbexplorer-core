# Changelog

All notable changes to `@anokye-labs/kbexplorer-core` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Because this package is a shared **contract**, additive changes (new exported
types/interfaces/fields) are minor releases; renames or removals are breaking.

## [Unreleased] — v0.4.0 draft

### Added

- **Redaction + access-review contract** (#29, PR #48) — new `src/redaction.ts`
  exposing `Redaction` / `RedactedField` / `RedactionAction` (a redact-in-place
  projection annotation, optionally carried on `KBNode.redaction` /
  `KBEdge.redaction`) and the `.kbx/access-review.json` manifest shape
  (`AccessReviewManifest` / `AccessReviewRecord` / `AccessReviewApproval`).
  Label-only and enforcement-free, like the access-label contract (#28) it sits
  on top of: core describes what a redaction boundary did, the host enforces
  it. Deterministic, no timestamps. Additive; back-compatible.

  This PR merged to `main` after the `v0.3.0` tag and has not shipped under any
  released version yet — it is the reason this Unreleased section exists.

### Tests

- Regression tests pinning PR #31's disclosed-but-previously-untested behavior
  change (#52): `stripScheme`'s default-mode widening to strip any
  well-formed scheme (not just `kg://`), and `buildJsonLd`'s fallback `@id`
  construction honoring a configured scheme/authority via `buildAddress`.
  Test-only; no behavior change.

## [0.3.0] - 2026-06-30

Wave 2 — four additive, back-compatible contract additions plus a documentation
coherence pass. No breaking changes.

### Added

- **Identity-claims contract** (#25) — new `src/identity-claims.ts` exposing the
  open `IdentityClaimKind` union and `IdentityClaim` interface (claims only — no
  auto-merge). `KBNode` gains optional `identityClaims?: IdentityClaim[]` and a
  host-neutral `linkedRefs?: SourceRef[]` that generalizes the legacy
  `person { login, linked }` witness. Core performs zero merging; E3 referent
  conflation consumes this substrate and can order conflicting claims by each
  claim's `source` key via the source-precedence contract.
- **Source-precedence contract** (#26) — new `src/precedence.ts` exposing
  `SourcePrecedenceConfig { sources[]; fields? }`, wired as optional
  `KBConfig.precedence`. Declared system-of-record precedence (ordering only —
  no thresholds, no confidence scores) for deterministically resolving the rare
  conflicting-fact case on a conflated referent (E3 seam). Shares the source-key
  string space with the identity-claims `source` field.
- **Raw-relation passthrough** (#27) — `KBEdge` and `Connection` gain an optional
  `relationRaw?: string` that preserves a source's original relation label
  verbatim when it falls outside the 6-relation taxonomy (which `mapRelation`
  would otherwise drop). Supports the open-relations axis; a plain string that
  round-trips through JSON-LD. Additive; absent → unchanged.
- **Access-label core field** (#28) — new `src/access.ts` exposing the
  label-only `KBAccessLabel { classification?, visibility?, labels?,
  sourcePolicyRef? }` plus the open `AccessClassification` / `AccessVisibility`
  unions, and an `AccessConfig { redactionBoundary?, commitRedactionStubs? }`
  seam wired as optional `KBConfig.access`. `KBNode` and `KBEdge` gain optional
  `access?: KBAccessLabel`. Label-only by design — zero principal evaluation in
  core; the host enforces. Default-safe: withhold restricted/unknown and
  `commitRedactionStubs` defaults `false` (titles leak). Additive.

### Changed

- **E1 coherence pass** (#45) — documentation-only clarifications across the
  now-complete E1 surface (no type changes):
  - `Provenance.sourceId` is documented as part of the shared **source-key
    string space** (alongside `IdentityClaim.source` /
    `SourcePrecedenceConfig.sources` / identity `authority`), closing the
    precedence↔provenance bridge so E3 can rank a conflated referent's attribute
    values by each contributing node/edge `sourceId`.
  - Canonical **"derived" rule**: when structured `Derivation` is present it is
    authoritative; the boolean `KBNode.derived` and the `NodeSource` `'derived'`
    variant are advisory/legacy and must agree with it.
  - `relationRaw` docs corrected: unknown relations resolve to `'structural'`
    (not `related`, which is a synonym), and the passthrough field is
    distinguished from the always-populated `mapRelation(raw).raw` so consumers
    don't over-populate `relationRaw`.

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

[Unreleased]: https://github.com/anokye-labs/kbexplorer-core/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/anokye-labs/kbexplorer-core/releases/tag/v0.3.0
[0.2.0]: https://github.com/anokye-labs/kbexplorer-core/releases/tag/v0.2.0
[0.1.0]: https://github.com/anokye-labs/kbexplorer-core/releases/tag/v0.1.0
