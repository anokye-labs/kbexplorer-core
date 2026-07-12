import { describe, expect, it } from 'vitest';

import {
  type Affordance,
  buildJsonLd,
  type CalendarEvent,
  type CalendarModel,
  type Connection,
  type JsonLd,
  type KBConfig,
  type KBEdge,
  type KBGraph,
  type KBNode,
  type NodeLens,
  type NodeSource,
  type NodeSourceFile,
  type ResourceLink,
  STAGING_AREA_REL,
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

  it('keys a person by an opaque alias, with the display name as data/title (not identity)', () => {
    const source: NodeSource = { type: 'person', login: 'ada-gh', linked: true, alias: 'alovelace' };
    const node: KBNode = {
      id: 'kg://directory/alovelace',
      title: 'Ada Lovelace',
      cluster: 'people',
      content: '',
      rawContent: '',
      connections: [],
      source,
      identity: 'kg://directory/alovelace',
      entityType: 'person',
      data: { displayName: 'Ada Lovelace' },
    };

    // The alias is the source-agnostic identity key; login is the back-compat witness.
    expect(source.type === 'person' && source.alias).toBe('alovelace');
    expect(source.type === 'person' && source.login).toBe('ada-gh');
    // The display name lives in title/data — never in the identity.
    expect(node.title).toBe('Ada Lovelace');
    expect(node.data?.displayName).toBe('Ada Lovelace');
    expect(node.identity).toBe('kg://directory/alovelace');
    expect(node.identity).not.toContain('Ada');
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

describe('KBNode affordances / links (baked per-retrieval snapshot)', () => {
  const base: KBNode = {
    id: 'issue-42',
    title: 'Fix the thing',
    cluster: 'work',
    content: '',
    rawContent: '',
    connections: [],
    source: { type: 'issue', number: 42, state: 'open', labels: [] },
  };

  it('omits both fields for a node that carries no retrieval affordances (byte-identical serialization)', () => {
    const serialized = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    expect(Object.keys(serialized)).not.toContain('affordances');
    expect(Object.keys(serialized)).not.toContain('links');
    expect(base.affordances).toBeUndefined();
    expect(base.links).toBeUndefined();
  });

  it('carries an open Affordance[] snapshot and round-trips through JSON unchanged', () => {
    const affordances: Affordance[] = ['read', 'comment', 'close'];
    const node: KBNode = { ...base, affordances };
    const roundTripped = JSON.parse(JSON.stringify(node)) as KBNode;
    expect(roundTripped.affordances).toEqual(['read', 'comment', 'close']);
    // Open union: a custom, source-native affordance beyond read/write/stage.
    const custom: KBNode = { ...base, affordances: ['read', 'request-changes'] };
    expect(custom.affordances).toContain('request-changes');
  });

  it('carries retrieval links (e.g. a staging-area pointer) reusing the source.ts ResourceLink shape', () => {
    const links: ResourceLink[] = [
      { rel: STAGING_AREA_REL, href: 'github://anokye-labs/kbexplorer/pull/7/staging' },
    ];
    const node: KBNode = { ...base, affordances: ['read', 'merge'], links };
    const roundTripped = JSON.parse(JSON.stringify(node)) as KBNode;
    expect(roundTripped.links?.[0]?.rel).toBe('staging-area');
    expect(roundTripped.links?.[0]?.href).toContain('/staging');
  });
});

describe('KBNode lenses / defaultLens (per-node named views)', () => {
  const base: KBNode = {
    id: 'sprint-cal',
    title: 'Sprint calendar',
    cluster: 'planning',
    content: '',
    rawContent: '',
    connections: [],
    source: { type: 'structured', entityType: 'calendar' },
  };

  it('omits both fields for a node that offers no extra lenses (byte-identical serialization)', () => {
    const serialized = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    expect(Object.keys(serialized)).not.toContain('lenses');
    expect(Object.keys(serialized)).not.toContain('defaultLens');
    expect(base.lenses).toBeUndefined();
    expect(base.defaultLens).toBeUndefined();
  });

  it('carries named lenses whose viewer is an open registry key, and a defaultLens selector', () => {
    const lenses: NodeLens[] = [
      { id: 'month', label: 'Month', viewer: 'calendar-month' },
      { id: 'raw', viewer: 'code' },
    ];
    const node: KBNode = { ...base, lenses, defaultLens: 'month' };
    const roundTripped = JSON.parse(JSON.stringify(node)) as KBNode;

    expect(roundTripped.lenses).toHaveLength(2);
    expect(roundTripped.lenses?.[0]).toEqual({
      id: 'month',
      label: 'Month',
      viewer: 'calendar-month',
    });
    // label is optional; viewer is an open string (no widening to a fixed enum).
    expect(roundTripped.lenses?.[1]?.label).toBeUndefined();
    expect(roundTripped.lenses?.[1]?.viewer).toBe('code');
    expect(roundTripped.defaultLens).toBe('month');
  });
});

describe('CalendarModel view-model (Tier 0 pure data)', () => {
  it('stores a calendar model on node.data and declares a matching lens (zero render code)', () => {
    const model: CalendarModel = {
      events: [
        {
          start: '2026-07-11T14:00:00Z',
          end: '2026-07-11T15:00:00Z',
          summary: 'Planning sync',
          location: 'Room 4',
          category: 'meeting',
        },
        { start: '2026-07-12', allDay: true, summary: 'Team offsite' },
      ],
    };
    const node: KBNode = {
      id: 'sprint-cal',
      title: 'Sprint calendar',
      cluster: 'planning',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'structured', entityType: 'calendar' },
      data: { calendar: model },
      lenses: [{ id: 'month', label: 'Month', viewer: 'calendar-month' }],
      defaultLens: 'month',
    };

    const roundTripped = JSON.parse(JSON.stringify(node)) as KBNode;
    const stored = roundTripped.data?.calendar as CalendarModel;
    expect(stored.events).toHaveLength(2);
    expect(stored.events[0]?.summary).toBe('Planning sync');
    expect(stored.events[0]?.category).toBe('meeting');
    expect(stored.events[1]?.allDay).toBe(true);
    // The provider ships only data + a viewer key; core names no component.
    expect(roundTripped.lenses?.[0]?.viewer).toBe('calendar-month');
  });

  it('treats end / allDay / summary / location / category as optional on an event', () => {
    const minimal: CalendarEvent = { start: '2026-07-11' };
    expect(minimal.end).toBeUndefined();
    expect(minimal.allDay).toBeUndefined();
    expect(minimal.summary).toBeUndefined();
    expect(minimal.location).toBeUndefined();
    expect(minimal.category).toBeUndefined();

    const model: CalendarModel = { events: [minimal] };
    expect(model.events).toHaveLength(1);
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

  // Regression pins for PR #31's disclosed-but-untested behavior change
  // (issue #52): the fallback `@id` is now built with `buildAddress`, which
  // takes an `opts` (scheme/authority) argument. These pin CURRENT,
  // post-#31 fallback behavior exactly.
  it('fallback @id honors a configured scheme (5th `opts` argument)', () => {
    const ld = buildJsonLd({ id: 'about' }, 'Thing', {}, undefined, { scheme: 'org-kb' });
    expect(ld['@id']).toBe('org-kb://node/about');
  });

  it('fallback @id honors a configured scheme + authority', () => {
    const ld = buildJsonLd({ id: 'about' }, 'Thing', {}, undefined, {
      scheme: 'org-kb',
      authority: 'directory',
    });
    expect(ld['@id']).toBe('org-kb://directory/node/about');
  });

  it('opts are ignored once the node already carries an identity', () => {
    const ld = buildJsonLd({ id: 'about', identity: 'kg://custom/about' }, 'Thing', {}, undefined, {
      scheme: 'org-kb',
      authority: 'directory',
    });
    expect(ld['@id']).toBe('kg://custom/about');
  });

  it('a malformed configured scheme falls back to the default kg:// fallback', () => {
    const ld = buildJsonLd({ id: 'about' }, 'Thing', {}, undefined, { scheme: 'NOPE!' });
    expect(ld['@id']).toBe('kg://node/about');
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
