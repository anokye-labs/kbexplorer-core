# Agents — kbexplorer-core

`@anokye-labs/kbexplorer-core` is the shared-contracts package for the kbexplorer
system: pure types and interface seams consumed by `kbexplorer-cli` and
`kbexplorer-template`. Keep it **dependency-free** and **side-effect-free** — no
runtime engine, no I/O, no rendering. If a change would add a runtime dependency
or a side effect, it probably belongs in a consumer, not here.

## Architecture layers

The kbexplorer stack is intentionally split into three layers so new code lands in
the right place:

- **`kbexplorer-core`** — pure data types and interface seams only (`KBNode`,
  `KBGraph`, `KBConfig`, `Source`, `GraphProvider`, `ProviderRegistry`,
  `GraphStore`, `Representation`). No runtime, no I/O, no rendering, no browser
  coupling.
- **`kbexplorer-engine`** (new) — Node-safe implementation for provider
  orchestration, parsing, identity minting, transforms, content-model building,
  and sqlite-backed `GraphStore` implementations. It depends on `core` and must be
  able to run under plain Node for offline/non-web graph management.
- **Consumers** (`kbexplorer-template`, `kbexplorer-cli`) — platform-specific
  adapters on top of `engine` (browser rendering + React viewers for the
  template; CLI I/O, git/gh access, and LLM extraction for the CLI).

New logic belongs in the layer that owns the behavior. If a change is purely a
contract or seam, it belongs here in `kbexplorer-core`.

## Stack

TypeScript, built with `tsup` (ESM + CJS + `.d.ts`), tested with `vitest`.

## Build / Test

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm run build       # tsup -> dist/
npm test            # vitest run
```

## Compatibility

This package is a contract. Treat every exported type and interface as public
API: additive changes are safe; renames/removals are breaking and must be made in
lockstep with both consumers (`kbexplorer-cli`, `kbexplorer-template`).

## Branch Protection

**Check, don't assume.** The rules below describe the *intended* policy, but a
live audit (anokye-labs/kbexplorer#105) found this repo's `main` currently has
**no branch-protection ruleset configured at all** — the auto-merge workflow's
"GitHub enforces every rule server-side" claim only holds where a rule exists.
Verify actual repo settings (`/rules/branches/main` via the API, or the repo's
Settings → Rules UI) before relying on any of the following as fact:

- **Pull request required** — no direct pushes to `main`.
- **Required status checks** (strict / up-to-date) — `pr-title`, `check-linked-issue`,
  `dependency-review`, `test`.
- **Conversation resolution required** before merge.
- **0 approvals required** — agent PRs auto-merge once green via the `auto-merge`
  workflow. Force pushes and branch deletion are blocked.

Never commit directly to `main`. Never force push.

## Issue-First Workflow

**Every pull request must trace back to a GitHub Issue.**

1. Create an Issue (with a native Issue **Type**: Epic / Feature / Task / Bug).
2. Create a branch and implement.
3. Open a PR that references the issue (e.g. `refs #12`) — closure is a
   separate, post-verification step (see below), not something a PR
   description should trigger automatically.
4. CI goes green → merge. Close the issue explicitly once the merged change has
   been verified, rather than relying on merge-time auto-closing.

Use the **GraphQL API** for issue types, sub-issues, and blocked-by relationships
(the REST API does not support them). Include `GraphQL-Features: sub_issues` for
sub-issue operations.

## GitHub & Work-Item Conventions

These conventions are tool-agnostic and shared across the org's repos — apply
them however you interact with GitHub (`gh` CLI, REST, GraphQL, or an MCP
server); no tool is preferred over another. GraphQL-level capability is
required specifically for sub-issues and blocked-by relationships, since the
REST API cannot express them.

- **`refs #N`, never `closes #N`** in commits/PRs — linking is not closing.
- **Verify before closing.** An issue closes only after its fix has been
  independently verified (tests pass, behavior checked) — never as an
  automatic side effect of a merge or a commit keyword.
- **Conventional Commits** (`type(scope): description`) for every commit.
- For **work-breakdown-structure mechanics** (typed Epic → Feature → Task
  hierarchies, sub-issues, blocked-by edges via GraphQL), see
  `kbexplorer-template`'s `.agents/skills/wbs-builder/` skill rather than
  reinventing the scaffolding here.

## Verification

Run the build and tests before handing back control. If you cannot fully verify a
change, say so explicitly and explain why — never claim "done" with a silent gap.
