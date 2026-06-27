import { describe, expect, it } from 'vitest';

import { KBEXPLORER_CORE_VERSION } from '../src/index.js';

describe('@anokye-labs/kbexplorer-core', () => {
  it('exposes a contract version', () => {
    expect(KBEXPLORER_CORE_VERSION).toBe('0.0.0');
  });
});
