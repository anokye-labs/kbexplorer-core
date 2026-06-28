/**
 * Optional graph-store contract for content-addressed provider caches.
 *
 * This module defines only the pure seam. Concrete stores (SQLite, memory,
 * remote caches) live in consumers and are injected by the host; the engine can
 * continue to operate without a store.
 */
import type { ProviderResult } from './provider.js';

/** Current version of the graph-store contract surface. */
export const GRAPH_STORE_API_VERSION = '1.0.0' as const;

/** Version prefix for serialized graph-store cache keys. */
export const GRAPH_STORE_CACHE_KEY_VERSION = 'kbgraph-cache-key-v1' as const;

/** Hash algorithms understood by first-party consumers, with an open extension arm. */
export type ContentHashAlgorithm = 'sha256' | (string & {});

/** Digest encodings understood by first-party consumers, with an open extension arm. */
export type ContentHashEncoding = 'hex' | 'base64url' | (string & {});

/**
 * Content digest for the exact bytes that produced a graph-store entry.
 *
 * The core package intentionally does not hash content itself; hosts compute the
 * digest and pass the structured value through this contract.
 */
export interface ContentHash {
  algorithm: ContentHashAlgorithm;
  digest: string;
  encoding?: ContentHashEncoding;
}

/** Well-known cache entry scopes, with an open extension arm for consumers. */
export type GraphStoreCacheScope = 'provider-result' | (string & {});

/**
 * Stable, content-addressed cache key for graph fragments.
 *
 * `contentHash` is required so entries are keyed by input content, not mutable
 * paths or timestamps. `variant` lets a host distinguish additional deterministic
 * inputs such as provider options, feature flags, or schema versions.
 */
export interface GraphStoreCacheKey {
  scope: GraphStoreCacheScope;
  providerId: string;
  contentHash: ContentHash;
  sourceId?: string;
  variant?: string;
}

/** A content dependency recorded for incremental invalidation. */
export interface GraphStoreDependency {
  href: string;
  contentHash: ContentHash;
  sourceId?: string;
}

/** Serializable graph-store record returned by implementations. */
export interface GraphStoreEntry<Value = ProviderResult> {
  key: GraphStoreCacheKey;
  value: Value;
  dependencies?: GraphStoreDependency[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** Record shape accepted by `GraphStore.put`. */
export type GraphStoreWrite<Value = ProviderResult> = Omit<
  GraphStoreEntry<Value>,
  'createdAt' | 'updatedAt'
> &
  Partial<Pick<GraphStoreEntry<Value>, 'createdAt' | 'updatedAt'>>;

/** Selector used for bulk invalidation without exposing a storage backend. */
export interface GraphStoreInvalidation {
  scope?: GraphStoreCacheScope;
  providerId?: string;
  sourceId?: string;
  contentHash?: ContentHash;
  variant?: string;
}

/**
 * Optional graph-store seam implemented by consumers.
 *
 * Implementations should treat keys as content-addressed and deterministic.
 * Return `undefined` for misses; do not synthesize empty graph fragments.
 */
export interface GraphStore<Value = ProviderResult> {
  get(key: GraphStoreCacheKey): Promise<GraphStoreEntry<Value> | undefined>;
  put(entry: GraphStoreWrite<Value>): Promise<void>;
  delete(key: GraphStoreCacheKey): Promise<boolean>;
  invalidate(match: GraphStoreInvalidation): Promise<number>;
}

/** Format a content hash into a canonical, storage-safe string. */
export function formatContentHash(hash: ContentHash): string {
  return `${encodeURIComponent(hash.algorithm)}:${encodeURIComponent(hash.encoding ?? 'hex')}:${encodeURIComponent(hash.digest)}`;
}

/** Format a graph-store cache key into a canonical, storage-safe string. */
export function formatGraphStoreCacheKey(key: GraphStoreCacheKey): string {
  return [
    GRAPH_STORE_CACHE_KEY_VERSION,
    encodeURIComponent(key.scope),
    encodeURIComponent(key.providerId),
    encodeURIComponent(key.sourceId ?? ''),
    formatContentHash(key.contentHash),
    encodeURIComponent(key.variant ?? ''),
  ].join('/');
}
