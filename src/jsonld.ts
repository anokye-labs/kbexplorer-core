/**
 * JSON-LD helpers — pure and side-effect-free.
 *
 * The `JsonLd` envelope type itself lives in `./graph` (it is carried by
 * `KBNode.jsonld`); this module adds the small constructor used to build one
 * from a node while preserving the contract that `@id` reuses the identity URN
 * and `@type` is never path-derived.
 */

import type { JsonLd, KBNode } from './graph.js';

/**
 * Build a JSON-LD envelope for a node, reusing its `identity` URN as `@id`.
 * Additive helper — does not mutate the node.
 *
 * The reserved LD keys (`@context` / `@id` / `@type`) are written LAST so that
 * arbitrary `data` properties can never override them — this preserves the
 * contract guarantee that `@id` reuses the identity URN and `@type` is never
 * path-derived.
 */
export function buildJsonLd(
  node: Pick<KBNode, 'id' | 'identity'>,
  type: string | string[],
  data: Record<string, unknown> = {},
  context: JsonLd['@context'] = 'https://schema.org',
): JsonLd {
  return {
    ...data,
    '@context': context,
    '@id': node.identity ?? `kg://node/${node.id}`,
    '@type': type,
  };
}
