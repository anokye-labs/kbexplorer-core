/**
 * The Source seam — adapts a system of record (SoR) into retrievable,
 * self-describing resources.
 *
 * Design contract (deliberate, see SUBSYSTEMS / architecture docs):
 *
 *  • Affordances are PER-RETRIEVAL, not per-type or per-instance. A source
 *    advertises a *possible* universe of affordances (advisory only); each
 *    {@link Resource} carries the affordances *actually* allowed at the moment
 *    it was retrieved. The same resource can come back with different
 *    affordances later (auth, locks, branch protection, rate limits, worktree
 *    state). Resources are web/REST-inspired: self-describing and navigable.
 *
 *  • The staging area is first-class and LINKED. A staged resource MUST carry a
 *    `{ rel: 'staging-area', href }` link to a retrievable staging-area
 *    resource — staging is never an invisible side effect.
 *
 *  • Git ≠ GitHub. `affordance` and `kind` are OPEN strings precisely so a
 *    composite source can expose Git resources (`file` / `tree` / `commit` /
 *    `staging-area` with `read` / `write` / `stage`) alongside GitHub resources
 *    (`issue` / `pull-request` / `release` with their own operations) without
 *    conflating the two. `draft` / `proposed` / PR are GitHub concepts and are
 *    never git `stage` sub-states.
 *
 * This module is pure contract: interfaces, an open string-union, and tiny
 * pure helpers. No I/O, no concrete source implementations.
 */

/**
 * An operation permitted on a retrieved resource *right now*.
 *
 * The three git-worktree affordances (`read` / `write` / `stage`) are named
 * explicitly; the union stays open so composite sources can advertise
 * source-native operations (e.g. `comment`, `close`, `merge`) without conflating
 * Git and GitHub.
 */
export type Affordance = 'read' | 'write' | 'stage' | (string & {});

/** The `rel` that links a staged resource to its retrievable staging area. */
export const STAGING_AREA_REL = 'staging-area' as const;

/** A hypermedia link from a resource to a related, navigable resource. */
export interface ResourceLink {
  /** Relation, e.g. `'self'`, `'staging-area'`, `'parent'`, `'commit'`. */
  rel: string;
  /** A locator the same Source can re-retrieve (source-native URI or `kg://`). */
  href: string;
  /** Optional hint at the linked resource's `kind`. */
  type?: string;
  /** Optional human-readable label. */
  title?: string;
}

/**
 * A resource retrieved from a {@link Source}.
 *
 * `affordances` and `links` describe THIS retrieval only and may differ on a
 * later retrieval of the same `href`.
 */
export interface Resource<T = unknown> {
  /** Stable locator for re-retrieval (source-native URI or `kg://` URN). */
  href: string;
  /** Open resource kind, e.g. `'file'`, `'tree'`, `'commit'`, `'staging-area'`, `'issue'`. */
  kind: string;
  /** Operations actually allowed on this retrieval (situational). */
  affordances: Affordance[];
  /**
   * Hypermedia links. A staged resource MUST include a
   * `{ rel: 'staging-area', href }` link (see {@link STAGING_AREA_REL}).
   */
  links: ResourceLink[];
  /** The resource payload; shape depends on `kind`. */
  body: T;
}

/** An open selector passed to a Source retrieval. */
export interface ResourceQuery {
  /** Restrict to a resource kind. */
  kind?: string;
  /** Restrict to a specific locator. */
  href?: string;
  [key: string]: unknown;
}

/**
 * A Source adapts a system of record into retrievable resources.
 *
 * `possibleAffordances` is advisory (the universe the source *may* offer); the
 * authoritative, situational affordances live on each retrieved {@link Resource}.
 */
export interface Source {
  /** Unique source identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Advisory universe of affordances this source MAY offer (not a guarantee). */
  possibleAffordances?: Affordance[];
  /** Retrieve resources matching a query; each result carries its own affordances + links. */
  retrieve(query: ResourceQuery): Promise<Resource[]>;
  /** Retrieve a single resource by locator (re-retrieval may yield different affordances). */
  get?(href: string): Promise<Resource | undefined>;
}

/** True if `resource` currently permits `affordance`. */
export function hasAffordance(resource: Resource, affordance: Affordance): boolean {
  return resource.affordances.includes(affordance);
}

/** The staging-area link of a resource, if present (see {@link STAGING_AREA_REL}). */
export function stagingAreaLink(resource: Resource): ResourceLink | undefined {
  return resource.links.find((link) => link.rel === STAGING_AREA_REL);
}
