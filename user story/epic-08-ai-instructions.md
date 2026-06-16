# Epic 8 — AI Instructions

Author reusable system-prompt templates that shape how the chat assistant
behaves. (Settings → AI Instruction, `ai_instructions` table.)

---

## US-8.1 — Manage instruction templates

**As an** Administrator, **I want** to create, edit, and delete named
instruction templates, **so that** I can curate reusable assistant behaviors.

**Acceptance criteria**
- I can create a template with a name, description, and content.
- Name is required; an empty name is rejected with a validation message.
- I can update and delete an existing template.

---

## US-8.2 — Activate/deactivate a template

**As an** Administrator, **I want** to mark templates active or inactive,
**so that** only relevant templates appear in the chat picker.

**Acceptance criteria**
- A template has an active/inactive status.
- Only active templates are returned to the chat instruction picker
  (`listActive`).

---

## US-8.3 — Use a template as a chat system prompt

**As a** Researcher, **I want** to pick a template in chat,
**so that** the assistant follows that instruction.

**Acceptance criteria**
- The selected template's `content` is resolved (`getContent`) and used as the
  system prompt for the conversation.
- Selecting an invalid/missing template surfaces a clear error.

> Cross-reference: consumed by [US-6.3](epic-06-rag-chat.md).
