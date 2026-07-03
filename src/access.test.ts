import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCESS_EXCLUSION,
  coerceAccessLabel,
  isExcludedByDefault,
  normalizeAccessLabel,
  resolveAccessExclusion,
} from './access.js';

describe('normalizeAccessLabel', () => {
  it('trims, dedupes, and sorts the normalized label shape', () => {
    expect(
      normalizeAccessLabel({
        classification: ' restricted ',
        visibility: '  ',
        labels: ['pii', '', 'pii', 'legal-hold'],
        sourcePolicyRef: { type: 'policy', id: 'p1' },
        extra: 'dropped',
      }),
    ).toEqual({
      classification: 'restricted',
      labels: ['legal-hold', 'pii'],
      sourcePolicyRef: { type: 'policy', id: 'p1' },
    });
  });

  it('returns undefined for unlabeled or malformed values', () => {
    expect(normalizeAccessLabel(undefined)).toBeUndefined();
    expect(normalizeAccessLabel('restricted')).toBeUndefined();
    expect(normalizeAccessLabel(['restricted'])).toBeUndefined();
    expect(normalizeAccessLabel({})).toBeUndefined();
    expect(normalizeAccessLabel({ classification: '   ' })).toBeUndefined();
  });
});

describe('coerceAccessLabel', () => {
  it('accepts the bare-string classification shorthand', () => {
    expect(coerceAccessLabel('confidential')).toEqual({ classification: 'confidential' });
  });

  it('normalizes an object label and preserves only usable fields', () => {
    expect(coerceAccessLabel({ classification: ' internal ', labels: ['pii', 7, ''] })).toEqual({
      classification: 'internal',
      labels: ['pii'],
    });
  });

  it('returns undefined for empty or unsupported values', () => {
    expect(coerceAccessLabel('   ')).toBeUndefined();
    expect(coerceAccessLabel(42)).toBeUndefined();
  });
});

describe('resolveAccessExclusion', () => {
  it('returns the full default policy when no overrides are provided', () => {
    expect(resolveAccessExclusion()).toEqual(DEFAULT_ACCESS_EXCLUSION);
    expect(resolveAccessExclusion().excludedClassifications).not.toBe(
      DEFAULT_ACCESS_EXCLUSION.excludedClassifications,
    );
    expect(resolveAccessExclusion().excludedVisibilities).not.toBe(
      DEFAULT_ACCESS_EXCLUSION.excludedVisibilities,
    );
  });

  it('applies partial overrides while preserving the default-safe values', () => {
    expect(
      resolveAccessExclusion({ mode: 'include', excludedVisibilities: ['internal'] }),
    ).toEqual({
      mode: 'include',
      excludedClassifications: DEFAULT_ACCESS_EXCLUSION.excludedClassifications,
      excludedVisibilities: ['internal'],
    });
  });
});

describe('isExcludedByDefault', () => {
  it('withholds the default-restricted tiers and private visibility', () => {
    expect(isExcludedByDefault({ classification: 'restricted' })).toBe(true);
    expect(isExcludedByDefault({ classification: 'confidential' })).toBe(true);
    expect(isExcludedByDefault({ classification: 'unknown' })).toBe(true);
    expect(isExcludedByDefault({ visibility: 'private' })).toBe(true);
    expect(isExcludedByDefault({ classification: 'internal' })).toBe(false);
    expect(isExcludedByDefault({ classification: 'public', visibility: 'internal' })).toBe(false);
    expect(isExcludedByDefault({})).toBe(false);
  });

  it('fail-closes on bespoke classifications and visibilities', () => {
    expect(isExcludedByDefault({ classification: 'top-secret' })).toBe(true);
    expect(isExcludedByDefault({ visibility: 'need-to-know' })).toBe(true);
  });

  it('lets explicit config overrides widen or narrow the exclusion set', () => {
    const config = resolveAccessExclusion({ excludedClassifications: ['internal'] });
    expect(isExcludedByDefault({ classification: 'internal' }, config)).toBe(true);
    expect(isExcludedByDefault({ classification: 'confidential' }, config)).toBe(false);
  });
});
