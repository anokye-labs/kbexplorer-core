/**
 * The source-reference & provenance contract.
 *
 * This is the substrate for "every fact carries a provenance pointer back to its
 * source" (anokye-labs/kbexplorer#12). It is purely additive to the existing,
 * still-required {@link NodeSource} discriminated union: a node or edge keeps its
 * `source` exactly as before and may *additionally* carry one or more
 * {@link SourceRef}s plus {@link Evidence} via {@link Provenance}. Existing graphs
 * that carry none behave identically.
 *
 * Design contract (deliberate):
 *
 *  • Host-neutral. A {@link SourceRef} is a portable pointer (`kind` / `href`)
 *    like a {@link ResourceLink}, with optional `resourceKind`, `contentHash`
 *    and `role`. `kind` and `resourceKind` are OPEN strings so Git, GitHub and
 *    bespoke systems of record coexist without conflation.
 *
 *  • Deterministic, NO timestamps. Provenance is content-addressed
 *    (`sourceId` + optional `contentHash`), never time-addressed, so the same
 *    inputs always produce the same provenance and downstream caches/recompute
 *    stay stable.
 *
 *  • Provenance splits cleanly: {@link Evidence} is *observed support* (this fact
 *    was seen in these sources). Derivation — how a fact was *computed* from
 *    inputs — is a separate contract (see L2 / issue #24) and is intentionally
 *    NOT part of this module.
 *
 *  • Pure types only — no engine, no I/O. `contentHash` reuses the existing
 *    structured {@link ContentHash} so digests are described one way everywhere.
 */
import type { ContentHash } from './graph-store.js';

/**
 * A host-neutral pointer to an external resource.
 *
 * The minimal, portable base every concrete reference extends: an open `kind`
 * discriminator plus an `href` the originating system can re-resolve (a
 * source-native URI or a `kg://` URN).
 */
export interface ExternalRef {
  /** Open reference kind, e.g. `'github'`, `'git'`, `'http'`, `'doi'`. */
  kind: string;
  /** Stable locator the source can re-resolve (source-native URI or `kg://`). */
  href: string;
}

/**
 * A reference from a fact (node/edge) back to a specific source resource.
 *
 * Extends {@link ExternalRef} with the optional detail provenance needs:
 * `resourceKind` (what the pointed-at resource *is*), `contentHash` (the exact
 * bytes observed, for deterministic change-detection and recompute) and `role`
 * (how the reference relates to the fact).
 */
export interface SourceRef extends ExternalRef {
  /**
   * Open kind of the referenced resource, e.g. `'file'`, `'commit'`, `'issue'`,
   * `'pull-request'`, `'release'`. Mirrors a {@link Resource} `kind`.
   */
  resourceKind?: string;
  /**
   * Content digest of the exact bytes referenced. Enables deterministic
   * change-detection (and recompute, see #24) without timestamps.
   */
  contentHash?: ContentHash;
  /**
   * Open role of this reference relative to the fact, e.g. `'primary'`,
   * `'supporting'`, `'mention'`, `'canonical'`.
   */
  role?: string;
}

/**
 * Observed support for a fact: a pointer to where the fact was seen, with an
 * optional human/host-readable note.
 *
 * Evidence records *observation* only — it never describes how a derived fact
 * was computed (that is {@link https://github.com/anokye-labs/kbexplorer-core/issues/24 Derivation}).
 */
export interface Evidence {
  /** The source resource this evidence points at. */
  ref: SourceRef;
  /** Optional, deterministic note describing what was observed (no timestamps). */
  note?: string;
}

/**
 * Additive provenance carried by a node or edge.
 *
 * Every field is optional; an absent/empty `Provenance` is a no-op and existing
 * graphs are unaffected. `sourceId` is a durable identity for the originating
 * source that is stable across runs (unlike a mutable `href`), so a fact can be
 * traced back even as locators move.
 */
export interface Provenance {
  /** Durable identity of the originating source, stable across runs. */
  sourceId?: string;
  /** One or more pointers back to the source resources for this fact. */
  sourceRefs?: SourceRef[];
  /** Observed support for this fact. */
  evidence?: Evidence[];
}
