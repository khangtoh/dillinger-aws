# Phase 3 — Containerize Dillinger for Lambda

Goal: a container image that runs Dillinger's Next.js server behind the AWS
Lambda Web Adapter, buildable and smoke-testable locally without AWS
credentials.

Depends on: Phase 2 decisions locked.

- [ ] Vendor/clone the upstream `joemccann/dillinger` app source into this
      repo (or add as a documented subtree/submodule — record the chosen
      approach here).
- [ ] Add `output: 'standalone'` to `next.config.mjs`.
- [ ] Create `Dockerfile` (Lambda-targeted) that:
      - builds the Next.js app in a builder stage,
      - copies `.next/standalone`, `.next/static`, and `public/` into the
        runtime stage,
      - copies the AWS Lambda Web Adapter binary from
        `public.ecr.aws/awsguru/aws-lambda-adapter` into
        `/opt/extensions/lambda-adapter`,
      - sets `ENTRYPOINT`/`CMD` to run `node server.js`.
- [ ] Add a `.dockerignore` (node_modules, .git, spec/, tests/) to keep the
      build context small.
- [ ] Set required adapter env vars in the Dockerfile/template: `PORT=3000`,
      `AWS_LWA_PORT=3000`.
- [ ] Build the image locally: `docker build -t dillinger-lambda .` and
      confirm it builds successfully.
- [ ] Smoke-test locally using the Lambda Runtime Interface Emulator
      (`docker run -p 9000:8080 dillinger-lambda`) and confirm a synthetic
      invoke against `/2015-03-31/functions/function/invocations` returns a
      200 response for `/`.
- [ ] Document the local build/test commands in this file under a
      "Local verification" section once they're confirmed working.

## Local verification

_(fill in confirmed commands + sample output once verified)_
