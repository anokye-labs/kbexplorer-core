/**
 * Canonical **view-models** (Tier 0) — stack-free, pure-data model contracts
 * that host-owned "model lenses" render.
 *
 * These are data types in exactly the sense {@link KBGraph} is: no rendering, no
 * styling, no framework, no I/O. A provider can parse a source at resolve time,
 * store one of these models on `node.data`, and declare a lens whose `viewer`
 * names the matching model renderer (e.g. `viewer: 'calendar-month'`) — shipping
 * **zero render code** itself. The host owns the renderer keyed by that viewer
 * string; core owns only the shape of the data it consumes.
 *
 * Tier 0 = the pure-data model tier: no dependency on any UX stack. The concrete
 * viewers that render these models live in a consumer / the view-kit, never here.
 */

/**
 * A single event in a {@link CalendarModel}.
 *
 * Times are plain ISO-8601 strings (core carries no clock and does no timezone
 * math): a date-time like `'2026-07-11T14:00:00Z'`, or a date-only
 * `'2026-07-11'` for an all-day event. When `allDay` is true, `end` (if given)
 * is interpreted per the host's calendar convention; core does not compute
 * durations.
 */
export interface CalendarEvent {
  /** Event start as an ISO-8601 date or date-time string. */
  start: string;
  /**
   * Event end as an ISO-8601 date or date-time string. Absent → a point/instant
   * (or an all-day event spanning a single day when {@link allDay} is true).
   */
  end?: string;
  /**
   * Whether this is an all-day event (date-granularity, no wall-clock time).
   * Absent → treat as a timed event.
   */
  allDay?: boolean;
  /** Short human-readable title/summary of the event. */
  summary?: string;
  /** Free-text location (venue, room, address, or URL). */
  location?: string;
  /**
   * Open category/label for grouping or coloring in the host renderer (e.g.
   * `'meeting'`, `'holiday'`). A plain string; core assigns no semantics.
   */
  category?: string;
}

/**
 * A calendar view-model — an ordered-or-unordered collection of
 * {@link CalendarEvent}s a host renders through a calendar viewer (e.g. a
 * `'calendar-month'` lens). Pure data: a provider builds this at resolve time
 * and stores it on `node.data`; no rendering lives here.
 */
export interface CalendarModel {
  events: CalendarEvent[];
}
