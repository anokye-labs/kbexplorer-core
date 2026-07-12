import { describe, expect, it } from 'vitest';

import {
  PROVIDER_API_VERSION,
  checkProviderCompatibility,
  type ProviderHostContract,
  type ProviderModule,
} from '../src/index.js';

const host: ProviderHostContract = {
  apiVersion: PROVIDER_API_VERSION,
  capabilities: ['graph:nodes', 'graph:edges'],
};

describe('PROVIDER_API_VERSION', () => {
  it('is a semver string', () => {
    expect(PROVIDER_API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('checkProviderCompatibility', () => {
  it('accepts a module that makes no compatibility claim', () => {
    expect(checkProviderCompatibility({}, host)).toEqual({ compatible: true });
  });

  it('accepts a same-version, satisfiable-capability module', () => {
    expect(
      checkProviderCompatibility(
        { apiVersion: PROVIDER_API_VERSION, capabilities: ['graph:nodes'] },
        host,
      ),
    ).toEqual({ compatible: true });
  });

  it('rejects a different major version and names the mismatch', () => {
    const result = checkProviderCompatibility({ apiVersion: '2.0.0' }, host);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('2.0.0');
    expect(result.reason).toContain(PROVIDER_API_VERSION);
    expect(result.reason).toMatch(/major/);
  });

  it('rejects a same-major module that needs a newer minor than the host', () => {
    const result = checkProviderCompatibility(
      { apiVersion: '1.9.0' },
      { apiVersion: '1.2.0', capabilities: [] },
    );
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/minor/);
  });

  it('rejects a malformed apiVersion', () => {
    const result = checkProviderCompatibility({ apiVersion: 'banana' }, host);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('malformed');
    expect(result.reason).toContain('banana');
  });

  it('rejects a missing capability and names it', () => {
    const result = checkProviderCompatibility(
      { apiVersion: PROVIDER_API_VERSION, capabilities: ['graph:nodes', 'sources'] },
      host,
    );
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('sources');
  });

  it('does not enforce capabilities when the host advertises none', () => {
    expect(
      checkProviderCompatibility(
        { apiVersion: PROVIDER_API_VERSION, capabilities: ['sources'] },
        { apiVersion: PROVIDER_API_VERSION },
      ),
    ).toEqual({ compatible: true });
  });

  it('defaults the host version to PROVIDER_API_VERSION when omitted', () => {
    expect(checkProviderCompatibility({ apiVersion: '2.0.0' })).toEqual({
      compatible: false,
      reason: expect.stringContaining(PROVIDER_API_VERSION),
    });
  });
});

describe('render-contribution degradation (views offer vs viewers requirement)', () => {
  // A host that cannot render at all: advertises only data capabilities.
  const dataOnlyHost: ProviderHostContract = {
    apiVersion: PROVIDER_API_VERSION,
    capabilities: ['graph:nodes', 'graph:edges'],
  };
  // A render-capable host: additionally advertises 'viewers'/'block-renderers'.
  const renderingHost: ProviderHostContract = {
    apiVersion: PROVIDER_API_VERSION,
    capabilities: ['graph:nodes', 'graph:edges', 'viewers', 'block-renderers'],
  };

  it("rejects a 'viewers'-requiring (lens-only) module on the default data-only host", () => {
    const lensOnly: Pick<ProviderModule, 'apiVersion' | 'capabilities'> = {
      apiVersion: PROVIDER_API_VERSION,
      capabilities: ['viewers'],
    };
    const result = checkProviderCompatibility(lensOnly, dataOnlyHost);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('viewers');
  });

  it("accepts the same 'viewers'-requiring module on a host advertising 'viewers'", () => {
    const lensOnly: Pick<ProviderModule, 'apiVersion' | 'capabilities'> = {
      apiVersion: PROVIDER_API_VERSION,
      capabilities: ['viewers'],
    };
    expect(checkProviderCompatibility(lensOnly, renderingHost)).toEqual({
      compatible: true,
    });
  });

  it("passes a module that declares `views` but requires no 'viewers' against BOTH hosts", () => {
    // The `views` declaration is the optional render *offer*, not a requirement:
    // it lives outside `capabilities`, so it never enters the compat check. A
    // data-only host loads the data half and skips the render half; a rendering
    // host resolves the views entry. Both must find the module compatible.
    const dataOrRender: ProviderModule = {
      default: (config) => ({
        id: `p-${config.name ?? 'default'}`,
        name: 'Dual-mode provider',
        async resolve() {
          return { nodes: [], edges: [] };
        },
      }),
      apiVersion: PROVIDER_API_VERSION,
      capabilities: ['graph:nodes'],
      views: './views',
    };

    expect(checkProviderCompatibility(dataOrRender, dataOnlyHost)).toEqual({
      compatible: true,
    });
    expect(checkProviderCompatibility(dataOrRender, renderingHost)).toEqual({
      compatible: true,
    });
    // `views` is a bare specifier (never a component/value) — core only sees it.
    expect(dataOrRender.views).toBe('./views');
    expect(dataOrRender.capabilities).not.toContain('viewers');
  });
});
