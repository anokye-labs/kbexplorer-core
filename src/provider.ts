/**
 * The GraphProvider seam — turns resources (and prior graph fragments) into a
 * pure {@link KBGraph} fragment of nodes + edges.
 *
 * Providers are pluggable: first-party, local ES modules, or third-party
 * packages. A provider declares the affordances it needs from its source(s); the
 * engine resolves providers in dependency order and fails fast if a required
 * affordance is unmet. This module is pure contract — no registry, no engine.
 */
import type { KBConfig } from './config.js';
import type { KBEdge, KBNode } from './graph.js';
import type { Affordance, Source } from './source.js';

/** The graph fragment produced by a single provider run. */
export interface ProviderResult {
  nodes: KBNode[];
  edges: KBEdge[];
}

/** Inputs handed to a provider when the engine resolves it. */
export interface ProviderContext {
  /** The knowledge-base configuration. */
  config: KBConfig;
  /** Nodes produced by previously-run providers (for cross-referencing). */
  existingNodes: KBNode[];
  /** Sources available to the provider, keyed by {@link Source.id}. */
  sources?: Record<string, Source>;
}

/** A graph provider produces nodes and edges from one or more sources. */
export interface GraphProvider {
  /** Unique provider identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Provider IDs this provider depends on (resolution ordering). */
  dependencies?: string[];
  /**
   * Affordances this provider requires from its source(s). The engine fails fast
   * if a needed affordance is unmet on retrieval (situational, per-retrieval).
   */
  requiredAffordances?: Affordance[];
  /** Resolve this provider's graph fragment. */
  resolve(context: ProviderContext): Promise<ProviderResult>;
}
