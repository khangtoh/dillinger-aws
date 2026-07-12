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
- [ ] Store each provider's client secret in AWS Secrets Manager from the
      outset. Put only the secret ARN/name in Lambda configuration; never
      put secret values in SAM parameters, CloudFormation templates,
      deployment commands, `NEXT_PUBLIC_*` variables, or GitHub variables.
      Client IDs are non-secret configuration and may remain ordinary
      server-side Lambda environment variables.
- [ ] Grant the Lambda execution role `secretsmanager:GetSecretValue` only
      for the exact tenant secret ARN. Add `kms:Decrypt` only when using a
      customer-managed KMS key, scoped to that key and Secrets Manager.
- [ ] Retrieve and cache secrets server-side using the AWS Parameters and
      Secrets Lambda Extension or the AWS SDK. Set a bounded cache TTL so
      rotation takes effect without a redeploy; never log the secret value.
- [ ] Redeploy (`sam deploy`) and verify one end-to-end OAuth login/save
      flow per enabled provider.
- [ ] Mark this phase N/A in `spec/README.md` if the user chooses not to
      enable any providers for now.
