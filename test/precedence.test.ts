import { describe, expect, it } from 'vitest';

import type { KBConfig, SourcePrecedenceConfig } from '../src/index.js';

describe('source-precedence contract', () => {
  it('declares a default source order, highest precedence first', () => {
    const precedence: SourcePrecedenceConfig = {
      sources: ['directory', 'github', 'docs'],
    };
    expect(precedence.sources[0]).toBe('directory');
    expect(precedence.fields).toBeUndefined();
  });

  it('supports per-field precedence overrides', () => {
    const precedence: SourcePrecedenceConfig = {
      sources: ['directory', 'github'],
      fields: {
        // github is authoritative for avatar even though directory wins overall
        avatarUrl: ['github', 'directory'],
      },
    };
    expect(precedence.fields?.avatarUrl?.[0]).toBe('github');
  });

  it('attaches additively to KBConfig and is optional', () => {
    const base: Pick<KBConfig, 'title' | 'source'> = {
      title: 'KB',
      source: { owner: 'anokye-labs', repo: 'kbexplorer' },
    };
    const withPrecedence: Pick<KBConfig, 'title' | 'source' | 'precedence'> = {
      ...base,
      precedence: { sources: ['directory', 'github'] },
    };
    expect(withPrecedence.precedence?.sources).toEqual(['directory', 'github']);

    const without: Pick<KBConfig, 'title' | 'source' | 'precedence'> = base;
    expect(without.precedence).toBeUndefined();
  });
});
