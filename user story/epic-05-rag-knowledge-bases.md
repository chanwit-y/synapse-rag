# Epic 5 — RAG Knowledge Bases

Define retrieval-augmented-generation knowledge bases ("RAGs"), attach
documents, and embed their content for vector search. (RAG page, `/rag`.)

---

## US-5.1 — Create and manage a RAG

**As an** Administrator, **I want** to create, rename, and delete RAGs,
**so that** I can group documents into searchable knowledge bases.

**Acceptance criteria**
- I can create a RAG with a name and an associated embedding model.
- I can update and delete a RAG.
- Deleting a RAG removes its embedded chunks (`rag_chunks`).

---

## US-5.2 — Attach documents to a RAG

**As an** Administrator, **I want** to link documents (items) to a RAG,
**so that** their content becomes part of that knowledge base.

**Acceptance criteria**
- Items and RAGs have a many-to-many link (`item_rags`).
- I can list the documents currently attached to a RAG.

---

## US-5.3 — Embed document content into chunks

**As an** Administrator, **I want** RAG content to be split and embedded,
**so that** it can be retrieved by semantic similarity.

**Acceptance criteria**
- Content is chunked and embedded with the RAG's configured embedding model.
- Embeddings are stored as float32 BLOBs in `rag_chunks`
  (`embedAndUpsertRagChunks`).
- Re-embedding upserts rather than duplicating chunks.
- Embedding requires a usable embedding model + API key, with a clear error
  when missing (Anthropic has no embeddings API).

---

## US-5.4 — Retrieve the most similar chunks

**As a** Researcher, **I want** retrieval to return the chunks most relevant to
my query, **so that** answers are grounded in the right content.

**Acceptance criteria**
- Similarity is computed with `vec_distance_l2()` over the stored vectors
  (`findSimilarByRagIds`).
- Retrieval can span multiple selected RAGs and returns a top-K set.
