import AiInstructionPageContent from "@/components/container/ai-instruction/AiInstructionPageContent";
import { listAiInstructionsAction } from "@/server/actions";

export default async function AiInstructionPage() {
  const result = await listAiInstructionsAction();

  return (
    <AiInstructionPageContent
      initialRecords={result.success ? result.data : []}
      loadError={result.success ? null : result.error}
    />
  );
}
