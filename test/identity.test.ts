import { describe, expect, it } from 'vitest';

import {
  ADDRESS_RE,
  aliasBody,
  buildAddress,
  buildEdgeId,
  buildId,
  buildPersonAddress,
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

describe('alias-based person identity', () => {
  it('aliasBody mints an opaque slug with no type prefix', () => {
    expect(aliasBody('A. Lovelace')).toBe('a-lovelace');
    expect(aliasBody('alovelace')).toBe('alovelace');
    // The body is just the slugified alias — it carries no type segment.
    expect(aliasBody('A. Lovelace')).not.toContain('person');
    expect(aliasBody('A. Lovelace')).not.toContain('/');
  });

  it('buildPersonAddress mints kg://<authority>/<alias> with no type segment', () => {
    const addr = buildPersonAddress('alovelace', { authority: 'directory' });
    expect(addr).toBe('kg://directory/alovelace');
    expect(addr).not.toContain('person');
    expect(isAddress(addr)).toBe(true);
  });

  it('is alias-stable regardless of source login or display name', () => {
    // Two witnesses with different GitHub logins but the same corporate alias.
    const witnessA = { login: 'ada-gh', displayName: 'Ada Lovelace', alias: 'alovelace' };
    const witnessB = { login: 'countess-99', displayName: 'The Countess', alias: 'alovelace' };

    // Identity depends only on the alias body — never on the login.
    expect(buildPersonAddress(witnessA.alias)).toBe('kg://alovelace');
    expect(buildPersonAddress(witnessA.alias)).toBe(buildPersonAddress(witnessB.alias));

    // A different display name does NOT change the address.
    expect(buildPersonAddress('alovelace')).toBe(buildPersonAddress('alovelace'));
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

// Regression pins for the behavior PR #31 disclosed but never covered with a
// test (issue #52): stripScheme's default-mode widening from "strip kg://
// only" to "strip any well-formed scheme", and buildJsonLd's fallback @id
// (below, in graph.test.ts). These pin CURRENT, post-#31 behavior exactly —
// they exist so a future change to this surface is a conscious, visible diff.
describe('stripScheme default-mode widening (regression pins, issue #52)', () => {
  it('strips a non-kg well-formed scheme too — the disclosed widening', () => {
    // Pre-#31, stripScheme only recognized a hardcoded `kg://` prefix, so this
    // input would have been returned unchanged. Post-#31 it is stripped like
    // any other well-formed scheme.
    expect(stripScheme('https://example.com/path')).toBe('example.com/path');
    expect(stripScheme('mailto://someone')).toBe('someone');
  });

  it('leaves scheme-less input untouched', () => {
    expect(stripScheme('person/ada')).toBe('person/ada');
    expect(stripScheme('ada')).toBe('ada');
    expect(stripScheme('')).toBe('');
  });

  it('strips unusual-but-well-formed schemes (digits, +, ., - after the leading letter)', () => {
    expect(stripScheme('a1+2.3-4://body')).toBe('body');
    expect(stripScheme('custom-scheme.v2://x/y')).toBe('x/y');
  });

  it('does NOT strip a prefix that is not a well-formed scheme', () => {
    // Uppercase: the default-mode regex is lowercase-only (mirrors SCHEME_RE).
    expect(stripScheme('HTTP://example.com')).toBe('HTTP://example.com');
    // Digit-led: a well-formed scheme must be letter-led.
    expect(stripScheme('1abc://example.com')).toBe('1abc://example.com');
  });

  it('is idempotent once a scheme has already been stripped', () => {
    const stripped = stripScheme('https://example.com/path');
    expect(stripScheme(stripped)).toBe(stripped);
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
