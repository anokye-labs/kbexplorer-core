/**
 * `kg://` identity URNs — canonical, deterministic identifiers that link node
 * and edge representations across providers and layers.
 *
 * The scheme is `kg://<type>/<slug>` for entities and
 * `kg://edge/<from>~<relation>~<to>` for edges. An identity URN is ALWAYS
 * reused as a node's `@id`; it is NEVER derived from a file path. Pure and
 * canonical: identical input → byte-identical output, which is what makes
 * re-derivation idempotent and drift checks meaningful.
 */

/**
 * Lowercase, ASCII-fold (strip combining marks), and collapse to kebab-case.
 * Deterministic; clamps to 80 chars; empty input becomes `'unknown'`.
 */
export function slugify(input: unknown): string {
  return (
    String(input ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'unknown'
  );
}

/** Normalize an entity-kind into an open registry key (never path-derived). */
export function normalizeType(type: unknown): string {
  const slug = slugify(type);
  return slug === 'unknown' ? 'entity' : slug;
}

/** Strip the `kg://` scheme prefix from an id (idempotent if absent). */
export function stripScheme(id: unknown): string {
  return String(id).replace(/^kg:\/\//, '');
}

/** Build a `kg://<type>/<slug>` identity URN. Reused as `@id`, never path-derived. */
export function buildId(type: unknown, key: unknown): string {
  return `kg://${normalizeType(type)}/${slugify(key)}`;
}

/** Build a deterministic `kg://edge/<from>~<relation>~<to>` URN from endpoints + relation. */
export function buildEdgeId(fromId: unknown, relation: string, toId: unknown): string {
  const from = stripScheme(fromId);
  const to = stripScheme(toId);
  return `kg://edge/${from}~${relation}~${to}`;
}

/** Matches a well-formed `kg://<type>/<slug>` entity identity URN. */
export const ID_RE = /^kg:\/\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Matches an open lowercase entity-type key (never a path / file extension). */
export const TYPE_RE = /^[a-z][a-z0-9-]*$/;
