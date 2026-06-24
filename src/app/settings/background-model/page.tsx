import BackgroundModelPageContent from "@/components/container/background-model/BackgroundModelPageContent";
import { getBackgroundModelSettingAction, listChatModelsAction } from "@/server/actions";

export default async function BackgroundModelPage() {
  const [settingResult, modelsResult] = await Promise.all([
    getBackgroundModelSettingAction(),
    listChatModelsAction(),
  ]);

  const modelOptions = modelsResult.success
    ? modelsResult.data
        .filter((m) => m.status === "active")
        .map((m) => ({
          id: m.id,
          name: m.name,
          modelId: m.modelId,
          provider: m.provider,
        }))
    : [];

  return (
    <BackgroundModelPageContent
      initialModelId={settingResult.success ? settingResult.data.modelId : null}
      modelOptions={modelOptions}
      loadError={settingResult.success ? null : settingResult.error}
    />
  );
}
