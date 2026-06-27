/**
 * Knowledge-base configuration contract (the parsed shape of `config.yaml`).
 *
 * Pure types only — defaults, env resolution, and runtime wiring stay in the
 * consumer (the SPA). The shape is the contract so a config authored for one
 * consumer is understood by another.
 */

/** Visual identity mode. */
export type VisualMode = 'sprites' | 'heroes' | 'emoji' | 'none';

/** Theme preference. */
export type Theme = 'dark' | 'light' | 'sepia';

/** The 16 stop keys of a Fluent brand color ramp ("10".."160"). */
export type FluentBrandRampKey =
  | '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80'
  | '90' | '100' | '110' | '120' | '130' | '140' | '150' | '160';

/**
 * A Fluent brand color ramp keyed by stop ("10".."160"). Typed as `Partial`
 * so configs may omit stops, but keys are constrained to the 16 valid slots
 * (arbitrary keys won't type-check). A complete ramp supplies all 16.
 */
export type FluentBrandRamp = Partial<Record<FluentBrandRampKey, string>>;

/** Content source configuration. */
export interface SourceConfig {
  owner: string;
  repo: string;
  /** content directory within repo (authored mode) */
  path?: string;
  /** default: main */
  branch?: string;
}

/** Optional site branding assets (logo, favicon, etc.). All fields optional/additive. */
export interface BrandingConfig {
  /** Repo-relative path to a logo image. */
  logo?: string;
  /** Repo-relative path to a favicon image. */
  favicon?: string;
  /**
   * Repo-relative path (or absolute URL) to a raw CSS file injected last in
   * <head> at runtime — the "raw escape hatch" for overriding CSS variables the
   * structured token system can't express. When unset, nothing is injected.
   */
  css?: string;
}

/** Configuration for an external provider plugin. */
export interface ExternalProviderConfig {
  /**
   * Provider type identifier. The first-party built-ins are named explicitly;
   * the open `(string & {})` arm lets locally- or third-party-loaded providers
   * declare their own type without a core change. When `module` is set, `type`
   * is advisory (the module's default export determines behavior).
   */
  type: 'wikipedia' | 'orgchart' | 'custom' | (string & {});
  /** Human-readable name. */
  name?: string;
  /** Cluster to assign nodes to. */
  cluster?: string;
  /** Provider-specific options. */
  options?: Record<string, unknown>;
  /**
   * ES-module specifier (bare package name or relative path) whose default
   * export is a {@link ProviderFactory} created with `defineProvider()`. The
   * consumer dynamic-imports it and runs it in dependency order. Enables
   * local (and, later, third-party) providers with no core code change.
   */
  module?: string;
}

/** Full knowledge base configuration (from config.yaml). */
export interface KBConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  source: SourceConfig;
  clusters: Record<
    string,
    {
      name: string;
      color: string;
      /**
       * Optional cluster-scoped Fluent design-token overrides (token name → CSS
       * value), reusing the same shape as `theme.tokens`. Applied only to
       * cluster-scoped surfaces by the consumer; global themes are unaffected.
       */
      tokens?: Partial<Record<string, string>>;
    }
  >;
  visuals: {
    mode: VisualMode;
    fallback: VisualMode;
    hero?: {
      overlay?: 'dark-gradient' | 'light-gradient' | 'none';
      height?: string;
      animation?: 'reveal' | 'fade' | 'none';
    };
    hud?: {
      blurBackground?: boolean;
      blurOpacity?: number;
    };
    graph?: {
      nodeImages?: boolean;
      nodeSizeByConnections?: boolean;
    };
  };
  theme: {
    default: Theme;
    font?: {
      heading?: string;
      body?: string;
      mono?: string;
    };
    /**
     * Global brand color override: either a single seed hex string used to
     * generate a full Fluent brand ramp, or a complete ramp object keyed by
     * stop ("10".."160") used verbatim.
     */
    brand?: string | FluentBrandRamp;
    /**
     * Arbitrary Fluent design-token overrides (token name → CSS value), applied
     * on top of the active base theme.
     */
    tokens?: Partial<Record<string, string>>;
    /**
     * Named custom theme variants. Each variant may specify its own brand
     * (seed hex or ramp), token overrides, and the base theme it derives from.
     */
    themes?: Record<
      string,
      {
        brand?: string | FluentBrandRamp;
        tokens?: Partial<Record<string, string>>;
        base?: 'dark' | 'light';
      }
    >;
    /**
     * Optional repo-relative path to a dedicated theme file in the host repo,
     * fetched at runtime and parsed to the same shape as `config.theme`; merged
     * into the dynamic theme map (the external file wins for same-named keys).
     */
    themesFile?: string;
    /**
     * Optional path/URL to a custom ESM JavaScript module in the host repo that
     * exports a fully-built Fluent theme (or a brand ramp / seed). Dynamically
     * imported at runtime — an explicit, off-by-default opt-in that executes
     * host-provided JavaScript; unset ⇒ no import and a pure no-op.
     */
    moduleUrl?: string;
    /**
     * Name to register a single (unnamed) module-provided theme under so it
     * appears in the cycle/selector. Defaults to `"custom"`.
     */
    moduleThemeName?: string;
  };
  graph: {
    physics: boolean;
    layout: 'force-atlas-2' | 'manual';
  };
  features: {
    hud: boolean;
    minimap: boolean;
    readingTools: boolean;
    keyboardNav: boolean;
    sparkAnimation: boolean;
    /**
     * Show the search palette (Ctrl-K / `/`) and the HUD search buttons.
     * Optional and additive: unset means enabled. Set `false` to opt out
     * entirely.
     */
    search?: boolean;
  };
  branding?: BrandingConfig;
  providers?: ExternalProviderConfig[];
  /**
   * Person-node derivation settings. Controls whether and how work-derived
   * person nodes are materialized from GitHub activity.
   */
  people?: {
    /**
     * Minimum number of active (open) items a GitHub login must appear on
     * (as author or assignee) before a person node is materialized. Default: 1.
     */
    minActiveItems?: number;
  };
  /**
   * Landing-mode configuration. Controls the initial view and HUD state when
   * the user arrives at `/` with no deep-link hash. All sub-fields are optional
   * and additive.
   */
  landing?: {
    /** Which view to land on. Unset is equivalent to `'graph'`. */
    view?: 'reading' | 'overview' | 'graph';
    /** Node ID to land on for `'reading'` and `'graph'`. Ignored for `'overview'`. */
    node?: string;
    /** Initial HUD state for the constellation graph panel. */
    graph?: 'collapsed' | 'expanded';
  };
  bluf?: {
    audio?: string;
    quote?: string;
    duration?: string;
  };
}
