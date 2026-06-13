import AiModelPageContent from "@/components/container/ai-model/AiModelPageContent";
import { listAiModelsAction, listApiKeysAction } from "@/server/actions";
import { isModelProvider } from "@/server/db/schema/enums";

export default async function AiModelPage() {
  const [modelsResult, apiKeysResult] = await Promise.all([
    listAiModelsAction(),
    listApiKeysAction(),
  ]);

  const apiKeyOptions = apiKeysResult.success
    ? apiKeysResult.data
        .filter((k) => k.status === "active")
        // Only AI-capable providers can back a model (e.g. exclude azure-devops).
        .flatMap((k) =>
          isModelProvider(k.provider)
            ? [{ id: k.id, name: k.name, provider: k.provider }]
            : [],
        )
    : [];

  return (
    <AiModelPageContent
      initialRecords={modelsResult.success ? modelsResult.data : []}
      apiKeyOptions={apiKeyOptions}
      loadError={modelsResult.success ? null : modelsResult.error}
    />
  );
}
