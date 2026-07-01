import { describe, expect, it } from 'vitest';

import type {
  AccessReviewApproval,
  AccessReviewManifest,
  AccessReviewRecord,
  ExternalRef,
  KBAccessLabel,
  KBEdge,
  KBNode,
  Redaction,
  RedactedField,
  RedactionStage,
} from '../src/index.js';

const policy: ExternalRef = { kind: 'http', href: 'https://policy.example/restricted' };

describe('redaction contract (redact-in-place projection)', () => {
  it('a node carries a redact-in-place projection annotation', () => {
    const redaction: Redaction = {
      boundary: 'redact',
      stage: 'representation',
      reason: { classification: 'restricted', labels: ['pii'] },
      fields: [
        { field: 'title', action: 'retained' },
        { field: 'content', action: 'withheld' },
        { field: 'rawContent', action: 'redacted', placeholder: '[redacted]' },
      ],
      policyRef: policy,
    };
    const node: KBNode = {
      id: 'ada',
      title: 'Ada',
      cluster: 'people',
      content: '',
      rawContent: '[redacted]',
      connections: [],
      source: { type: 'readme' },
      redaction,
    };
    // node keeps its normal shape — no separate redacted view type
    expect(node.title).toBe('Ada');
    expect(node.redaction?.boundary).toBe('redact');
    const stage: RedactionStage = node.redaction!.stage!;
    expect(stage).toBe('representation');
    const byField = Object.fromEntries(
      (node.redaction?.fields ?? []).map((f) => [f.field, f]),
    ) as Record<string, RedactedField>;
    expect(byField.title!.action).toBe('retained');
    expect(byField.content!.action).toBe('withheld');
    expect(byField.rawContent!.placeholder).toBe('[redacted]');
  });

  it('a withheld resource is expressed as a stub', () => {
    const stub: RedactedField[] = [{ field: 'content', action: 'withheld' }];
    const edge: KBEdge = {
      from: 'a',
      to: 'b',
      type: 'references',
      description: '',
      source: 'inferred',
      weight: 1,
      redaction: { boundary: 'withhold', stub: true, fields: stub },
    };
    expect(edge.redaction?.stub).toBe(true);
    expect(edge.redaction?.boundary).toBe('withhold');
  });

  it('nodes/edges with no redaction annotation are unchanged (back-compatible)', () => {
    const node: KBNode = {
      id: 'n',
      title: 'N',
      cluster: 'c',
      content: '',
      rawContent: '',
      connections: [],
      source: { type: 'readme' },
    };
    expect(node.redaction).toBeUndefined();
  });
});

describe('access-review manifest seam (.kbx/access-review.json)', () => {
  const label: KBAccessLabel = {
    classification: 'restricted',
    labels: ['legal-hold'],
    sourcePolicyRef: policy,
  };

  it('a record pairs the label, the review decision, and provenance', () => {
    const record: AccessReviewRecord = {
      ref: 'kg://people/ada',
      label,
      decision: 'withheld',
      boundary: 'withhold',
      stage: 'ingest',
      provenance: { sourceId: 'directory', sourceRefs: [{ kind: 'github', href: 'kg://src/ada' }] },
      note: 'contains PII',
    };
    // decision (what was determined) and boundary (host policy) are separate axes
    expect(record.decision).toBe('withheld');
    expect(record.boundary).toBe('withhold');
    expect(record.stage).toBe('ingest');
    expect(record.label.classification).toBe('restricted');
    expect(record.provenance?.sourceId).toBe('directory');
  });

  it('approval is a seam only (host-recorded, no principal eval in core)', () => {
    const approval: AccessReviewApproval = {
      status: 'approved',
      by: 'security-team',
      ref: policy,
      note: 'reviewed 2026 audit',
    };
    const record: AccessReviewRecord = {
      ref: 'ada',
      label,
      decision: 'redacted',
      approval,
    };
    expect(record.approval?.status).toBe('approved');
    expect(record.approval?.by).toBe('security-team');
  });

  it('a deterministic manifest carries a discriminator, version, and records', () => {
    const manifest: AccessReviewManifest = {
      kind: 'kbx-access-review',
      version: 1,
      records: [
        { ref: 'a', label, decision: 'withheld' },
        { ref: 'b', label, decision: 'redacted' },
      ],
    };
    expect(manifest.kind).toBe('kbx-access-review');
    expect(manifest.version).toBe(1);
    expect(manifest.records).toHaveLength(2);
    // no timestamps anywhere in the committed artifact
    expect(JSON.stringify(manifest)).not.toMatch(/timestamp|createdAt|updatedAt/i);
  });
});
