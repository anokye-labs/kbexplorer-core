import { describe, expect, it } from 'vitest';

import { mapRelation } from '../src/index.js';
import type { Connection, KBEdge } from '../src/index.js';

describe('relationRaw passthrough', () => {
  it('preserves a source label outside the taxonomy alongside the mapped relation', () => {
    const { relation, raw } = mapRelation('mentored');
    // 'mentored' is not in the taxonomy → collapses to the structural fallback
    expect(relation).toBe('structural');

    const edge: KBEdge = {
      from: 'ada',
      to: 'charles',
      type: 'references',
      description: 'mentored by',
      source: 'frontmatter',
      weight: 1,
      relation,
      relationRaw: raw,
    };
    expect(edge.relation).toBe('structural');
    expect(edge.relationRaw).toBe('mentored');
  });

  it('round-trips through JSON serialization unchanged', () => {
    const edge: KBEdge = {
      from: 'a',
      to: 'b',
      type: 'related',
      description: '',
      source: 'inferred',
      weight: 1,
      relation: 'structural',
      relationRaw: 'co-authored-with',
    };
    const roundTripped = JSON.parse(JSON.stringify(edge)) as KBEdge;
    expect(roundTripped.relationRaw).toBe('co-authored-with');
  });

  it('is carryable on an authored Connection and is optional', () => {
    const conn: Connection = {
      to: 'b',
      description: 'x',
      relation: 'structural',
      relationRaw: 'sponsors',
    };
    expect(conn.relationRaw).toBe('sponsors');

    const bare: Connection = { to: 'c', description: 'y' };
    expect(bare.relationRaw).toBeUndefined();
  });
});
