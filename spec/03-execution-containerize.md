# Phase 3 — Containerize Dillinger for Lambda

Goal: a container image that runs Dillinger's Next.js server behind the AWS
Lambda Web Adapter, buildable and smoke-testable locally without AWS
credentials.

Depends on: Phase 2 decisions locked.

- [x] Vendor/clone the upstream `joemccann/dillinger` app source into this
      repo (or add as a documented subtree/submodule — record the chosen
      approach here). Done: plain snapshot copy (not a submodule, to keep
      the Lambda build self-contained) at commit
      `17010b79c18553cf9c1757c297e128f9b950c9be`; see `VENDOR.md` for what
      was/wasn't vendored and how to refresh.
- [x] Add `output: 'standalone'` to `next.config.mjs`.
- [x] Create `Dockerfile` (Lambda-targeted) that:
      - builds the Next.js app in a builder stage,
      - copies `.next/standalone`, `.next/static`, and `public/` into the
        runtime stage,
      - copies the AWS Lambda Web Adapter binary from
        `public.ecr.aws/awsguru/aws-lambda-adapter` into
        `/opt/extensions/lambda-adapter`,
      - sets `ENTRYPOINT`/`CMD` to run `node server.js`.
- [x] Add a `.dockerignore` (node_modules, .git, spec/, tests/) to keep the
      build context small.
- [x] Set required adapter env vars in the Dockerfile/template: `PORT=3000`,
      `AWS_LWA_PORT=3000`.
- [ ] Build the image locally: `docker build -t dillinger-lambda .` and
      confirm it builds successfully. **Blocked in this sandboxed dev
      environment**: its egress policy denies `docker build`/`docker pull`
      access to the CDN hosts both Docker Hub and Amazon ECR Public
      redirect blob downloads to (`production.cloudfront.docker.com`,
      `*.cloudfront.net`) — confirmed via
      `curl $HTTPS_PROXY/__agentproxy/status`, `recentRelayFailures` shows
      `403` policy denials for both hosts. Per this environment's proxy
      guidance, that is a policy denial to report, not route around. This
      task needs to run somewhere with normal registry access — e.g. the
      Phase 7 GitHub Actions runner, or the user's own machine — the first
      time Phase 4 is executed there.
- [ ] Smoke-test locally using the Lambda Runtime Interface Emulator
      (`docker run -p 9000:8080 dillinger-lambda`) and confirm a synthetic
      invoke against `/2015-03-31/functions/function/invocations` returns a
      200 response for `/`. Blocked on the same Docker-pull restriction as
      above.
- [x] Document the local build/test commands in this file under a
      "Local verification" section once they're confirmed working.

## Local verification

Docker image build/run is blocked in this sandbox (see above), but the
underlying Next.js standalone server — the exact process the container
runs via `CMD ["node", "server.js"]` — was verified directly:

```
npm ci
npm run build                     # succeeds, output: 'standalone' produces .next/standalone
cd .next/standalone
cp -r ../static .next/static
cp -r ../../public public
PORT=3005 HOSTNAME=127.0.0.1 node server.js
```

Results:
- `GET /` → `200`, full HTML document rendered
- `GET /_next/static/css/<hash>.css` → `200`
- `GET /this-route-does-not-exist` → `404`

This confirms the app half of the container works; only the actual image
build (`docker build`) and the Lambda Web Adapter layer remain unverified
until run in an environment with unrestricted registry access.
