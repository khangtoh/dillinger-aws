# Vendored upstream source

The Next.js application in this repo (`app/`, `components/`, `hooks/`,
`lib/`, `public/`, `stores/`, `tests/`, and related root config files)
is vendored from upstream:

- Source: https://github.com/joemccann/dillinger
- Commit: 17010b79c18553cf9c1757c297e128f9b950c9be
- Commit date: 2026-06-07T20:17:28-07:00
- Vendored on: 2026-07-10T05:09:16Z

Intentionally **not** vendored (unrelated to the Lambda web deployment):
- `packages/cli`, `packages/mcp` — separate standalone tools, not part of
  the Next.js app / npm workspace.
- `.agent/`, `.impeccable.md`, `tasks/`, `.github/` — upstream's own
  dev-process/CI tooling; this repo has its own under `spec/` and will get
  its own CI in Phase 7.
- `vercel.json` — upstream's Vercel deployment config; not applicable here.

To refresh: re-clone upstream at a newer commit, re-copy the same paths, and
update this file's commit/date.
