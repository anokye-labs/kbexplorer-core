import { describe, expect, it } from 'vitest';

import type {
  PresentationTokens,
  RepresentationOptions,
} from '../src/index.js';

describe('presentation-token contract', () => {
  it('carries typography / cornerRadius / density / spacing as optional intent', () => {
    const tokens: PresentationTokens = {
      typography: { family: 'body', scale: 'comfortable', baseSizePx: 16 },
      cornerRadius: { step: 'large', valuePx: 12 },
      density: 'compact',
      spacing: { unitPx: 4, scale: 'comfortable' },
    };
    expect(tokens.density).toBe('compact');
    expect(tokens.typography?.scale).toBe('comfortable');
    expect(tokens.cornerRadius?.step).toBe('large');
    expect(tokens.spacing?.unitPx).toBe(4);
  });

  it('is open — accepts bespoke target-specific tokens and bespoke step names', () => {
    const tokens: PresentationTokens = {
      cornerRadius: { step: 'squircle' },
      density: 'ultra-compact',
      elevation: 'raised',
    };
    expect(tokens.elevation).toBe('raised');
    expect(tokens.density).toBe('ultra-compact');
  });

  it('an empty token bag is a valid no-op', () => {
    const tokens: PresentationTokens = {};
    expect(Object.keys(tokens)).toHaveLength(0);
  });

  it('flows through RepresentationOptions.presentation', () => {
    const options: RepresentationOptions = {
      anchors: ['home'],
      presentation: { density: 'spacious' },
    };
    expect(options.presentation?.density).toBe('spacious');
  });
});
