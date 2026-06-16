import HomeChat from "@/components/container/home/HomeChat";
import {
  listActiveAiInstructionsAction,
  listChatModelsAction,
  listRagsAction,
} from "@/server/actions";

export default async function Home() {
  const [ragsResult, chatModelsResult, instructionsResult] = await Promise.all([
    listRagsAction(),
    listChatModelsAction(),
    listActiveAiInstructionsAction(),
  ]);

  const rags = ragsResult.success ? ragsResult.data : [];
  const chatModels = chatModelsResult.success ? chatModelsResult.data : [];
  const instructions = instructionsResult.success ? instructionsResult.data : [];

  return (
    <HomeChat rags={rags} chatModels={chatModels} instructions={instructions} />
  );
}
