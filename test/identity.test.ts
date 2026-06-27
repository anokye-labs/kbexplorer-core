import { describe, expect, it } from 'vitest';

import {
  buildEdgeId,
  buildId,
  ID_RE,
  isKnownRelation,
  KNOWN_RELATIONS,
  mapRelation,
  normalizeType,
  slugify,
  stripScheme,
  TYPE_RE,
} from '../src/index.js';

describe('slugify', () => {
  it('lowercases, ASCII-folds and kebab-cases deterministically', () => {
    expect(slugify('Ada Lovelace')).toBe('ada-lovelace');
    expect(slugify('Café   Crème!!')).toBe('cafe-creme');
    expect(slugify('--Already-Kebab--')).toBe('already-kebab');
  });

  it('falls back to "unknown" on empty/nullish input', () => {
    expect(slugify('')).toBe('unknown');
    expect(slugify(null)).toBe('unknown');
    expect(slugify('   ')).toBe('unknown');
  });

  it('clamps to 80 chars', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });
});

describe('normalizeType', () => {
  it('maps an unknown/empty type to the open "entity" key', () => {
    expect(normalizeType('')).toBe('entity');
    expect(normalizeType('Person')).toBe('person');
  });
});

describe('kg:// URN builders', () => {
  it('builds a kg://<type>/<slug> identity URN', () => {
    const id = buildId('Person', 'Ada Lovelace');
    expect(id).toBe('kg://person/ada-lovelace');
    expect(ID_RE.test(id)).toBe(true);
    expect(TYPE_RE.test('person')).toBe(true);
  });

  it('builds a deterministic edge URN, stripping schemes from endpoints', () => {
    const from = buildId('person', 'ada');
    const to = buildId('team', 'core');
    expect(buildEdgeId(from, 'leads', to)).toBe('kg://edge/person/ada~leads~team/core');
  });

  it('stripScheme is idempotent', () => {
    expect(stripScheme('kg://person/ada')).toBe('person/ada');
    expect(stripScheme('person/ada')).toBe('person/ada');
  });
});

describe('relation taxonomy', () => {
  it('exposes exactly the six canonical relations', () => {
    expect([...KNOWN_RELATIONS]).toEqual([
      'leads',
      'staffs',
      'reports-to',
      'structural',
      'derived',
      'deprecated',
    ]);
  });

  it('isKnownRelation guards membership', () => {
    expect(isKnownRelation('leads')).toBe(true);
    expect(isKnownRelation('mentors')).toBe(false);
    expect(isKnownRelation(42)).toBe(false);
  });

  it('maps synonyms and phrasings onto the taxonomy', () => {
    expect(mapRelation('manages')).toEqual({ relation: 'leads', raw: 'manages' });
    expect(mapRelation('reports to')).toEqual({ relation: 'reports-to', raw: 'reports to' });
    expect(mapRelation('Member Of')).toEqual({ relation: 'staffs', raw: 'member of' });
  });

  it('falls back to structural for unknown labels', () => {
    expect(mapRelation('frobnicates')).toEqual({ relation: 'structural', raw: 'frobnicates' });
    expect(mapRelation('')).toEqual({ relation: 'structural', raw: 'structural' });
  });
});
