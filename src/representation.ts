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
 *
 * `canvas` target convention: a `canvas` representation renders the graph for a
 * host-embeddable surface (an editor/app side-panel) rather than a standalone
 * website. Because {@link RepresentationTarget} is an open union it needs zero
 * core change — but naming the convention here lets the SPA, CLI and host
 * register host-embeddable renderers under one agreed key instead of each
 * inventing its own. Like every target it renders the same pure {@link KBGraph};
 * the embedding/transport is the consumer's concern. Tracks
 * anokye-labs/kbexplorer-template#401.
 */
import type { KBGraph } from './graph.js';
import type { PresentationTokens } from './presentation.js';

/**
 * The agreed target key for a host-embeddable canvas renderer (an editor/app
 * side-panel surface). A convenience constant for the open `'canvas'`
 * convention; consumers may still use any open {@link RepresentationTarget}.
 */
export const CANVAS_TARGET = 'canvas' as const;

/** A rendering target. Open so consumers can register their own. */
export type RepresentationTarget =
  | 'json-ld'
  | 'llm-context'
  | 'spa'
  | 'canvas'
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
