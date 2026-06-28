/**
 * The GraphProvider seam — turns resources (and prior graph fragments) into a
 * pure {@link KBGraph} fragment of nodes + edges.
 *
 * Providers are pluggable: first-party, local ES modules, or third-party
 * packages. A provider declares the affordances it needs from its source(s); the
 * engine resolves providers in dependency order and fails fast if a required
 * affordance is unmet. This module is pure contract — no registry, no engine.
 */
import type { ExternalProviderConfig, KBConfig } from './config.js';
import type { KBEdge, KBNode } from './graph.js';
import type { Affordance, Source } from './source.js';

/** The graph fragment produced by a single provider run. */
export interface ProviderResult {
  nodes: KBNode[];
  edges: KBEdge[];
}

/** Inputs handed to a provider when the engine resolves it. */
export interface ProviderContext {
  /** The knowledge-base configuration. */
  config: KBConfig;
  /** Nodes produced by previously-run providers (for cross-referencing). */
  existingNodes: KBNode[];
  /** Sources available to the provider, keyed by {@link Source.id}. */
  sources?: Record<string, Source>;
}

/** A graph provider produces nodes and edges from one or more sources. */
export interface GraphProvider {
  /** Unique provider identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Provider IDs this provider depends on (resolution ordering). */
  dependencies?: string[];
  /**
   * Affordances this provider requires from its source(s). The engine fails fast
   * if a needed affordance is unmet on retrieval (situational, per-retrieval).
   */
  requiredAffordances?: Affordance[];
  /** Resolve this provider's graph fragment. */
  resolve(context: ProviderContext): Promise<ProviderResult>;
}

/**
 * Builds a {@link GraphProvider} from its {@link ExternalProviderConfig} entry.
 * This is the unit a loadable provider module exposes.
 */
export type ProviderFactory = (config: ExternalProviderConfig) => GraphProvider;

/**
 * A capability a loadable provider may require the host engine to support.
 *
 * Open string union: hosts and providers can negotiate capabilities the core
 * doesn't yet name (the `(string & {})` arm keeps it forward-compatible without
 * a core change), while the listed members document the well-known ones.
 *
 *   - `graph:nodes` — the provider contributes nodes to the graph.
 *   - `graph:edges` — the provider contributes edges to the graph.
 *   - `sources`     — the provider needs the `sources` map on
 *     {@link ProviderContext} (a host that doesn't populate it can't satisfy
 *     such a provider).
 */
export type ProviderCapability =
  | 'graph:nodes'
  | 'graph:edges'
  | 'sources'
  | (string & {});

/**
 * The shape a loadable provider module's default export must satisfy. A consumer
 * dynamic-imports the module by specifier and calls `module.default(config)`.
 *
 * Third-party (e.g. npm-published) providers SHOULD additionally export
 * compatibility metadata so a host can guard against version/capability drift
 * before instantiating the factory — see {@link checkProviderCompatibility}.
 * Both fields are optional and additive: a module that omits them stays valid
 * (it is simply treated as making no compatibility claim).
 */
export interface ProviderModule {
  default: ProviderFactory;
  /**
   * The {@link PROVIDER_API_VERSION provider-contract API version} this module
   * was authored against, as a semver string (e.g. `'1.0.0'`). A host compares
   * the major (and minor) against its own supported version and skips the
   * provider on a mismatch — see {@link checkProviderCompatibility}.
   */
  apiVersion?: string;
  /** Capabilities this provider needs the host engine to support. */
  capabilities?: ProviderCapability[];
}

/**
 * Current version of the loadable-provider contract (the surface a
 * {@link ProviderModule} is authored against). Bumped independently of the
 * package version. Hosts pass this as their supported version when guarding a
 * third-party provider; providers declare the version they target via
 * {@link ProviderModule.apiVersion}.
 *
 * Semantics (semver): a same-major version is compatible; a different major is
 * breaking. A provider may not require a newer minor than the host supports.
 */
export const PROVIDER_API_VERSION = '1.0.0' as const;

/** What a host engine advertises when guarding a loadable provider. */
export interface ProviderHostContract {
  /** The provider-contract API version the host implements. */
  apiVersion?: string;
  /** Capabilities the host engine can satisfy. */
  capabilities?: ProviderCapability[];
}

/** Result of a {@link checkProviderCompatibility} check. */
export interface ProviderCompatibility {
  /** Whether the provider module is safe for the host to instantiate. */
  compatible: boolean;
  /** Human-readable reason when `compatible` is `false`. */
  reason?: string;
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/** Parse the `major.minor.patch` core of a semver string; ignores pre-release. */
function parseSemVer(version: string): SemVer | null {
  const match = /^\s*(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * Validate a loadable provider module against a host's contract version and
 * supported capabilities, returning a structured verdict instead of throwing.
 *
 * Pure: no I/O, no side effects. A host uses this to guard third-party
 * providers before instantiation, surfacing the `reason` (which names the
 * incompatibility) and skipping the provider rather than crashing the build.
 *
 * Rules:
 *   - A module that declares no `apiVersion` makes no version claim and passes
 *     the version check (the version guard is opt-in).
 *   - A malformed `apiVersion` is rejected.
 *   - A different major version is rejected; a same-major module that requires
 *     a newer minor than the host supports is rejected.
 *   - Every capability the module requires must be advertised by the host;
 *     a missing one is rejected and named.
 */
export function checkProviderCompatibility(
  mod: Pick<ProviderModule, 'apiVersion' | 'capabilities'>,
  host: ProviderHostContract = {},
): ProviderCompatibility {
  const hostVersion = host.apiVersion ?? PROVIDER_API_VERSION;

  if (mod.apiVersion !== undefined) {
    const declared = parseSemVer(mod.apiVersion);
    if (!declared) {
      return {
        compatible: false,
        reason: `declares a malformed apiVersion "${mod.apiVersion}" (expected semver like "${hostVersion}")`,
      };
    }
    const supported = parseSemVer(hostVersion);
    if (supported) {
      if (declared.major !== supported.major) {
        return {
          compatible: false,
          reason: `targets provider API v${mod.apiVersion} but the host supports v${hostVersion} (incompatible major version)`,
        };
      }
      if (declared.minor > supported.minor) {
        return {
          compatible: false,
          reason: `targets provider API v${mod.apiVersion} but the host only supports up to v${hostVersion} (newer minor than host)`,
        };
      }
    }
  }

  const supportedCaps = new Set(host.capabilities ?? []);
  if (host.capabilities) {
    const missing = (mod.capabilities ?? []).filter((cap) => !supportedCaps.has(cap));
    if (missing.length > 0) {
      return {
        compatible: false,
        reason: `requires capabilit${missing.length === 1 ? 'y' : 'ies'} the host does not support: ${missing.join(', ')}`,
      };
    }
  }

  return { compatible: true };
}

/**
 * Identity helper that authors wrap their factory in so a module's default
 * export is recognizably a provider entry point and gets full type-checking:
 *
 * ```ts
 * import { defineProvider } from '@anokye-labs/kbexplorer-core';
 * export default defineProvider((config) => ({
 *   id: `my-provider-${config.name ?? 'default'}`,
 *   name: 'My Provider',
 *   async resolve({ existingNodes }) { return { nodes: [], edges: [] }; },
 * }));
 * ```
 *
 * It performs no work at import time — pure contract.
 */
export function defineProvider(factory: ProviderFactory): ProviderFactory {
  return factory;
}
