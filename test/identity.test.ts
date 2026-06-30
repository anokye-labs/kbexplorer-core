import { describe, expect, it } from 'vitest';

import {
  ADDRESS_RE,
  buildAddress,
  buildEdgeId,
  buildId,
  DEFAULT_SCHEME,
  ID_RE,
  isAddress,
  isKnownRelation,
  KNOWN_RELATIONS,
  mapRelation,
  normalizeScheme,
  normalizeType,
  parseAddress,
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

describe('configurable addressing', () => {
  it('mints an opaque address with no embedded type (default scheme)', () => {
    const addr = buildAddress('ada-lovelace');
    expect(addr).toBe('kg://ada-lovelace');
    expect(isAddress(addr)).toBe(true);
  });

  it('honors a configured scheme and optional authority', () => {
    expect(buildAddress('ada-lovelace', { scheme: 'org-kb', authority: 'directory' })).toBe(
      'org-kb://directory/ada-lovelace',
    );
    expect(buildAddress('ada-lovelace', { scheme: 'kb' })).toBe('kb://ada-lovelace');
  });

  it('treats the body as opaque — no type is encoded or required', () => {
    const addr = buildAddress('ada-lovelace', { authority: 'directory' });
    expect(addr).toBe('kg://directory/ada-lovelace');
    expect(addr).not.toContain('person');
  });

  it('falls back to the default scheme on a malformed/absent scheme', () => {
    expect(normalizeScheme('')).toBe(DEFAULT_SCHEME);
    expect(normalizeScheme('Not A Scheme!')).toBe(DEFAULT_SCHEME);
    expect(normalizeScheme('org-kb')).toBe('org-kb');
    expect(buildAddress('x', { scheme: 'NOPE!' })).toBe('kg://x');
  });

  it('round-trips deterministically through parseAddress', () => {
    const addr = buildAddress('ada-lovelace', { scheme: 'org-kb', authority: 'directory' });
    const parsed = parseAddress(addr, { authority: 'directory' });
    expect(parsed).toEqual({ scheme: 'org-kb', authority: 'directory', body: 'ada-lovelace' });
    expect(buildAddress(parsed.body, { scheme: parsed.scheme, authority: parsed.authority })).toBe(
      addr,
    );
  });

  it('parses scheme + opaque body, extracting no meaning by default', () => {
    expect(parseAddress('kg://directory/ada-lovelace')).toEqual({
      scheme: 'kg',
      body: 'directory/ada-lovelace',
    });
  });

  it('isAddress / ADDRESS_RE guard well-formed addresses', () => {
    expect(isAddress('kg://ada')).toBe(true);
    expect(isAddress('org-kb://directory/ada')).toBe(true);
    expect(ADDRESS_RE.test('kb://x')).toBe(true);
    expect(isAddress('not-an-address')).toBe(false);
    expect(isAddress('kg://')).toBe(false);
    expect(isAddress(42)).toBe(false);
  });
});

describe('scheme-aware stripScheme / buildEdgeId', () => {
  it('stripScheme removes any scheme by default, or an explicit one', () => {
    expect(stripScheme('org-kb://directory/ada')).toBe('directory/ada');
    expect(stripScheme('kg://person/ada', 'kg')).toBe('person/ada');
    expect(stripScheme('kg://person/ada', 'org-kb')).toBe('kg://person/ada');
  });

  it('buildEdgeId keeps the legacy kg:// output and honors a configured scheme', () => {
    const from = buildAddress('directory/ada', { scheme: 'org-kb' });
    const to = buildAddress('directory/team-core', { scheme: 'org-kb' });
    expect(buildEdgeId(from, 'leads', to, { scheme: 'org-kb' })).toBe(
      'org-kb://edge/directory/ada~leads~directory/team-core',
    );
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
