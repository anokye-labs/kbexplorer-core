/**
 * The source-precedence contract (issue #26, E3 seam).
 *
 * Declared **system-of-record precedence** used to deterministically resolve the
 * *rare* conflicting-fact case on a conflated referent: when two sources assert
 * different values for the same attribute of the same (post-conflation) entity,
 * the higher-precedence source wins.
 *
 * Per the §13 conflation correction this is **ordering only** — there are **no
 * thresholds and no confidence scores**. Precedence is a total order over
 * source keys; the winner is a pure function of that order. Identical inputs ⇒
 * identical resolution.
 *
 * This is the thin core seam E3 consumes; it pairs with the identity-claims
 * contract (#25) via the shared *source-key string space*: a claim names the
 * `source` that asserted it, and this config orders those same keys. Core
 * stores the declaration and resolves nothing on its own.
 *
 * Pure types only — no engine, no resolution logic, no I/O.
 */

/**
 * Declared system-of-record precedence.
 *
 * `sources` is the default total order, **highest precedence first** (the source
 * at index 0 wins ties). `fields` optionally overrides that order per attribute
 * name, for the cases where a lower-ranked system is authoritative for one
 * specific field. A source key absent from the relevant list is lower than every
 * listed key (and unordered among other absentees).
 */
export interface SourcePrecedenceConfig {
  /**
   * Ordered system-of-record keys, highest precedence first. The same open
   * string space as {@link IdentityClaim.source} and the identity addressing
   * `authority` / `sourceAuthorities` keys.
   */
  sources: string[];
  /**
   * Per-field precedence overrides: attribute name → ordered source keys
   * (highest first). When a field is listed here, its order replaces the
   * default `sources` order for that field only. Absent ⇒ use `sources`.
   */
  fields?: Record<string, string[]>;
}
