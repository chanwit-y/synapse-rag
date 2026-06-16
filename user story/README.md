# Synapse RAG — User Stories

This folder captures the product as user stories, grouped one file per **epic**
(feature area). Each story uses the classic form plus acceptance criteria:

> **As a** \<persona\>, **I want** \<goal\>, **so that** \<benefit\>.

Story IDs are `US-<epic>.<n>` (e.g. `US-1.2`). They are derived from the
behaviour in the current codebase, so they describe what the app *does* today
unless explicitly marked **(Planned)**.

## Personas

| Persona | Description |
|---------|-------------|
| **Author** | A knowledge worker who creates and maintains documents — writes markdown, organizes collections/folders, tracks versions. |
| **Researcher** | Asks questions of the knowledge base through RAG chat and reads source documents. |
| **Administrator** | Configures the platform — AI models, API keys, AI-instruction templates, and (planned) users. |
| **Integrator** | Pulls external content in, primarily importing Azure DevOps work items as documents. |

## Epics

1. [Collections & Documents](epic-01-collections-and-documents.md)
2. [Document History & Translation](epic-02-document-history-and-translation.md)
3. [Document Graph View](epic-03-document-graph-view.md)
4. [Azure DevOps Import](epic-04-azure-devops-import.md)
5. [RAG Knowledge Bases](epic-05-rag-knowledge-bases.md)
6. [RAG Chat](epic-06-rag-chat.md)
7. [AI Models & API Keys](epic-07-ai-models-and-api-keys.md)
8. [AI Instructions](epic-08-ai-instructions.md)
9. [Analytics & Users (Planned)](epic-09-analytics-and-users.md)
