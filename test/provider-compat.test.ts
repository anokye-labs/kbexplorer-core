import { describe, expect, it } from 'vitest';

import {
  PROVIDER_API_VERSION,
  checkProviderCompatibility,
  type ProviderHostContract,
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
