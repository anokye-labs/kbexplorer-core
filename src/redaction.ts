/**
 * The redaction + access-review contract (issue #29, E5-A4).
 *
 * Two additive, label-only seams that sit on top of the {@link KBAccessLabel}
 * contract (#28). kbx **labels** and **describes**; the host **enforces**. Core
 * performs no redaction and no principal evaluation — it only types how a
 * redacted projection is *represented* and how an access-review record is
 * *shaped* so that host CI/env can review and enforce.
 *
 *  1. **Redaction** — a *redact-in-place projection*. A node or edge whose
 *     sensitive content has been withheld keeps its normal shape (so consumers
 *     need no separate type) and carries an optional {@link Redaction}
 *     annotation describing, per field, what was retained / redacted / withheld.
 *     Default-safe intent (see {@link AccessConfig}): content is withheld;
 *     titles are only retained when the host opts in (`commitRedactionStubs`),
 *     because even a title can leak.
 *
 *  2. **Access-review** — the shape of the `.kbx/access-review.json` manifest
 *     the host emits: a deterministic list of {@link AccessReviewRecord}s, each
 *     pairing the governing {@link KBAccessLabel} with the review
 *     {@link RedactionAction decision} (and optionally the host-action
 *     {@link RedactionBoundary} and the {@link RedactionStage} where it applied)
 *     plus its provenance. Approval is
 *     a **seam only** ({@link AccessReviewApproval}); kbx never enforces it.
 *
 * Deterministic, **NO timestamps** — like {@link Provenance} / {@link SourceRef},
 * these artifacts are content-addressed, never time-addressed, so identical
 * inputs always produce identical committed artifacts.
 *
 * Pure types only — no engine, no enforcement, no I/O.
 */
import type { KBAccessLabel, RedactionBoundary } from './access.js';
import type { ExternalRef, Provenance } from './source-ref.js';

/**
 * What a redaction boundary did to a single field of a resource.
 *  • `'retained'` — the field's value was kept as-is (e.g. a title the host
 *    opted to keep).
 *  • `'redacted'` — the value was replaced by a non-sensitive placeholder.
 *  • `'withheld'` — the value was removed entirely (no placeholder).
 */
export type RedactionAction = 'retained' | 'redacted' | 'withheld';

/**
 * WHERE in the pipeline a redaction was applied. Answers "at what stage was this
 * content withheld?" — a different axis from {@link RedactionBoundary} (which is
 * the host-action *policy*: `label-only` / `redact` / `withhold`) and from
 * {@link RedactionAction} (what happened to a field). OPEN union so bespoke
 * pipelines can name their own stages.
 *  • `'source'` — at the system of record / adapter capture.
 *  • `'ingest'` — during ingestion into the graph.
 *  • `'conflation'` — while merging referents (E3).
 *  • `'representation'` — when projecting a node/edge for output.
 *  • `'search'` — at query/serve time.
 */
export type RedactionStage =
  | 'source'
  | 'ingest'
  | 'conflation'
  | 'representation'
  | 'search'
  | (string & {});

/**
 * Per-field disposition within a {@link Redaction}. Names the field and what
 * happened to it; when `action` is `'redacted'`, `placeholder` is the
 * non-sensitive substitute that replaced the original value.
 */
export interface RedactedField {
  /**
   * Name/path of the affected field on the projected node or edge, e.g.
   * `'title'`, `'content'`, `'rawContent'`, `'description'`. Open string so
   * bespoke fields can be described too.
   */
  field: string;
  /** What happened to this field. */
  action: RedactionAction;
  /**
   * Non-sensitive substitute placed in the field when `action` is `'redacted'`
   * (e.g. `'[redacted]'`). Omitted for `'retained'` / `'withheld'`.
   */
  placeholder?: string;
}

/**
 * The additive annotation a redacted projection of a node/edge carries. Its
 * presence marks the resource as a *redacted-in-place projection*; its fields
 * describe what the host's boundary did and why. Absent → the resource is not a
 * redacted projection (unchanged behavior).
 */
