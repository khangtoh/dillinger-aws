# Phase 17 — AI-First / Agent-Native Product Features (AI-1, AI-3, then AI-2)

Goal: make "AI-ready, AI-first, agent-native" true of the product, not
just the `/ai` marketing page copy (Phase 13 Section A/E finding) — a
stable document-state contract (AI-1), real in-editor AI actions behind
the command palette (AI-3), then a follow-on MCP server (AI-2) once the
contract is proven stable.

Depends on: Phase 13 decisions (AI-1 + AI-3 in this phase; AI-2 scoped as
follow-on). AI-3 depends on Phase 15's command palette (UI-5) existing.
AI-2 depends on AI-1 being checked off and unchanged for at least one full
review cycle — do not start AI-2 tasks until AI-1 is done.

> **Visual-system dependency — 2026-07-19:** AI contracts and server behavior
> remain independent of the rebrand, but every visible AI command, loading,
> error, confirmation, and result state must consume the owned semantic theme
> defined in [`20-clean-visual-rebrand.md`](20-clean-visual-rebrand.md). Do not
> introduce new legacy-theme overrides while Phase 20 is pending. Phase 18
> verifies the combined result against the live deployment.

## Working rules

- **AI-1 ships first and is treated as a stability contract**: once
  checked off, changing its shape is a breaking change requiring a new
  version marker, not a silent edit — this is what makes AI-2 safe to
  build against later.
- Any task that sends document content to a third-party model provider
  must go through the same security posture already documented in
  `CLAUDE.md` (server-side route handlers, no secrets in client code,
  `SECURITY.md`) — treat "call an LLM" tasks with the same rigor as the
  existing OAuth route handlers, not as a special case.
- This phase does not modify `infra/` or the Lambda packaging model
  unless a task explicitly says so and cites why (e.g., AI-2's MCP server
  needing its own route or function).

## Clarification pass

- [ ] Confirm which model provider(s) AI-3's in-editor actions will call
      (this is a product/cost decision — if unresolved, default to
      building the feature behind a provider-agnostic server route so the
      choice is swappable, and record that as the interim answer rather
      than blocking).
- [ ] Confirm whether AI-3 needs a new API route under `app/api/` (it
      will, per this repo's existing pattern of server-side route
      handlers for anything touching secrets) and name it
      (`app/api/ai/*`) before writing code.
- [ ] Re-read `app/(content)/ai/page.tsx` in full and list every concrete
      claim it makes (e.g. "AI-ready", "structured for LLMs") so AI-1/AI-3
      can be checked against actually satisfying those claims once shipped
      — either the copy becomes true, or the copy is corrected; don't ship
      a mismatch either way.

## AI-1: document API stability

- [ ] Define a versioned, documented shape for a "document" as seen by an
      external caller — derived from but not identical to the internal
      `Document` type in `lib/types.ts` (internal fields like Monaco
      editor refs must never leak into this contract).
- [ ] Write this contract as a real artifact (e.g. a JSON Schema or
      TypeScript type exported from a dedicated `lib/api-contracts.ts`),
      not just prose — Phase 13's E section is explicit that the
      Astryx "typed API" lesson (constrained, checkable interfaces beat
      documentation) applies here too.
- [ ] Add a version marker (`"v1"`) to the contract so AI-2 or any future
      client can detect breaking changes.
- [ ] Add unit tests asserting the contract shape is derivable from every
      existing `Document` in the store without loss (round-trip test:
      internal → contract → internal preserves the fields that matter).
- [ ] Document the contract's fields and stability guarantee in a
      docstring on the exported type (code-level documentation, not a
      separate doc file — matches this repo's "don't create doc files
      unless asked" convention; the spec file itself is the process
      record, the type's docstring is the contract record).

## AI-3: in-editor AI actions via the command palette

- [ ] Add `app/api/ai/*` route handler(s) implementing the actions
      Phase 13 named as examples: summarize selection, fix formatting,
      generate a heading outline — each taking document text (via the
      AI-1 contract shape) and returning markdown.
- [ ] Add these actions to the Phase 15 command palette (UI-5), each
      calling the new route and inserting/replacing content via the
      existing `insertMarkdownAtCursor`/`updateDocumentBody` store actions
      — no new content-mutation path.
- [ ] Add a loading/error state for palette AI actions using the Astryx
      toast/skeleton primitives already adopted in Phase 15, not a new
      bespoke spinner.
- [ ] Add route-handler tests under `tests/routes/` (matching the existing
      `@vitest-environment node` pattern used for `github.route.test.ts`
      etc.), mocking the model provider call.
- [ ] Add a component test for at least one palette AI action exercising
      the full flow (trigger → loading → inserted content), mocking the
      route response.
- [ ] Verify no API key or provider secret is ever sent to or readable
      from client code — server route handler only, matching this repo's
      existing OAuth secret-handling pattern.
- [ ] Update `app/(content)/ai/page.tsx` copy so every claim it makes is
      now true of the shipped product (per the clarification-pass audit
      of its claims), or correct any claim that overreaches.

## AI-2: MCP server for Dillinger documents (follow-on, gated on AI-1)

- [ ] Confirm AI-1's contract has shipped and been stable through at
      least one full Phase 18 regression pass before starting this
      section.
- [ ] Design the MCP server's transport given the existing stateless,
      per-tenant Lambda model (`ARCHITECTURE.md`): likely a new route
      handler exposed the same way the app itself is (Function URL),
      not a new always-on process, to stay consistent with the "no
      background jobs, freeze/thaw between requests" constraint already
      documented for this runtime.
- [ ] Implement `list_documents`, `read_document`, `write_document`
      MCP tools against the AI-1 contract, with the same DOMPurify/XSS
      sanitization rule (`CLAUDE.md` Security Guidelines) applied to any
      content written back through this path.
- [ ] Add authentication for the MCP endpoint — decide and record whether
      it reuses an existing OAuth session or needs a new token mechanism;
      this is a security-sensitive decision, so if genuinely ambiguous,
      record it as an open question for the user rather than guessing,
      matching this spec set's existing pattern (see Phase 12's "P0"
      items that require explicit human approval for credential changes).
- [ ] Add integration tests exercising the MCP tools end-to-end against a
      test document set.
- [ ] Smoke-test the MCP server against a live tenant deployment (mirrors
      Phase 8's "prove it works when deployed, not just that the build
      succeeded" standard) before checking this section off.

## Verification

- [ ] Run `npm run verify` on the branch with AI-1 + AI-3 complete;
      confirm green before considering AI-2.
- [ ] Check this phase's AI-1/AI-3 boxes off in `spec/README.md`; track
      AI-2 as a separately-dated follow-on entry, not bundled into the
      same completion date.

## Findings

_(append dated entries for AI-1 contract freeze date, AI-3 ship date, and
AI-2 follow-on start date)_
