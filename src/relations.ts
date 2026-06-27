/**
 * The canonical relation taxonomy.
 *
 * Every edge in a `KBGraph` carries a `relation` drawn from this six-member
 * taxonomy (or maps onto it via {@link mapRelation}). It is the normalization
 * target shared by the deterministic JSON-LD emitter (CLI) and the graph
 * engine (SPA), so the same prose phrasing resolves to the same relation
 * everywhere. Pure data + pure functions — no I/O, no styling.
 */

/** The canonical six-member relation taxonomy. */
export type KnownRelation =
  | 'leads'
  | 'staffs'
  | 'reports-to'
  | 'structural'
  | 'derived'
  | 'deprecated';

/** The canonical six-member relation taxonomy, as a frozen runtime array. */
export const KNOWN_RELATIONS: readonly KnownRelation[] = Object.freeze([
  'leads',
  'staffs',
  'reports-to',
  'structural',
  'derived',
  'deprecated',
]);

/** Common phrasings → taxonomy. Unknown relations fall back to `'structural'`. */
export const RELATION_SYNONYMS: Readonly<Record<string, KnownRelation>> =
  Object.freeze({
    leads: 'leads',
    lead: 'leads',
    manages: 'leads',
    heads: 'leads',
    owns: 'leads',
    staffs: 'staffs',
    staff: 'staffs',
    'member-of': 'staffs',
    'member of': 'staffs',
    'belongs-to': 'staffs',
    'part-of': 'structural',
    'part of': 'structural',
    contains: 'structural',
    'reports-to': 'reports-to',
    'reports to': 'reports-to',
    reports: 'reports-to',
    'managed-by': 'reports-to',
    structural: 'structural',
    related: 'structural',
    associated: 'structural',
    derived: 'derived',
    'derived-from': 'derived',
    generates: 'derived',
    produces: 'derived',
    deprecated: 'deprecated',
    'deprecated-by': 'deprecated',
    obsolete: 'deprecated',
  });

/** Type guard: is `value` a member of the canonical taxonomy? */
export function isKnownRelation(value: unknown): value is KnownRelation {
  return (
    typeof value === 'string' &&
    (KNOWN_RELATIONS as readonly string[]).includes(value)
  );
}

/**
 * Map a raw relationship label onto the taxonomy.
 *
 * `relation` is always a member of {@link KNOWN_RELATIONS}; `raw` preserves the
 * normalized input so callers can keep the original phrasing alongside the
 * canonical relation. Unknown labels resolve to `'structural'`.
 */
export function mapRelation(raw: unknown): { relation: KnownRelation; raw: string } {
  const key = String(raw ?? '').trim().toLowerCase();
  if (isKnownRelation(key)) return { relation: key, raw: key };
  const mapped = RELATION_SYNONYMS[key] ?? RELATION_SYNONYMS[key.replace(/\s+/g, '-')];
  return { relation: mapped ?? 'structural', raw: key || 'structural' };
}
