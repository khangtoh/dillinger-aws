# Phase 5 — OAuth Cloud-Storage Integrations (optional/stretch)

Goal: wire up Dillinger's optional cloud-storage OAuth integrations against
the deployed Lambda URL. None of this blocks the "Dillinger is running on
Lambda" milestone — the editor works without any of these.

Depends on: Phase 4 (a live Function URL to use as the OAuth redirect base).

- [ ] Set `NEXT_PUBLIC_BASE_URL` Lambda environment variable to the
      deployed Function URL (or custom domain once Phase 4's stretch task
      is done).
- [ ] Ask the user which providers (of GitHub / Dropbox / Google Drive /
      OneDrive / Bitbucket) they actually want enabled — do not register
      OAuth apps speculatively.
- [ ] For each requested provider: register/update the OAuth app's redirect
      URI to `<base-url>/api/<provider>/callback` (this is a user action in
      that provider's developer console — confirm with the user before
      assuming it's done).
- [ ] Set the corresponding client ID/secret as Lambda environment
      variables (or migrate to AWS Secrets Manager if the number of
      secrets grows unwieldy — note the decision here).
- [ ] Redeploy (`sam deploy`) and verify one end-to-end OAuth login/save
      flow per enabled provider.
- [ ] Mark this phase N/A in `spec/README.md` if the user chooses not to
      enable any providers for now.
