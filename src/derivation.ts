/**
 * The derivation contract — observed vs derived facts (issue #24, L2).
 *
 * This sits on top of the provenance substrate ({@link Provenance} /
 * {@link Evidence} in `./source-ref`). Where {@link Evidence} records that a fact
 * was *observed* in some source, {@link Derivation} records that a fact was
 * *computed* — by whom, and from which inputs — so that when an input changes,
 * downstream consumers can detect it and recompute (anokye-labs/kbexplorer#12,
 * derivation axis).
 *
 * Design contract (deliberate):
 *
 *  • `mode` is the discriminator: `'observed'` facts come straight from a source
 *    (their support lives in `evidence[]`); `'derived'` facts are produced by a
 *    generator from inputs. The union stays OPEN for bespoke modes.
 *
 *  • Deterministic, NO timestamps. A derived fact records its `generator` and an
 *    `inputs[]` of {@link SourceRef}s (each able to carry a `contentHash`). A
 *    change to any input's content hash is the recompute signal — never a clock.
 *    Identical inputs + generator ⇒ identical derivation.
 *
 *  • Pure types only — no engine, no recompute logic. Core describes *what was
 *    derived from what*; the consumer decides when to recompute.
 */
import type { SourceRef } from './source-ref.js';

/** Whether a fact was observed from a source or computed from inputs. Open. */
export type DerivationMode = 'observed' | 'derived' | (string & {});

/**
 * How a node or edge came to exist.
 *
 * For `mode: 'observed'` the fact is taken directly from a source and `inputs`
 * are typically absent (support lives in {@link Provenance.evidence}). For
 * `mode: 'derived'` the fact was computed by `generator` from `inputs`; a change
 * to any input (detected via its {@link SourceRef.contentHash}) means the fact
 * is stale and can be recomputed.
 */
export interface Derivation {
  /** Discriminator: observed-from-source vs derived-from-inputs. */
  mode: DerivationMode;
  /**
   * Stable identifier of the deriving process (e.g. `'link-extractor@1'`). A
   * durable, version-bearing key so a change in generator behavior is itself a
   * recompute signal. Expected for `mode: 'derived'`.
   */
  generator?: string;
  /**
   * The source resources this fact was derived from. Each carries an optional
   * `contentHash`; recompute is triggered when any input's hash changes. Order
   * is significant for deterministic comparison.
   */
  inputs?: SourceRef[];
}
