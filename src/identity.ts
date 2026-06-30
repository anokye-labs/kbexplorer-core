/**
 * Identity addresses — canonical, deterministic identifiers that link node and
 * edge representations across providers and layers.
 *
 * An address has the form `<scheme>://<authority>/<body>`:
 *   - the **scheme** is configurable (default `kg`);
 *   - the **authority** is optional and names the system of record an entity is
 *     federated from, so facts from different sources never collide;
 *   - the **body is opaque** — it names a resource and is NOT required to encode
 *     the entity's type, so an entity can be re-typed or re-homed without its
 *     identifier changing. Clients MUST NOT parse the body for meaning.
 *
 * An identity address is ALWAYS reused as a node's `@id`; it is NEVER derived
 * from a file path. Pure and canonical: identical input → byte-identical output,
 * which is what makes re-derivation idempotent and drift checks meaningful.
 *
 * Back-compat: the default scheme stays `kg://`, and {@link buildId} / {@link
 * ID_RE} are retained as **legacy** helpers that encode the type in the body
 * (the historical `kg://<type>/<slug>` form). New code should mint opaque
 * addresses with {@link buildAddress} and carry the type as an attribute
 * (`entityType` / JSON-LD `@type` / `NodeSource` / `data`) instead.
 */

/** The default identity scheme, used when none is configured. */
export const DEFAULT_SCHEME = 'kg';

/** Matches a well-formed URI scheme (lowercase, letter-led). */
export const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/;

/**
 * Configurable parts of an address: a `scheme` (default {@link DEFAULT_SCHEME})
 * and an optional `authority` naming the system of record an entity belongs to.
 * Both accept `undefined` so values recovered by {@link parseAddress} can be
 * passed straight back in under `exactOptionalPropertyTypes`.
 */
export interface AddressingOptions {
  /** Identity scheme, e.g. `kg`, `kb`, `org-kb`. Defaults to `kg`. */
  scheme?: string | undefined;
  /** Optional authority / system-of-record segment, e.g. `directory`, `calendar`. */
  authority?: string | undefined;
}

/** The structural parts recovered from an address by {@link parseAddress}. */
export interface ParsedAddress {
  /** The address scheme (always present; defaults to `kg` when absent on input). */
  scheme: string;
  /** The authority segment, when one was requested and present. */
  authority?: string | undefined;
  /** Opaque remainder after the authority (or the whole path when no authority). */
  body: string;
}

/**
 * Lowercase, ASCII-fold (strip combining marks), and collapse to kebab-case.
 * Deterministic; clamps to 80 chars; empty input becomes `'unknown'`.
 */
