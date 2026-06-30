/**
 * The identity-claims contract — *claims only, no auto-merge* (issue #25, E1).
 *
 * A node may assert that it *might* be the same real-world referent as another
 * resource. That assertion is a {@link IdentityClaim}: a host-neutral, additive
 * pointer carried on a node. Core records the claim and **never acts on it** —
 * the deterministic resolution of competing claims into a single referent is
 * E3's *referent conflation* job (anokye-labs/kbexplorer#15), which reads this
 * substrate. Recording a claim merges nothing.
 *
 * Design contract (deliberate):
 *
 *  • Claims, not merges. An {@link IdentityClaim} states "this node may be the
 *    same referent as `ref`" via an open {@link IdentityClaimKind}. Core does
 *    zero merging: identity stays exactly as authored.
 *
 *  • Precedence-ready. Each claim may name the `source` (system-of-record key)
 *    that asserted it. That key is the join to {@link SourcePrecedenceConfig}
 *    (#26): when two claims conflict on a conflated referent, E3 orders them by
 *    declared source precedence — deterministically, with no thresholds and no
 *    confidence scores. The two contracts share the *source-key string space*,
 *    not a literal type, so each stays independently additive.
 *
 *  • Host-neutral & deterministic. A claim points with a {@link SourceRef}
 *    (open `kind`/`href`, optional `contentHash`), never a host-specific id and
 *    never a timestamp, so the same inputs always produce the same claims.
 *
 *  • Pure types only — no engine, no resolution logic, no I/O.
 */
import type { SourceRef } from './source-ref.js';

/**
 * The kind of identity assertion a claim makes. OPEN so bespoke equivalence
 * vocabularies coexist with the built-ins:
 *  • `'same-as'` — asserts the same referent (an `owl:sameAs`-style claim).
 *  • `'equivalent-to'` — asserts equivalence without asserting strict identity.
 *  • `'differentiated-from'` — asserts these are *not* the same referent (a
 *    negative claim that suppresses an otherwise-tempting merge).
 */
export type IdentityClaimKind =
  | 'same-as'
  | 'equivalent-to'
  | 'differentiated-from'
  | (string & {});

/**
 * A single identity/equivalence claim carried by a node.
 *
 * It says: *this node may be (or is explicitly not) the same referent as*
 * {@link ref}. Core stores it verbatim and never resolves it; E3 reads `claim`,
 * `ref` and `source` to conflate referents deterministically.
 */
export interface IdentityClaim {
  /** What this claim asserts about the relationship to {@link ref}. */
  claim: IdentityClaimKind;
  /**
   * The candidate equivalent referent. A {@link SourceRef} whose `href` is the
   * other referent's identity URN (`kg://…`) or a source-native locator; its
   * optional `contentHash` keeps the claim content-addressed and deterministic.
   */
  ref: SourceRef;
  /**
   * Open system-of-record key that asserted this claim (e.g. `'directory'`,
   * `'github'`). The join to {@link SourcePrecedenceConfig} (#26): E3 orders
   * conflicting claims by this key's declared precedence. Absent ⇒ unranked.
   */
  source?: string;
  /**
   * Optional, deterministic note describing the basis for the claim (e.g.
   * `'matching corporate alias'`). Never a timestamp.
   */
  basis?: string;
}
