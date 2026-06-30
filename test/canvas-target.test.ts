import { describe, expect, it } from 'vitest';

import {
  CANVAS_TARGET,
  type Representation,
  type RepresentationTarget,
} from '../src/index.js';

describe('canvas representation target convention', () => {
  it('exposes the agreed canvas target key', () => {
    expect(CANVAS_TARGET).toBe('canvas');
  });

  it("'canvas' is assignable to the open RepresentationTarget union", () => {
    const target: RepresentationTarget = CANVAS_TARGET;
    expect(target).toBe('canvas');
  });

  it('a Representation can render for the canvas target', async () => {
    const rep: Representation = {
      target: CANVAS_TARGET,
      render: (graph) => `canvas:${graph.nodes.length}`,
    };
    const out = await rep.render({ nodes: [], edges: [], clusters: [], related: {} });
    expect(out).toBe('canvas:0');
  });
});
