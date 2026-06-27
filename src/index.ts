/**
 * @anokye-labs/kbexplorer-core
 *
 * Shared contracts for the kbexplorer system. This package is intentionally
 * dependency-free and side-effect-free: it holds the pure data types and
 * interface seams that both `kbexplorer-cli` and `kbexplorer-template` (and any
 * third-party provider) depend on, so the contract lives in exactly one place.
 *
 * Phase 1 stands up this package; subsequent tasks fill it in:
 *   - graph types (KBNode / KBEdge / KBGraph / KBConfig)
 *   - identity / URN (`kg://`) + relation taxonomy
 *   - Source / GraphProvider / Representation interfaces
 */

/** Semantic version of the contract surface exported by this package. */
export const KBEXPLORER_CORE_VERSION = '0.0.0' as const;
