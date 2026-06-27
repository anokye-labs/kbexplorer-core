/**
 * @anokye-labs/kbexplorer-core
 *
 * Shared contracts for the kbexplorer system. This package is intentionally
 * dependency-free and side-effect-free: it holds the pure data types and
 * interface seams that both `kbexplorer-cli` and `kbexplorer-template` (and any
 * third-party provider) depend on, so the contract lives in exactly one place.
 *
 * What lives here:
 *   - graph types (KBNode / KBEdge / KBGraph / Cluster / Connection / NodeSource)
 *   - the JSON-LD envelope + `buildJsonLd` helper
 *   - the knowledge-base configuration contract (KBConfig)
 *   - `kg://` identity URN helpers + the canonical relation taxonomy
 *
 * Subsequent tasks add: the Source / GraphProvider / Representation interface
 * seams.
 */

export * from './graph.js';
export * from './jsonld.js';
export * from './config.js';
export * from './identity.js';
export * from './relations.js';

/** Semantic version of the contract surface exported by this package. */
export const KBEXPLORER_CORE_VERSION = '0.0.0' as const;
