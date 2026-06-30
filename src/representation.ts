/**
 * The Representation seam — renders a pure {@link KBGraph} for a target.
 *
 * Targets are interchangeable: `json-ld` (structured data), `llm-context`
 * (token-budgeted Markdown for an LLM), and `spa` (the explorer website) are all
 * representations of the same pure graph. This module is pure contract — the
 * concrete renderers live in consumers.
 *
 * `llm-context` design contract (deliberate): it is ALWAYS neighbor-anchored.
 * It is anchored on one or more context nodes, emits the nearest neighbors
 * ranked by existing edge-weight up to a token budget, and emits navigable
 * `kg://` links for relevant-but-unexpanded neighbors so an LLM follows
 * hyperlinks to retrieve more on demand. It NEVER serializes the whole graph.
 */
import type { KBGraph } from './graph.js';
import type { PresentationTokens } from './presentation.js';

/** A rendering target. Open so consumers can register their own. */
export type RepresentationTarget =
  | 'json-ld'
  | 'llm-context'
  | 'spa'
  | (string & {});

/** Options passed to a representation render. */
export interface RepresentationOptions {
  /**
   * Anchor node id(s). REQUIRED for neighbor-anchored targets like
   * `llm-context`; the render is centered on these nodes.
   */
  anchors?: string[];
  /** Token budget for budgeted targets (e.g. `llm-context`). */
  tokenBudget?: number;
  /**
   * Optional host-neutral presentation tokens (typography, corner radius,
   * density, spacing) a visual target may honor. Open/loose — absent means
   * "inherit the active theme". See {@link PresentationTokens}.
   */
  presentation?: PresentationTokens;
  [key: string]: unknown;
}

/** A representation renders a pure graph for a {@link RepresentationTarget}. */
export interface Representation<Out = string> {
  /** The target this representation renders for. */
  target: RepresentationTarget;
  /**
   * Render `graph` for the target. Neighbor-anchored targets require
   * `options.anchors`; an empty/missing anchor set is an error for those targets.
   */
  render(graph: KBGraph, options?: RepresentationOptions): Out | Promise<Out>;
}
