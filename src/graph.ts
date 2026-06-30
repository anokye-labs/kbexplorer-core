/**
 * Pure knowledge-graph data types — the canonical contract shared by every
 * kbexplorer consumer.
 *
 * These are **data only**: no rendering, no styling constants, no engine
 * imports, no I/O. A `KBGraph` produced by the engine is consumed identically by
 * the SPA, the JSON-LD serializer, and the LLM-context representation. Visual
 * concerns (edge colors, viewers, layout) live in the consumer, never here.
 */
import type { Provenance } from './source-ref.js';
import type { Derivation } from './derivation.js';

/**
 * How a node's content should be rendered.
 *
 * This is an **open** union: the listed values keep editor autocomplete, while
 * `(string & {})` allows new display modes (and registry-driven `'entity'`
 * viewers) to be introduced without editing this core type. `'entity'` is the
 * escape hatch that routes a node to a viewer resolved from the viewer registry
 * by its `entityType` / JSON-LD `@type`.
 */
export type KnownDisplayMode =
  | 'prose'
  | 'code'
  | 'file-list'
  | 'tree'
  | 'table'
  | 'diagram'
  | 'homepage'
  | 'gallery'
  | 'icon-detail'
  | 'repository'
  | 'entity';
export type DisplayMode = KnownDisplayMode | (string & {});

/** Built-in edge types produced by the engine's structural/content analysis. */
export type KnownEdgeType =
  | 'contains'
  | 'derived_from'
  | 'imports'
  | 'references'
  | 'frontmatter'
  | 'mentions'
  | 'cross_references'
  | 'modifies'
  | 'closes'
  | 'related';

/**
 * Edge type discriminator.
 *
 * Open union: known types keep autocomplete while `(string & {})` lets new
 * structural edge kinds exist without editing this core type. Visual styling
 * and weights for arbitrary edges/relations are resolved in the consumer, not
 * here.
 */
export type EdgeType = KnownEdgeType | (string & {});

/** Where an edge/connection assertion came from. */
export type EdgeSource = 'inline' | 'frontmatter' | 'inferred';

/**
 * Pointer to a node's writable source-of-truth file.
 *
 * `path` is repo-relative (e.g. `content-model/people/ada.yaml`) so deep-links
 * can be built from the configured repo coordinates; `raw` is the verbatim file
 * text an editor edits; `format` selects the parser used to validate edits
 * before any handoff.
 */
export interface NodeSourceFile {
  /** Repo-relative path of the file, e.g. `content-model/people/ada.yaml`. */
  path: string;
  /** Verbatim file content — the editable source of truth. */
  raw: string;
  /**
   * Parser format used to validate edits before a GitHub PR handoff. `'yaml'`
   * and `'json'` cover structured content-model files; `'markdown'` covers
   * rich-Markdown sources (e.g. authored docs edited in place).
   */
  format: 'yaml' | 'json' | 'markdown';
}

/**
 * Per-page (per-node) theme overrides, parsed from a node's frontmatter.
 *
 * All three fields are optional and additive — an absent/empty `PageTheme`
 * leaves the page rendering with the active global theme. When applied, the
 * layering order is: named `theme` (lowest) → `accent` brand recolor →
 * `tokens` (highest), so explicit token deltas always win.
 */
export interface PageTheme {
  /**
   * Brand seed/accent color (hex, e.g. "#C04040"). Generates a Fluent brand
   * ramp and recolors only the brand-family tokens on top of the active theme.
   */
  accent?: string;
  /**
   * Arbitrary Fluent design-token deltas (token name → CSS value). Highest
   * precedence within the page.
   */
  tokens?: Partial<Record<string, string>>;
  /**
   * Named theme key whose tokens become the page's base before accent/tokens
   * layer on.
   */
  theme?: string;
}

/** Where a node originated from. */
export type NodeSource =
  | { type: 'authored'; file: string }
  | { type: 'issue'; number: number; state: string; labels: string[] }
  | { type: 'pull_request'; number: number; state: string }
  | { type: 'commit'; sha: string }
  | { type: 'file'; path: string }
  | { type: 'readme' }
  | { type: 'section'; parentSource: NodeSource }
  | { type: 'derived'; generator: string }
  | { type: 'external'; provider: string }
  | { type: 'branch'; name: string; protected: boolean }
  | { type: 'workflow'; path: string }
  | { type: 'repository'; owner: string; repo: string }
  /**
   * Generic, registry-driven source for typed/structured nodes. This is the
   * open escape hatch: new node types reuse `structured` and identify
   * themselves via `entityType` (a node-type registry key) instead of each
   * requiring a bespoke `NodeSource` variant. `ref` optionally records the
   * upstream record id the node was mapped from.
   */
  | { type: 'structured'; entityType: string; ref?: string }
  /** A GitHub release (tag, name, release notes, prerelease flag). */
  | { type: 'release'; tag: string; prerelease: boolean }
  /**
   * A person node. `alias` is the source-agnostic, stable identity key (a
   * corporate alias); the person's display name lives in the node's
   * `title`/`data`, never in the identity. `login` remains the GitHub-source
   * witness for back-compat — when a content-model person descriptor matches
   * (same alias/login), `linked` is set to true and the identity URN is reused
   * from the descriptor rather than minted fresh.
   */
  | { type: 'person'; login: string; linked: boolean; alias?: string };

