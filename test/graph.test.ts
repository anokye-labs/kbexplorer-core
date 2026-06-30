import { describe, expect, it } from 'vitest';

import {
  buildJsonLd,
  type Connection,
  type JsonLd,
  type KBConfig,
  type KBEdge,
  type KBGraph,
  type KBNode,
  type NodeSource,
  type NodeSourceFile,
} from '../src/index.js';

describe('graph contract', () => {
  it('models a minimal well-formed graph', () => {
    const node: KBNode = {
      id: 'home',
      title: 'Home',
      cluster: 'root',
      content: '<p>hi</p>',
      rawContent: '# hi',
      connections: [],
      source: { type: 'readme' },
    };
    const edge: KBEdge = {
      from: 'home',
      to: 'about',
      type: 'references',
      description: 'links to about',
      source: 'inferred',
      weight: 2,
    };
    const graph: KBGraph = {
      nodes: [node],
      edges: [edge],
      clusters: [{ id: 'root', name: 'Root', color: '#fff' }],
      related: { home: ['about'] },
    };

    expect(graph.nodes[0]?.id).toBe('home');
    expect(graph.edges[0]?.relation).toBeUndefined();
    expect(graph.related.home).toEqual(['about']);
  });

  it('admits open display modes, edge types and relations without widening to string', () => {
    const conn: Connection = {
      to: 'x',
      type: 'custom-edge-kind',
      description: 'd',
      relation: 'mentors',
    };
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      display: 'org-chart',
      connections: [conn],
      source: { type: 'file', path: 'a.md' },
    };
    expect(node.display).toBe('org-chart');
    expect(node.connections[0]?.relation).toBe('mentors');
  });

  it('exhaustively types the NodeSource union variants', () => {
    const sources: NodeSource[] = [
      { type: 'authored', file: 'a.md' },
      { type: 'issue', number: 1, state: 'open', labels: [] },
      { type: 'pull_request', number: 2, state: 'closed' },
      { type: 'commit', sha: 'deadbeef' },
      { type: 'file', path: 'src/x.ts' },
      { type: 'readme' },
      { type: 'section', parentSource: { type: 'readme' } },
      { type: 'derived', generator: 'g' },
      { type: 'external', provider: 'wikipedia' },
      { type: 'branch', name: 'main', protected: true },
      { type: 'workflow', path: '.github/workflows/ci.yml' },
      { type: 'repository', owner: 'anokye-labs', repo: 'kbexplorer' },
      { type: 'structured', entityType: 'person', ref: 'ada' },
      { type: 'release', tag: 'v1', prerelease: false },
      { type: 'person', login: 'octocat', linked: true },
    ];
    expect(sources).toHaveLength(15);
  });

  it('accepts yaml, json and markdown as NodeSourceFile.format', () => {
    const yamlFile: NodeSourceFile = {
      path: 'content-model/people/ada.yaml',
      raw: 'name: Ada',
      format: 'yaml',
    };
    const jsonFile: NodeSourceFile = {
      path: 'content-model/people/ada.json',
      raw: '{"name":"Ada"}',
      format: 'json',
    };
    const markdownFile: NodeSourceFile = {
      path: 'docs/intro.md',
      raw: '# Intro',
      format: 'markdown',
    };

    const files = [yamlFile, jsonFile, markdownFile];
    expect(files.map((f) => f.format)).toEqual(['yaml', 'json', 'markdown']);

    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '<h1>Intro</h1>',
      rawContent: '# Intro',
      connections: [],
      source: { type: 'file', path: 'docs/intro.md' },
      sourceFile: markdownFile,
    };
    expect(node.sourceFile?.format).toBe('markdown');
  });
});

describe('buildJsonLd', () => {
  it('reuses the identity URN as @id and writes reserved keys last', () => {
    const ld = buildJsonLd(
      { id: 'home', identity: 'kg://person/ada' },
      'Person',
      { '@id': 'should-be-ignored', name: 'Ada' },
    );
    expect(ld['@id']).toBe('kg://person/ada');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe('Ada');
    expect(ld['@context']).toBe('https://schema.org');
  });

  it('falls back to a kg://node/<id> @id when no identity is set', () => {
    const ld: JsonLd = buildJsonLd({ id: 'about' }, ['Thing', 'CreativeWork']);
    expect(ld['@id']).toBe('kg://node/about');
    expect(ld['@type']).toEqual(['Thing', 'CreativeWork']);
  });
});

describe('config contract', () => {
  it('models a minimal config', () => {
    const config: KBConfig = {
      title: 'kb',
      source: { owner: 'anokye-labs', repo: 'kbexplorer' },
      clusters: { root: { name: 'Root', color: '#fff' } },
      visuals: { mode: 'emoji', fallback: 'none' },
      theme: { default: 'dark' },
      graph: { physics: true, layout: 'force-atlas-2' },
      features: {
        hud: true,
        minimap: true,
        readingTools: true,
        keyboardNav: true,
        sparkAnimation: false,
      },
    };
    expect(config.source.repo).toBe('kbexplorer');
  });

  it('admits the optional identity addressing block', () => {
    const config: KBConfig = {
      title: 'kb',
      source: { owner: 'anokye-labs', repo: 'kbexplorer' },
      identity: {
        scheme: 'org-kb',
        authority: 'directory',
        sourceAuthorities: { calendar: 'calendar', docs: 'documents' },
      },
      clusters: { root: { name: 'Root', color: '#fff' } },
      visuals: { mode: 'emoji', fallback: 'none' },
      theme: { default: 'dark' },
      graph: { physics: true, layout: 'force-atlas-2' },
      features: {
        hud: true,
        minimap: true,
        readingTools: true,
        keyboardNav: true,
        sparkAnimation: false,
      },
    };
    expect(config.identity?.scheme).toBe('org-kb');
    expect(config.identity?.sourceAuthorities?.calendar).toBe('calendar');
  });
});
