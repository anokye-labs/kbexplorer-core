# Agents — kbexplorer-core

`@anokye-labs/kbexplorer-core` is the shared-contracts package for the kbexplorer
system: pure types and interface seams consumed by `kbexplorer-cli` and
`kbexplorer-template`. Keep it **dependency-free** and **side-effect-free** — no
runtime engine, no I/O, no rendering. If a change would add a runtime dependency
or a side effect, it probably belongs in a consumer, not here.

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

The default branch is protected:

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
3. Open a PR that references the issue (e.g. `Closes #12`).
4. CI goes green → the PR auto-merges (0 approvals), which closes the issue.

Use the **GraphQL API** for issue types, sub-issues, and blocked-by relationships
(the REST API does not support them). Include `GraphQL-Features: sub_issues` for
sub-issue operations.

## Verification

Run the build and tests before handing back control. If you cannot fully verify a
change, say so explicitly and explain why — never claim "done" with a silent gap.
