/**
 * The presentation-token contract — host-neutral design tokens a render target
 * may surface beyond raw colors.
 *
 * Targets like `spa` (and a host-embedded `canvas`) need richer presentation
 * choices than the brand/accent colors already carried by {@link PageTheme} and
 * {@link Cluster} tokens: typography, corner radius, density and spacing. Today
 * those live as hardcoded constants inside the template. This module promotes
 * them to an OPEN, optional contract — exactly like the affordance and relation
 * taxonomies — so any consumer can advertise deep design choice without editing
 * core, and so two render targets describe the same intent the same way.
 *
 * Design contract (deliberate):
 *
 *  • Every field is optional and every union is OPEN (`(string & {})`). Absent
 *    tokens mean "inherit the active theme"; an empty `PresentationTokens` is a
 *    no-op. This keeps the contract additive and back-compatible.
 *
 *  • These are *intent* tokens, not CSS. Core never renders. A token like
 *    `density: 'compact'` is a portable design choice; the consumer maps it to
 *    concrete Fluent tokens / CSS for its target. Raw escape hatches
 *    (`typography.scale`, `spacing.unit`, `cornerRadius.value`) carry an
 *    explicit value when a named step is not enough.
 *
 *  • Pure types only — no engine, no styling constants, no I/O.
 */

/** Named typographic scale steps, open for bespoke scales. */
export type TypographyScale =
  | 'compact'
  | 'comfortable'
  | 'spacious'
  | (string & {});

/**
 * Typography tokens. `family` names a font stack/role (resolved by the
 * consumer, never a literal CSS value contract); `scale` selects a named step;
 * `baseSizePx` / `lineHeight` are explicit escape hatches when a step is not
 * enough.
 */
export interface TypographyTokens {
  /** Font family/role key resolved by the consumer (e.g. `'body'`, `'mono'`). */
  family?: string;
  /** Named scale step. */
  scale?: TypographyScale;
  /** Explicit base font size in px (escape hatch). */
  baseSizePx?: number;
  /** Explicit unitless line height (escape hatch). */
  lineHeight?: number;
  [key: string]: unknown;
}

/** Named corner-radius steps, open for bespoke radii. */
export type CornerRadiusStep =
  | 'none'
  | 'small'
  | 'medium'
  | 'large'
  | 'pill'
  | (string & {});

/**
 * Corner-radius tokens. `step` selects a named radius; `valuePx` is the
 * explicit escape hatch when a named step is not enough.
 */
export interface CornerRadiusTokens {
  /** Named radius step. */
  step?: CornerRadiusStep;
  /** Explicit radius in px (escape hatch). */
  valuePx?: number;
  [key: string]: unknown;
}

/** Named density steps, open for bespoke densities. */
export type Density = 'compact' | 'comfortable' | 'spacious' | (string & {});

/**
 * Spacing tokens. `unitPx` sets the base spacing unit a target multiplies;
 * `scale` records a named rhythm. Both are optional intent hints.
 */
export interface SpacingTokens {
  /** Base spacing unit in px the consumer multiplies for its scale. */
  unitPx?: number;
  /** Named spacing rhythm. */
  scale?: 'compact' | 'comfortable' | 'spacious' | (string & {});
  [key: string]: unknown;
}

/**
 * The open presentation-token bag a render target may surface.
 *
 * All fields are optional; the index signature keeps the contract OPEN so
 * consumers can carry target-specific tokens (e.g. `elevation`, `motion`)
 * without editing core. Mirrors the loose shape of {@link RepresentationOptions}.
 */
export interface PresentationTokens {
  /** Typographic intent. */
  typography?: TypographyTokens;
  /** Corner-radius intent. */
  cornerRadius?: CornerRadiusTokens;
  /** Density intent. */
  density?: Density;
  /** Spacing intent. */
  spacing?: SpacingTokens;
  [key: string]: unknown;
}