export function slugify(input: unknown): string {
  return (
    String(input ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'unknown'
  );
}

/** Normalize an entity-kind into an open registry key (never path-derived). */
export function normalizeType(type: unknown): string {
  const slug = slugify(type);
  return slug === 'unknown' ? 'entity' : slug;
}

/**
 * Normalize a scheme to a valid, lowercased URI scheme, falling back to
 * {@link DEFAULT_SCHEME} when absent or malformed.
 */
export function normalizeScheme(scheme?: unknown): string {
  const s = String(scheme ?? '').trim().toLowerCase();
  return SCHEME_RE.test(s) ? s : DEFAULT_SCHEME;
}

/**
 * Strip a `<scheme>://` prefix from an id (idempotent if absent). With no
 * `scheme` argument any well-formed scheme prefix is removed (so `kg://` keeps
 * working); with an explicit `scheme`, only that scheme is stripped.
 */
export function stripScheme(id: unknown, scheme?: string): string {
  const raw = String(id);
  if (scheme !== undefined) {
    const prefix = `${normalizeScheme(scheme)}://`;
    return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  }
  return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
}

/**
 * Build an opaque identity address `<scheme>://[<authority>/]<body>`.
 *
 * The `body` is treated as **opaque** and is not transformed — it names a
 * resource and MUST NOT encode the entity's type. Callers that want a
 * normalized body can mint one with {@link slugify}. The authority, when given,
 * is slugified so the address stays well-formed.
 */
export function buildAddress(body: unknown, opts: AddressingOptions = {}): string {
  const scheme = normalizeScheme(opts.scheme);
  const authorityRaw = opts.authority == null ? '' : String(opts.authority).trim();
  const authority = authorityRaw ? slugify(authorityRaw) : '';
  const path = authority ? `${authority}/${String(body ?? '')}` : String(body ?? '');
  return `${scheme}://${path}`;
}

/**
 * Parse an address into its parts. By default no meaning is extracted beyond the
 * scheme — the whole path is returned as the opaque `body` (honoring the rule
 * that clients must not parse identifiers for meaning). When `opts.authority` is
 * supplied and the path carries it as the first segment, it is split off so that
 * `buildAddress(body, { scheme, authority })` reproduces the input exactly.
 */
export function parseAddress(
  address: unknown,
  opts: { authority?: string | undefined } = {},
): ParsedAddress {
  const raw = String(address ?? '');
  const match = raw.match(/^([a-z][a-z0-9+.-]*):\/\/([\s\S]*)$/);
  const scheme = match?.[1] ?? DEFAULT_SCHEME;
  let body = match?.[2] ?? raw;
  let authority: string | undefined;
  const wantRaw = opts.authority == null ? '' : String(opts.authority).trim();
  if (wantRaw) {
    const want = slugify(wantRaw);
    if (body === want) {
      authority = want;
      body = '';
    } else if (body.startsWith(`${want}/`)) {
      authority = want;
      body = body.slice(want.length + 1);
    }
  }
  return { scheme, authority, body };
}

/**
 * Build a legacy `kg://<type>/<slug>` identity URN that encodes the type in the
 * body. **Legacy**: retained for back-compat with existing callers. New code
 * should mint opaque, type-independent addresses with {@link buildAddress} and
 * carry the type as an attribute instead.
 */
export function buildId(type: unknown, key: unknown): string {
  return `kg://${normalizeType(type)}/${slugify(key)}`;
}

/**
 * Build the opaque identity body for a person from a corporate alias. The alias
 * — never a display name (display names are not unique within an org) — is the
 * stable, source-agnostic referent for the person.
 */
export function aliasBody(alias: unknown): string {
  return slugify(alias);
}

/**
 * Mint a person's identity address from a corporate alias:
 * `buildAddress(aliasBody(alias), opts)`. The address body is the opaque alias
 * and carries no type; the person's display name is data, not identity.
 */
export function buildPersonAddress(alias: unknown, opts: AddressingOptions = {}): string {
  return buildAddress(aliasBody(alias), opts);
}

/**
 * Build a deterministic edge address
 * `<scheme>://[<authority>/]edge/<from>~<relation>~<to>` from endpoints +
 * relation. Endpoints are scheme-stripped first. With default options the output
 * is the historical `kg://edge/...` form.
 */
export function buildEdgeId(
  fromId: unknown,
  relation: string,
  toId: unknown,
  opts: AddressingOptions = {},
): string {
  const from = stripScheme(fromId);
  const to = stripScheme(toId);
  return buildAddress(`edge/${from}~${relation}~${to}`, opts);
}

/**
 * Matches the legacy `kg://<type>/<slug>` two-segment identity URN. **Legacy**:
 * use {@link ADDRESS_RE} / {@link isAddress} for the general opaque form.
 */
export const ID_RE = /^kg:\/\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Matches any well-formed `<scheme>://<non-empty-body>` address. */
export const ADDRESS_RE = /^[a-z][a-z0-9+.-]*:\/\/.+$/;

/** Type guard: is `value` a well-formed `<scheme>://<body>` address string? */
export function isAddress(value: unknown): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

/** Matches an open lowercase entity-type key (never a path / file extension). */
export const TYPE_RE = /^[a-z][a-z0-9-]*$/;
