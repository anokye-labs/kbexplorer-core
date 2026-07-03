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

/** Alias for the canonical access-label type used by core consumers. */
export type AccessLabel = KBAccessLabel;

/** How access-restricted units are treated by the host. */
export type AccessExclusionMode = 'exclude' | 'include';

/** Configuration for access-label-driven exclusion. */
export interface AccessExclusionConfig {
  /** Index-build treatment of restricted units. */
  mode: AccessExclusionMode;
  /** Classifications excluded by the default-safe policy. */
  excludedClassifications: AccessClassification[];
  /** Visibilities excluded by the default-safe policy. */
  excludedVisibilities: AccessVisibility[];
}

/** The default-safe exclusion policy shared by core consumers. */
export const DEFAULT_ACCESS_EXCLUSION: AccessExclusionConfig = {
  mode: 'exclude',
  excludedClassifications: ['confidential', 'restricted', 'unknown'],
  excludedVisibilities: ['private'],
};

/** Resolve a partial exclusion config into a complete one with safe defaults. */
export function resolveAccessExclusion(
  config?: Partial<AccessExclusionConfig>,
): AccessExclusionConfig {
  return {
   mode: config?.mode ?? DEFAULT_ACCESS_EXCLUSION.mode,
   excludedClassifications: config?.excludedClassifications
     ? [...config.excludedClassifications]
     : [...DEFAULT_ACCESS_EXCLUSION.excludedClassifications],
   excludedVisibilities: config?.excludedVisibilities
     ? [...config.excludedVisibilities]
     : [...DEFAULT_ACCESS_EXCLUSION.excludedVisibilities],
  };
}

const CLASSIFICATION_LATTICE: Record<string, number> = {
  public: 1,
  internal: 2,
  confidential: 3,
  restricted: 4,
  unknown: 5,
};

const VISIBILITY_LATTICE: Record<string, number> = {
  public: 1,
  internal: 2,
  private: 3,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function trimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeToken(token: string | undefined): string | undefined {
  return token?.trim().toLowerCase();
}

function isTokenExcluded(
  token: string | undefined,
  lattice: Record<string, number>,
  excluded: readonly string[],
): boolean {
  const normalizedToken = normalizeToken(token);
  if (normalizedToken == null) return false;
  if (!(normalizedToken in lattice)) return true;
  return excluded.some((candidate) => normalizeToken(candidate) === normalizedToken);
}

/**
 * Normalize a raw access block into a canonical {@link KBAccessLabel}.
 *
 * A plain object with no usable fields normalizes to `undefined` (the unlabeled
 * signal). Empty strings, whitespace, and garbage are dropped. Labels are
 * trimmed, deduped, and sorted; `sourcePolicyRef` is preserved when it is a
 * non-empty plain object.
 */
export function normalizeAccessLabel(raw: unknown): AccessLabel | undefined {
  if (!isPlainObject(raw)) return undefined;
  const out: Record<string, unknown> = {};

  const classification = trimmedString(raw.classification);
  if (classification) out.classification = classification;

  const visibility = trimmedString(raw.visibility);
  if (visibility) out.visibility = visibility;

  if (Array.isArray(raw.labels)) {
   const labels = [
     ...new Set(
       raw.labels
         .map((value) => trimmedString(value))
         .filter((value): value is string => value !== undefined),
     ),
   ].sort();
   if (labels.length > 0) out.labels = labels;
  }

  if (isPlainObject(raw.sourcePolicyRef) && Object.keys(raw.sourcePolicyRef).length > 0) {
   out.sourcePolicyRef = raw.sourcePolicyRef;
  }

  return Object.keys(out).length > 0 ? (out as AccessLabel) : undefined;
}

/**
 * Coerce a scalar or object access value into a canonical label.
 *
 * Bare strings are interpreted as a classification shorthand,
 * matching the CLI's frontmatter behavior.
 */
export function coerceAccessLabel(raw: unknown): AccessLabel | undefined {
  const scalar = trimmedString(raw);
  if (scalar) return normalizeAccessLabel({ classification: scalar });
  return normalizeAccessLabel(raw);
}

/**
 * Decide whether a label is excluded by the default-safe policy.
 *
 * The default policy withholds any recognized-built-in tier listed in the config
 * and any bespoke token that cannot be ranked against the built-in lattice.
 */
export function isExcludedByDefault(
  label: AccessLabel | undefined,
  config?: Partial<AccessExclusionConfig>,
): boolean {
  return isExcludedByAccess(label, resolveAccessExclusion(config));
}

/** Decide whether a label is excluded under a concrete exclusion config. */
export function isExcludedByAccess(
  label: AccessLabel | undefined,
  config: AccessExclusionConfig,
): boolean {
  if (!label) return false;
  if (
   label.classification &&
   isTokenExcluded(label.classification, CLASSIFICATION_LATTICE, config.excludedClassifications)
  ) {
   return true;
  }
  if (
   label.visibility &&
   isTokenExcluded(label.visibility, VISIBILITY_LATTICE, config.excludedVisibilities)
  ) {
   return true;
  }
  return false;
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
