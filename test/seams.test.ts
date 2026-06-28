import { describe, expect, it } from 'vitest';

import {
  defineProvider,
  formatContentHash,
  formatGraphStoreCacheKey,
  hasAffordance,
  stagingAreaLink,
  GRAPH_STORE_API_VERSION,
  GRAPH_STORE_CACHE_KEY_VERSION,
  STAGING_AREA_REL,
  type ContentHash,
  type ExternalProviderConfig,
  type GraphProvider,
  type GraphStore,
  type GraphStoreCacheKey,
  type ProviderContext,
  type ProviderModule,
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

describe('ProviderFactory / defineProvider contract', () => {
  it('returns the factory unchanged (pure identity) and builds a provider', () => {
    const factory = defineProvider((config: ExternalProviderConfig) => ({
      id: `example-${config.name ?? 'default'}`,
      name: 'Example',
      async resolve(_ctx: ProviderContext) {
        return { nodes: [], edges: [] };
      },
    }));

    const provider = factory({ type: 'custom', name: 'demo' });
    expect(provider.id).toBe('example-demo');
    expect(provider.name).toBe('Example');
  });

  it('a module default export satisfies ProviderModule', () => {
    const mod: ProviderModule = {
      default: defineProvider(() => ({
        id: 'mod',
        name: 'Mod',
        async resolve() {
          return { nodes: [], edges: [] };
        },
      })),
    };
    expect(typeof mod.default).toBe('function');
  });

  it('accepts an open custom type and a module specifier on the config', () => {
    const config: ExternalProviderConfig = {
      type: 'my-bespoke-source',
      module: './providers/my-bespoke-source.js',
    };
    expect(config.type).toBe('my-bespoke-source');
    expect(config.module).toBe('./providers/my-bespoke-source.js');
  });
});

describe('GraphStore contract', () => {
  const contentHash: ContentHash = {
    algorithm: 'sha256',
    digest: 'abc123',
  };

  const key: GraphStoreCacheKey = {
    scope: 'provider-result',
    providerId: 'files',
    sourceId: 'local-worktree',
    contentHash,
    variant: 'provider-options:v1',
  };

  it('formats content hashes and cache keys deterministically', () => {
    expect(GRAPH_STORE_API_VERSION).toBe('1.0.0');
    expect(formatContentHash(contentHash)).toBe('sha256:hex:abc123');
    expect(formatGraphStoreCacheKey(key)).toBe(
      `${GRAPH_STORE_CACHE_KEY_VERSION}/provider-result/files/local-worktree/sha256:hex:abc123/provider-options%3Av1`,
    );
  });

  it('allows a consumer-owned store to cache content-addressed provider results', async () => {
    const records = new Map<string, Awaited<ReturnType<GraphStore['get']>>>();
    const store: GraphStore = {
      async get(cacheKey) {
        return records.get(formatGraphStoreCacheKey(cacheKey));
      },
      async put(entry) {
        records.set(formatGraphStoreCacheKey(entry.key), entry);
      },
      async delete(cacheKey) {
        return records.delete(formatGraphStoreCacheKey(cacheKey));
      },
      async invalidate(match) {
        let removed = 0;
        for (const [recordKey, record] of records) {
          if (
            record &&
            (match.providerId === undefined || record.key.providerId === match.providerId) &&
            (match.sourceId === undefined || record.key.sourceId === match.sourceId)
          ) {
            records.delete(recordKey);
            removed += 1;
          }
        }
        return removed;
      },
    };

    await store.put({ key, value: { nodes: [], edges: [] } });
    expect(await store.get(key)).toMatchObject({ value: { nodes: [], edges: [] } });
    await expect(store.invalidate({ providerId: 'files' })).resolves.toBe(1);
    await expect(store.get(key)).resolves.toBeUndefined();
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
