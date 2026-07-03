import { describe, expect, it } from 'vitest';

import type { GraphProvider, ProviderRegistry } from '../src/index.js';

class TemplateLikeProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, GraphProvider>();

  register(provider: GraphProvider): void {
    this.providers.set(provider.id, provider);
  }

  getExecutionOrder(): GraphProvider[] {
    return [...this.providers.values()];
  }

  get(id: string): GraphProvider | undefined {
    return this.providers.get(id);
  }
}

describe('ProviderRegistry', () => {
  it('is structurally compatible with the template-style registry shape', async () => {
    const provider: GraphProvider = {
      id: 'demo-provider',
      name: 'Demo provider',
      async resolve() {
        return { nodes: [], edges: [] };
      },
    };

    const registry: ProviderRegistry = new TemplateLikeProviderRegistry();
    registry.register(provider);

    expect(registry.get(provider.id)).toBe(provider);
    expect(registry.getExecutionOrder()).toEqual([provider]);
  });
});
