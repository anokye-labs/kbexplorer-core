import { describe, expect, it } from 'vitest';

import type {
  ContentHash,
  Derivation,
  KBEdge,
  KBNode,
  SourceRef,
} from '../src/index.js';

const inputV1: SourceRef = {
  kind: 'git',
  href: 'git://repo/file/people/ada.yaml',
  resourceKind: 'file',
  contentHash: { algorithm: 'sha256', digest: 'aaa' },
};

describe('Derivation contract (observed vs derived)', () => {
  it('marks an observed fact straight from a source', () => {
    const d: Derivation = { mode: 'observed' };
    expect(d.mode).toBe('observed');
    expect(d.inputs).toBeUndefined();
  });

  it('records a derived fact with generator + inputs', () => {
    const d: Derivation = {
      mode: 'derived',
      generator: 'link-extractor@1',
      inputs: [inputV1],
    };
    expect(d.mode).toBe('derived');
    expect(d.generator).toBe('link-extractor@1');
    expect(d.inputs?.[0]?.contentHash?.digest).toBe('aaa');
  });

  it('detects a stale derived fact when an input content hash changes', () => {
    const before: Derivation = { mode: 'derived', generator: 'g', inputs: [inputV1] };
    const inputV2: SourceRef = { ...inputV1, contentHash: { algorithm: 'sha256', digest: 'bbb' } };
    const after: Derivation = { mode: 'derived', generator: 'g', inputs: [inputV2] };

    const hashOf = (d: Derivation) =>
      (d.inputs ?? []).map((i) => i.contentHash?.digest).join(',');
    // change is detectable purely from inputs — no timestamps involved
    expect(hashOf(before)).not.toBe(hashOf(after));
    const sameAgain: Derivation = { mode: 'derived', generator: 'g', inputs: [{ ...inputV1 }] };
    expect(hashOf(before)).toBe(hashOf(sameAgain));
  });

  it('the mode union is open for bespoke modes', () => {
    const d: Derivation = { mode: 'imported' };
    expect(d.mode).toBe('imported');
  });

  it('a node and edge can carry a derivation additively', () => {
    const node: KBNode = {
      id: 'summary',
      title: 'Summary',
      cluster: 'docs',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'derived', generator: 'summarizer' },
      derived: true,
      derivation: { mode: 'derived', generator: 'summarizer@2', inputs: [inputV1] },
    };
    const edge: KBEdge = {
      from: 'a',
      to: 'b',
      type: 'derived_from',
      description: 'computed',
      source: 'inferred',
      weight: 1,
      derivation: { mode: 'derived', generator: 'g', inputs: [inputV1] },
    };
    expect(node.derivation?.mode).toBe('derived');
    expect(edge.derivation?.inputs).toHaveLength(1);
  });

  it('a fact with no derivation is still valid (back-compatible)', () => {
    const _hash: ContentHash = { algorithm: 'sha256', digest: 'x' };
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
    };
    expect(node.derivation).toBeUndefined();
  });
});
