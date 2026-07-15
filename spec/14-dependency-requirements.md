# Phase 14 — npm dependency requirements audit

Goal: establish a ground-truth record of what modern Dillinger's npm
dependency requirements actually are today — what's pinned, what's
installable, what's vulnerable, and what's safe to patch without
triggering the full framework-major upgrade already tracked in
`spec/12-security-hardening.md` ("P0 - Move to a supported application
stack").

Depends on: none for the audit and in-range patch tasks below. The
Next.js/React major bump remains scoped to spec/12 P0 and is out of
scope here — this phase must not attempt it.

## Investigation

- [x] Confirm `package.json`'s pinned versions match the tech-stack table
      documented in `CLAUDE.md`. Next 14.2.35, React 18, Tailwind 3.4.1,
      Zustand 5.0.10, Monaco 4.7.0 (`@monaco-editor/react`), Lucide
      0.562.0, markdown-it 14.1.0 — all match.
- [x] Run `npm ci` against the committed lockfile. Resolves cleanly, 799
      packages, no install errors.
- [x] Run `npm audit`. 32 known vulnerabilities (21 high, 9 moderate, 2
      low) at baseline. Full breakdown recorded below.
- [x] Run `npm outdated` to compare installed vs. latest for every direct
      dependency.
- [x] Attempt `npm audit fix` (no `--force`, so `package.json` itself
      stays untouched — only the lockfile's transitive resolutions move).
      Result: **regression**. It pulled `vite` from a 7.x line to `8.1.4`
      via the `vitest`/`@vitest/coverage-v8` `^4.x` range, which broke
      the JSX transform for every `.tsx` test file (10 test files went
      from passing to `Failed to parse source for import analysis`
      errors; passing test count dropped 308 → 179). Reverted
      `package-lock.json`; nothing from this attempt was committed.
- [x] Re-run the unit suite against the untouched, committed lockfile to
      establish the true baseline: **3 test files / 10 tests fail**
      (`navbar.test.tsx` export-download assertions, one
      `settings-modal.test.tsx` case, `toast.test.tsx` auto-dismiss
      timing) — pre-existing, unrelated to dependency versions.

## Findings

### Production dependencies with open advisories

| Package | Installed | Fixed by | In-range patch? |
|---|---|---|---|
| `dompurify` | 3.3.1 | 3.4.12 | yes — satisfies `^3.3.1` |
| `markdown-it` | 14.1.0 | 14.3.0 | yes — satisfies `^14.1.0` |
| `postcss` | 8.5.6 | 8.5.19 | yes — satisfies `^8` |
| `markdown-it-toc` | 1.x | none | **no fix available** |
| `breakdance` (→ `cheerio`/`lodash.pick`) | 3.0.1 | none | **no fix available** |
| `next` | 14.2.35 | requires major bump | **no** — scoped to spec/12 P0 |

### Safe in-range bumps identified (not yet applied)

`dompurify`, `markdown-it`, `postcss`, `katex`, `turndown`,
`puppeteer-core`, `zustand`, `tailwind-merge`, `vitest`,
`@vitest/coverage-v8`, `@playwright/test` all have patch/minor releases
available inside their existing `package.json` semver ranges. Unlike the
blanket `npm audit fix`, bumping only these explicitly (not letting npm
also pull `vite` to a new major) should avoid the JSX-transform
regression, but this must be verified per the tasks below rather than
assumed.

### Accepted-risk items (no fix available)

Per spec/12's working rule ("Document any accepted risk with an owner,
reason, expiry date, and review date"):

- **`markdown-it-toc`** — XSS via unescaped TOC title/header content
  (GHSA-wfvx-fx73-3rfj). No upstream fix. Owner: TBD. Reason: low-risk
  in this app because TOC content is markdown authored by the signed-in
  user themselves, not third-party input, and the rendered HTML already
  passes through DOMPurify before `dangerouslySetInnerHTML`. Review by:
  next dependency audit pass.
- **`breakdance`** (→ `cheerio` → `lodash.pick` prototype pollution,
  GHSA-p6mc-m468-83gw) — used for HTML→Markdown import. No upstream fix.
  Owner: TBD. Reason: input is user-supplied HTML pasted/imported by the
  same user, processed client-side, output still sanitized before
  render. Review by: next dependency audit pass; candidate for
  replacement (e.g. `turndown`, already a dependency, covers similar
  ground) if this stays unfixed long-term.
- **`next` 14.2.35 vulnerability range** — tracked separately as spec/12
  P0 "Move to a supported application stack"; not duplicated here.

## Tasks

- [ ] Bump `dompurify`, `markdown-it`, `postcss`, `katex`, `turndown`,
      `puppeteer-core`, `zustand`, `tailwind-merge` to their latest
      in-range patch/minor versions in `package.json`, without touching
      `vite`/`vitest`/`@playwright/test` in the same pass.
- [ ] Regenerate the lockfile and confirm `npm ls vite` still resolves to
      the pre-existing major (no incidental major bump via a shared
      range).
- [ ] Run the full unit suite and confirm the pre-existing 3-file/10-test
      baseline failure count does not increase.
- [ ] Separately evaluate bumping `vitest`, `@vitest/coverage-v8`, and
      `@playwright/test` to their latest in-range versions, verifying
      `vite` stays on its current major after that bump too.
- [ ] Run lint and typecheck; confirm no new errors beyond the documented
      pre-existing `tests/components/github-modal.test.tsx` failures.
- [ ] Commit and push the patch bump once verified green.
- [ ] Assign an owner and review date to the two accepted-risk items
      above (currently TBD) — needs a human decision, not an agent
      default.

## Results log

- 2026-07-15: Audit completed. Baseline vulnerability count (32),
  baseline test failures (3 files/10 tests, pre-existing) recorded.
  `npm audit fix` attempted and reverted after it was found to break the
  Vitest JSX transform via an incidental `vite` major bump. No changes
  committed this pass — safe in-range bump list identified above but not
  yet applied.