export interface Redaction {
  /** The {@link RedactionBoundary} the host applied to produce this projection. */
  boundary: RedactionBoundary;
  /**
   * WHERE in the pipeline the redaction was applied. Optional; a separate axis
   * from `boundary` (the host-action policy). See {@link RedactionStage}.
   */
  stage?: RedactionStage;
  /**
   * The access label that triggered redaction (the classification/labels that
   * crossed the boundary). Optional; carried for review and audit.
   */
  reason?: KBAccessLabel;
  /**
   * Per-field disposition. When omitted, the projection is described only at the
   * whole-resource level (see `stub`).
   */
  fields?: RedactedField[];
  /**
   * `true` when the whole resource was withheld and only a placeholder *stub*
   * remains (existence acknowledged, contents gone). Gated by the host's
   * `commitRedactionStubs` policy — a stub can still leak a title/id.
   */
  stub?: boolean;
  /**
   * Pointer to the source policy that governs this redaction (host-neutral
   * {@link ExternalRef}). Core never dereferences it.
   */
  policyRef?: ExternalRef;
}

/**
 * Review disposition of an access-review record. Approval is a **seam only** —
 * core stores the status the host recorded and evaluates nothing. OPEN union so
 * bespoke workflows can add their own states.
 */
export type AccessReviewStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | (string & {});

/**
 * A host-recorded approval attached to an {@link AccessReviewRecord}. Optional
 * and additive; its absence means "not yet reviewed". kbx never enforces this —
 * host CI/env consumes it.
 */
export interface AccessReviewApproval {
  /** The recorded review status. */
  status: AccessReviewStatus;
  /**
   * Open, host-defined identifier of who/what approved (e.g. a team, a CI job,
   * a principal). Core performs **no** principal evaluation — this is an opaque
   * label for audit only.
   */
  by?: string;
  /** Pointer to the approving authority/policy (host-neutral {@link ExternalRef}). */
  ref?: ExternalRef;
  /** Optional deterministic note (no timestamps). */
  note?: string;
}

/**
 * A single entry in the {@link AccessReviewManifest}: the substrate for
 * reviewing/auditing *what* is restricted and *why*. Pairs the governing label
 * with the boundary decision applied, plus provenance so a reviewer can trace
 * where the label/decision came from.
 */
export interface AccessReviewRecord {
  /**
   * The resource under review — the node/edge id or its `kg://` URN. A plain
   * string so both graph-local ids and cross-source URNs are expressible.
   */
  ref: string;
  /** The label that governs this resource. See {@link KBAccessLabel}. */
  label: KBAccessLabel;
  /**
   * What the reviewer DETERMINED about this resource's content — the review
   * verdict, expressed on the same axis as a field disposition
   * ({@link RedactionAction}: `retained` / `redacted` / `withheld`). This is the
   * *decision*, deliberately kept separate from `boundary` (the host-action
   * policy) and `stage` (where redaction happened) so the two axes never
   * conflate.
   */
  decision: RedactionAction;
  /**
   * The host-action policy that was (or should be) applied. Optional; a
   * different concept from `decision`. See {@link RedactionBoundary}.
   */
  boundary?: RedactionBoundary;
  /**
   * WHERE in the pipeline the redaction was (or should be) applied. Optional.
   * See {@link RedactionStage}.
   */
  stage?: RedactionStage;
  /**
   * Where the label/decision came from (source pointers / evidence). Reuses the
   * shared {@link Provenance} contract; deterministic, no timestamps.
   */
  provenance?: Provenance;
  /**
   * Host-recorded approval. Optional; a seam only — core enforces nothing. See
   * {@link AccessReviewApproval}.
   */
  approval?: AccessReviewApproval;
  /** Optional deterministic note explaining the decision (no timestamps). */
  note?: string;
}

/**
 * The shape of the `.kbx/access-review.json` manifest a host emits: a
 * deterministic, reviewable list of every restricted resource, its governing
 * label, and the boundary decision applied. Core types this seam; host CI/env
 * emits and enforces it — kbx enforces nothing.
 *
 * Deterministic: records should be emitted in a stable order and carry **no
 * timestamps**, so the committed manifest changes only when the underlying
 * labels/decisions change.
 */
export interface AccessReviewManifest {
  /** Discriminator identifying this artifact. */
  kind: 'kbx-access-review';
  /** Manifest schema version. Additive bumps only. */
  version: 1;
  /** The reviewed resources. Emit in a stable, deterministic order. */
  records: AccessReviewRecord[];
}
