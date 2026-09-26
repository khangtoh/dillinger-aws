# Phase 22 — TopForm Repository Bootstrap

Goal: TopForm lives in its own private repository, `khangtoh/topform`,
seeded with the full history of this fork. It has working specloop tooling,
TopForm identity in its docs and package, green CI, and deploy targets that
cannot collide with the Dillinger stacks still running from
`khangtoh/dillinger-aws`.

Depends on: none. Repository creation is an owner action: on 2026-09-26 the
cloud session's GitHub integration returned
`403 Resource not accessible by integration` for `POST /user/repos`.

## Tooling

- [x] Install the specloop 0.6.0 skills and `/spec-*` commands into `.claude/` and un-ignore them in `.gitignore` so they are committed
- [x] `specloop check` passes with the TopForm phases (21, 22) indexed and ranked first in `spec/BACKLOG.md`

## Repository

- [ ] (p1) Create the private GitHub repository `khangtoh/topform` with no auto-init commit (owner action)
- [ ] (p1) Push this branch's full history to `khangtoh/topform` as `main` and set it as the default branch
- [ ] Rename the package from `dillinger` to `topform` in `package.json` and `package-lock.json`, then check that `npm ci` and `npm run build` still pass
- [ ] Rewrite the project identity in `README.md` and `CLAUDE.md` for TopForm, keeping the inherited engineering conventions that still apply

## CI and deploy targets

- [ ] Point OIDC trust and docs at the new repo: `infra/bootstrap/bootstrap-account.sh` `REPO`, `infra/bootstrap/README.md`, and the `sub: repo:…` claims in `.github/workflows/README.md`
- [ ] Give TopForm deploys their own `Project` tag, stack prefix, and tenant ids (`infra/template.yaml`, `infra/provision-tenant.sh`, `infra/gateway/deploy-gateway.sh`, `infra/tenants.json`, `.github/workflows/deploy-branch-tenant.yml` branch trigger) so they cannot update Dillinger stacks
- [ ] Choose the CI provider (GitHub Actions default, or Buildkite via `scripts/ci-provider.sh`) and configure the new repository's secrets and variables by name only, recording references in `product/operations/README.md`
- [ ] First CI run on `khangtoh/topform` `main` is green (lint, typecheck, unit, `check:legacy-theme`, and `specloop check`), with the run URL recorded below

## Findings / Results

- 2026-09-26: `mcp__github__create_repository` for private `topform`
  returned HTTP 403 (`Resource not accessible by integration`). All setup
  was committed to `claude/topform-repo-setup-d0q5t3` on
  `khangtoh/dillinger-aws` so it can be pushed to `khangtoh/topform` once
  the owner creates that repository.
- 2026-09-26: `.claude/` was fully gitignored (it was meant for sub-agent
  worktrees). It now ignores `.claude/*` except `commands/` and `skills/`,
  so the specloop agent assets are committed as specloop intends.
