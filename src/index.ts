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
 *   - the Source / GraphProvider / GraphStore / Representation interface seams
 */

export * from './graph.js';
export * from './source-ref.js';
export * from './jsonld.js';
export * from './config.js';
export * from './identity.js';
export * from './relations.js';
export * from './source.js';
export * from './provider.js';
export * from './graph-store.js';
export * from './representation.js';

/** Semantic version of the contract surface exported by this package. */
export const KBEXPLORER_CORE_VERSION = '0.1.0' as const;
