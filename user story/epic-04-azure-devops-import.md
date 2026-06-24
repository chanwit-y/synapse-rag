# Epic 4 — Azure DevOps Import

Pull Azure DevOps work-item trees in and turn selected user stories into
documents. (`AzureImportModal`, `azure.service`, `azure.actions`.)

---

## US-4.1 — Authenticate to Azure DevOps with a stored PAT

**As an** Integrator, **I want** the import to use a PAT stored as an API key,
**so that** I don't have to put secrets in environment variables.

**Acceptance criteria**
- The active `Azure DevOps` API key in the DB is resolved as the PAT at request
  time.
- `AZURE_ORG` (and optional `AZURE_PROJECT` / `AZURE_TEAM`) provide defaults.
- A missing PAT or org produces a clear, actionable error.

---

## US-4.2 — Browse the Azure work-item tree

**As an** Integrator, **I want** to browse projects, teams, epics, and their
children, **so that** I can find the user stories I want to import.

**Acceptance criteria**
- I can list projects and teams.
- I can list epics and drill into their child work items.
- The tree is fetched via the Azure REST/WIQL/batch calls in `client.ts`.

---

## US-4.3 — Import selected user stories as documents

**As an** Integrator, **I want** to select user stories and import them into a
collection, **so that** they become editable documents in Synapse.

**Acceptance criteria**
- Selected user stories are created as `items` under a target collection.
- Each imported item gets an initial version in `histories`.
- The work-item HTML description is converted to markdown (via `turndown`).
- Attachments are downloaded, saved locally, and their references rewritten to
  the local paths.
- The import reports success/failure per the `ActionResult` contract.
