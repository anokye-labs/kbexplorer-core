import { describe, expect, it } from 'vitest';

import type {
  ContentHash,
  Evidence,
  ExternalRef,
  KBEdge,
  KBNode,
  SourceRef,
} from '../src/index.js';

const hash: ContentHash = { algorithm: 'sha256', digest: 'abc123' };

const sourceRef: SourceRef = {
  kind: 'github',
  href: 'https://github.com/anokye-labs/kbexplorer/blob/main/people/ada.yaml',
  resourceKind: 'file',
  contentHash: hash,
  role: 'primary',
};

describe('SourceRef / provenance contract', () => {
  it('a SourceRef is a host-neutral ExternalRef with optional detail', () => {
    const base: ExternalRef = sourceRef;
    expect(base.kind).toBe('github');
    expect(sourceRef.resourceKind).toBe('file');
    expect(sourceRef.contentHash?.digest).toBe('abc123');
    expect(sourceRef.role).toBe('primary');
  });

  it('the minimal ExternalRef needs only kind + href', () => {
    const ref: SourceRef = { kind: 'http', href: 'https://example.com/x' };
    expect(ref.resourceKind).toBeUndefined();
    expect(ref.contentHash).toBeUndefined();
  });

  it('a node carries provenance additively without touching its required source', () => {
    const evidence: Evidence = { ref: sourceRef, note: 'declared in frontmatter' };
    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'authored', file: 'people/ada.md' },
      sourceId: 'content-model',
      sourceRefs: [sourceRef],
      evidence: [evidence],
    };
    expect(node.source.type).toBe('authored');
    expect(node.sourceId).toBe('content-model');
    expect(node.sourceRefs).toHaveLength(1);
    expect(node.evidence?.[0]?.ref.href).toContain('ada.yaml');
  });

  it('an edge can carry one or more SourceRefs', () => {
    const edge: KBEdge = {
      from: 'ada',
      to: 'team',
      type: 'references',
      description: 'member of',
      source: 'frontmatter',
      weight: 1,
      sourceRefs: [sourceRef, { kind: 'git', href: 'git://repo/commit/deadbeef', resourceKind: 'commit' }],
    };
    expect(edge.sourceRefs).toHaveLength(2);
  });

  it('a node with no provenance is still valid (back-compatible)', () => {
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
    };
    expect(node.sourceRefs).toBeUndefined();
    expect(node.evidence).toBeUndefined();
  });
});