/**
 * A JSON-LD envelope carried by a typed / structured node.
 *
 * `@id` should reuse the node's canonical `identity` URN so representations of
 * the same real-world entity line up across providers. `@type` is the open
 * node-type discriminator (a registry key such as `'person'` or `'team'`) and
 * is NEVER derived from a file path. Additional LD properties may be carried as
 * arbitrary keys.
 */
export interface JsonLd {
  '@context'?:
    | string
    | Record<string, unknown>
    | Array<string | Record<string, unknown>>;
  '@id': string;
  '@type': string | string[];
  [key: string]: unknown;
}

/**
 * A directed connection authored on a node, before the engine resolves it into
 * a {@link KBEdge}.
 */
export interface Connection {
  to: string;
  type?: EdgeType;
  description: string;
  source?: EdgeSource;
  weight?: number;
  /** Optional relationship label from the relation taxonomy (carried onto the edge). */
  relation?: string;
}

/**
 * A node in the knowledge graph.
 *
 * Extends {@link Provenance}: a node keeps its required `source` and may
 * additionally carry `sourceId` / `sourceRefs` / `evidence` pointing back to the
 * resources that support it (additive; absent → unchanged behavior).
 */
export interface KBNode extends Provenance {
  id: string;
  title: string;
  cluster: string;
  /** HTML rendered from markdown. */
  content: string;
  /** Original markdown. */
  rawContent: string;
  emoji?: string;
  /** path relative to repo root (heroes mode) */
  image?: string;
  /** path relative to repo root (sprites mode) */
  sprite?: string;
  /** parent node id (for hierarchy) */
  parent?: string;
  /** `parent` has children, `section` is a child */
  nodeType?: 'parent' | 'section';
  /** How this node's content should be rendered. */
  display?: DisplayMode;
  connections: Connection[];
  /** Canonical identity URN linking representations across providers. */
  identity?: string;
  /** Whether this node's content was machine-derived (can be re-generated). */
  derived?: boolean;
  /**
   * How this node came to exist (observed vs derived) and, for derived nodes,
   * the inputs it was computed from — so a change to an input is detectable for
   * recompute. Richer companion to the boolean `derived` flag; additive.
   */
  derivation?: Derivation;
  /** Source of this node: authored markdown or GitHub artifact. */
  source: NodeSource;
  /** Which provider created this node. */
  provider?: string;
  /**
   * Open node-type identifier — the registry key that selects this node's
   * graph layer, default cluster and viewer (e.g. `'person'`, `'team'`).
   * Additive: when absent the node behaves exactly as before.
   */
  entityType?: string;
  /** JSON-LD envelope: `@context` / `@id` / `@type` plus arbitrary LD properties. */
  jsonld?: JsonLd;
  /** Arbitrary structured-data bag rendered by typed (or the generic) viewers. */
  data?: Record<string, unknown>;
  /**
   * The underlying **source-of-truth** entity file this node was projected
   * from. Present only for nodes backed by a writable YAML/JSON file in the
   * content model.
   */
  sourceFile?: NodeSourceFile;
  /**
   * Optional per-page theming declared in this node's frontmatter. When present
   * its deltas restyle ONLY this node's page; the global theme and document
   * root are never mutated. Absent → no change.
   */
  pageTheme?: PageTheme;
}

/**
 * A resolved, directed edge in the knowledge graph.
 *
 * Extends {@link Provenance}: an edge may additionally carry `sourceId` /
 * `sourceRefs` / `evidence` so a relationship assertion can point back to the
 * resources that support it (additive; absent → unchanged behavior).
 */
export interface KBEdge extends Provenance {
  from: string;
  to: string;
  type: EdgeType;
  description: string;
  source: EdgeSource;
  weight: number;
  /**
   * Open relationship label from the relation taxonomy (leads | staffs |
   * reports-to | structural | derived | deprecated, or any custom string).
   * Drives legend + edge styling in the consumer when present; orthogonal to
   * the structural `type`.
   */
  relation?: string;
  /**
   * How this edge was asserted (observed vs derived) and, for derived edges,
   * the inputs it was computed from — so a change to an input is detectable for
   * recompute. Additive; absent → unchanged behavior.
   */
  derivation?: Derivation;
}

/** A cluster (logical grouping) of nodes. */
export interface Cluster {
  id: string;
  name: string;
  color: string;
  /**
   * Optional cluster-scoped Fluent token overrides (token name → CSS value),
   * carried from `config.clusters.<id>.tokens`. Applied only on cluster-scoped
   * surfaces by the consumer; the global theme is never mutated.
   */
  tokens?: Partial<Record<string, string>>;
}

/** Computed graph data, ready for any representation. */
export interface KBGraph {
  nodes: KBNode[];
  edges: KBEdge[];
  clusters: Cluster[];
  /** nodeId → related nodeIds. */
  related: Record<string, string[]>;
}
