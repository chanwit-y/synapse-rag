# Epic 7 — AI Models & API Keys

Register the chat/embedding models the platform can use and the provider
credentials they depend on. (Settings → AI Model, API Key.)

---

## US-7.1 — Manage API keys per provider

**As an** Administrator, **I want** to add, edit, and delete API keys for each
provider, **so that** the platform can call OpenAI, Anthropic, Google, and
Azure DevOps.

**Acceptance criteria**
- I can create/update/delete API keys with a provider and secret value.
- Supported providers include OpenAI, Anthropic, Google, and `Azure DevOps`.
- The single **active** key for a provider is the one used at request time.

---

## US-7.2 — Register AI models

**As an** Administrator, **I want** to register chat and embedding models,
**so that** they appear as choices for chat and for RAG embedding.

**Acceptance criteria**
- I can create/update/delete models with a provider, a type (chat or
  embedding), and a linked API key.
- Models can be listed filtered by type (`listChatModels`,
  `listEmbeddingModels`).
- An active/inactive status controls whether a model is offered.

---

## US-7.3 — Resolve a model's provider and key automatically

**As an** Administrator, **I want** each model to know how to authenticate,
**so that** callers use a uniform interface regardless of provider.

**Acceptance criteria**
- `getChatModelFromDb` / `getEmbeddingsFromDb` resolve the model's provider and
  linked key from the DB and return a LangChain model.
- If no key is linked, the per-provider env fallback key is used.
- Anthropic is not offered as an embedding provider.
- Callers use a uniform `.invoke()` / `.embedDocuments()` regardless of
  provider (Strategy + Registry pattern).
