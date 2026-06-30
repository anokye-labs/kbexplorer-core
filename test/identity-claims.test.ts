import { describe, expect, it } from 'vitest';

import type {
  IdentityClaim,
  KBNode,
  SourceRef,
} from '../src/index.js';

const descriptor: SourceRef = {
  kind: 'github',
  href: 'kg://directory/ada-lovelace',
  resourceKind: 'file',
  role: 'canonical',
};

describe('identity-claims contract', () => {
  it('a node carries identity claims without any merging', () => {
    const claim: IdentityClaim = {
      claim: 'same-as',
      ref: descriptor,
      source: 'directory',
      basis: 'matching corporate alias',
    };
    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'person', login: 'ada', linked: false },
      identity: 'kg://github/ada',
      identityClaims: [claim],
    };
    // identity is untouched: claims are claims, not merges
    expect(node.identity).toBe('kg://github/ada');
    expect(node.identityClaims).toHaveLength(1);
    expect(node.identityClaims?.[0]?.claim).toBe('same-as');
    expect(node.identityClaims?.[0]?.ref.href).toBe('kg://directory/ada-lovelace');
  });

  it('supports negative (differentiated-from) claims and open kinds', () => {
    const claims: IdentityClaim[] = [
      { claim: 'differentiated-from', ref: { kind: 'github', href: 'kg://github/ada-bot' } },
      { claim: 'probably-same', ref: { kind: 'http', href: 'https://example.com/p/1' } },
    ];
    expect(claims[0]?.claim).toBe('differentiated-from');
    expect(claims[1]?.claim).toBe('probably-same');
  });

  it('linkedRefs generalize the legacy person{login,linked} witness', () => {
    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '',
      rawContent: '',
      connections: [],
      // legacy form left as-is (linked: false) — the link is expressed as a ref
      source: { type: 'person', login: 'ada', linked: false, alias: 'ada' },
      linkedRefs: [descriptor],
    };
    expect(node.linkedRefs).toHaveLength(1);
    expect(node.linkedRefs?.[0]?.href).toContain('directory');
  });

  it('a node with no claims is unchanged (back-compatible)', () => {
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
    };
    expect(node.identityClaims).toBeUndefined();
    expect(node.linkedRefs).toBeUndefined();
  });
});
