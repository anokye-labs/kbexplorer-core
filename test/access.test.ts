import { describe, expect, it } from 'vitest';

import type {
  AccessConfig,
  ExternalRef,
  KBAccessLabel,
  KBConfig,
  KBEdge,
  KBNode,
} from '../src/index.js';

const policy: ExternalRef = { kind: 'http', href: 'https://policy.example/restricted' };

describe('access-label contract', () => {
  it('a node carries a label-only access descriptor', () => {
    const access: KBAccessLabel = {
      classification: 'restricted',
      visibility: 'private',
      labels: ['pii', 'legal-hold'],
      sourcePolicyRef: policy,
    };
    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
      access,
    };
    expect(node.access?.classification).toBe('restricted');
    expect(node.access?.labels).toContain('pii');
    // label only: no principals / canRead anywhere on the type
    expect(node.access?.sourcePolicyRef?.href).toContain('policy.example');
  });

  it('an edge can also carry an access label', () => {
    const edge: KBEdge = {
      from: 'a',
      to: 'b',
      type: 'references',
      description: '',
      source: 'inferred',
      weight: 1,
      access: { classification: 'confidential' },
    };
    expect(edge.access?.classification).toBe('confidential');
  });

  it('AccessConfig declares the redaction boundary and stub policy', () => {
    const cfg: AccessConfig = { redactionBoundary: 'withhold', commitRedactionStubs: false };
    expect(cfg.redactionBoundary).toBe('withhold');
    expect(cfg.commitRedactionStubs).toBe(false);
  });

  it('attaches additively to KBConfig and is optional (default-safe when unset)', () => {
    const base: Pick<KBConfig, 'title' | 'source'> = {
      title: 'KB',
      source: { owner: 'anokye-labs', repo: 'kbexplorer' },
    };
    const withAccess: Pick<KBConfig, 'title' | 'source' | 'access'> = {
      ...base,
      access: { redactionBoundary: 'redact' },
    };
    expect(withAccess.access?.redactionBoundary).toBe('redact');

    const without: Pick<KBConfig, 'title' | 'source' | 'access'> = base;
    // unset → host applies default-safe (withhold); core stores nothing
    expect(without.access).toBeUndefined();
  });

  it('nodes/edges with no access label are unchanged (back-compatible)', () => {
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
    };
    expect(node.access).toBeUndefined();
  });
});
