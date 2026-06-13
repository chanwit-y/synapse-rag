import RagPageContent from "@/components/container/rag/RagPageContent";
import { listEmbeddingModelsAction, listRagDocumentsAction, listRagsAction } from "@/server/actions";

export default async function RagPage() {
  const [ragsResult, documentsResult, embeddingModelsResult] = await Promise.all([
    listRagsAction(),
    listRagDocumentsAction(),
    listEmbeddingModelsAction(),
  ]);

  return (
    <RagPageContent
      initialRecords={ragsResult.success ? ragsResult.data : []}
      initialDocuments={documentsResult.success ? documentsResult.data : []}
      initialEmbeddingModels={embeddingModelsResult.success ? embeddingModelsResult.data : []}
      loadError={ragsResult.success ? null : ragsResult.error}
    />
  );
}
