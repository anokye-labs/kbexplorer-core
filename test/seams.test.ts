import { describe, expect, it } from 'vitest';

import {
  hasAffordance,
  stagingAreaLink,
  STAGING_AREA_REL,
  type GraphProvider,
  type ProviderContext,
  type Representation,
  type Resource,
  type Source,
} from '../src/index.js';

function stagedFile(): Resource<{ text: string }> {
  return {
    href: 'git://repo/file/notes.md',
    kind: 'file',
    affordances: ['read', 'write', 'stage'],
    links: [{ rel: STAGING_AREA_REL, href: 'git://repo/staging-area' }],
    body: { text: 'hi' },
  };
}

describe('Source / Resource contract', () => {
  it('reads situational affordances off a retrieval', () => {
    const r = stagedFile();
    expect(hasAffordance(r, 'stage')).toBe(true);
    expect(hasAffordance(r, 'merge')).toBe(false);
  });

  it('a staged resource exposes its staging-area link', () => {
    expect(stagingAreaLink(stagedFile())?.href).toBe('git://repo/staging-area');
  });

  it('a read-only resource carries no staging-area link', () => {
    const r: Resource = {
      href: 'manifest://x',
      kind: 'file',
      affordances: ['read'],
      links: [],
      body: null,
    };
    expect(stagingAreaLink(r)).toBeUndefined();
    expect(hasAffordance(r, 'write')).toBe(false);
  });

  it('a Source advertises only a possible (advisory) affordance universe', async () => {
    const source: Source = {
      id: 'local-worktree',
      name: 'Local worktree',
      possibleAffordances: ['read', 'write', 'stage'],
      retrieve: async () => [stagedFile()],
    };
    const [resource] = await source.retrieve({ kind: 'file' });
    // authoritative affordances live on the retrieved resource, not the source
    expect(resource?.affordances).toContain('stage');
  });
});

describe('GraphProvider contract', () => {
  it('declares required affordances and resolves a graph fragment', async () => {
    const provider: GraphProvider = {
      id: 'files',
      name: 'Files',
      requiredAffordances: ['read'],
      resolve: async (_ctx: ProviderContext) => ({ nodes: [], edges: [] }),
    };
    const result = await provider.resolve({ config: {} as never, existingNodes: [] });
    expect(result).toEqual({ nodes: [], edges: [] });
    expect(provider.requiredAffordances).toEqual(['read']);
  });
});

describe('Representation contract', () => {
  it('renders for a target', async () => {
    const rep: Representation = {
      target: 'llm-context',
      render: (_graph, options) => `anchors:${(options?.anchors ?? []).join(',')}`,
    };
    const out = await rep.render(
      { nodes: [], edges: [], clusters: [], related: {} },
      { anchors: ['home'], tokenBudget: 2000 },
    );
    expect(out).toBe('anchors:home');
  });
});
