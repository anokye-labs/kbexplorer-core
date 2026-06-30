/**
 * The access-label contract (issue #28, E5).
 *
 * A **label-only** description of a resource's sensitivity, carried on nodes and
 * edges. kbx **labels**; the host **enforces**. There is deliberately **no**
 * principal evaluation in core: no `canRead`, no principals, no OAuth, no
 * redactor. An access label is a property of the resource that *travels with it*
 * (the self-describing / trust-travels axis, anokye-labs/kbexplorer#12) — the
 * host decides what to do with it.
 *
 * The companion {@link AccessConfig} declares the *redaction boundary* the host
 * applies. Its default is **safe**: when a resource is `restricted` or its
 * classification is unknown, the default behavior is to **withhold** it, and
 * redaction stubs are NOT committed (`commitRedactionStubs` defaults to `false`)
 * because even a node title can leak. Core only carries these declarations; it
 * enforces nothing.
 *
 * Pure types only — no engine, no enforcement, no I/O.
 */
import type { ExternalRef } from './source-ref.js';

/**
 * Sensitivity classification of a resource. OPEN union so bespoke schemes
 * coexist with the built-ins. `'unknown'` is treated as restricted by the
 * default-safe redaction boundary.
 */
export type AccessClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'unknown'
  | (string & {});

/** Intended visibility scope of a resource. OPEN union. */
export type AccessVisibility =
  | 'public'
  | 'internal'
  | 'private'
  | (string & {});

/**
 * A label-only access descriptor on a node or edge.
 *
 * Every field is optional and additive; an absent label means "unlabeled" (the
 * host applies its default-safe boundary). The label carries **no** access-
 * control logic — it never names who may read, only how the resource is
 * classified and where its governing policy lives.
 */
export interface KBAccessLabel {
  /** Sensitivity classification. */
  classification?: AccessClassification;
  /** Intended visibility scope. */
  visibility?: AccessVisibility;
  /** Open, host-defined access labels/tags (e.g. `'pii'`, `'legal-hold'`). */
  labels?: string[];
  /**
   * Pointer to the source policy that governs this label (a host-neutral
   * {@link ExternalRef}), so the host can resolve enforcement rules. Core never
   * dereferences it.
   */
  sourcePolicyRef?: ExternalRef;
}

/**
 * What the host does with restricted/unknown-classified resources. The seam
 * core exposes; core performs none of these actions.
 *  • `'label-only'` — keep the resource, attach the label, enforce nothing.
 *  • `'redact'` — emit a redacted placeholder for the resource.
 *  • `'withhold'` — omit the resource entirely. **The default-safe choice.**
 */
export type RedactionBoundary = 'label-only' | 'redact' | 'withhold';

/**
 * Access configuration seam for {@link KBConfig}. Optional and additive; when
 * unset the host applies its default-safe behavior (withhold restricted/unknown,
 * no redaction stubs).
 */
export interface AccessConfig {
  /**
   * How restricted/unknown resources are handled. **Default-safe**: when unset,
   * treat as `'withhold'` so restricted and unknown-classified resources are
   * omitted rather than leaked.
   */
  redactionBoundary?: RedactionBoundary;
  /**
   * Whether redaction *stubs* (placeholder nodes/edges marking that something
   * was withheld) may be committed to output. Defaults to **`false`** because
   * even a stub's title can leak the existence/name of a restricted resource.
   */
  commitRedactionStubs?: boolean;
}
