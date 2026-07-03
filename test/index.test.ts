import { describe, expect, it } from 'vitest';

import { KBEXPLORER_CORE_VERSION } from '../src/index.js';

declare const require: (id: string) => { version: string };
const pkg = require('../package.json') as { version: string };

describe('@anokye-labs/kbexplorer-core', () => {
  it('matches the package.json version', () => {
    expect(KBEXPLORER_CORE_VERSION).toBe(pkg.version);
  });
});
