import HomeChat from "@/components/container/home/HomeChat";
import { listChatModelsAction, listRagsAction } from "@/server/actions";

export default async function Home() {
  const [ragsResult, chatModelsResult] = await Promise.all([
    listRagsAction(),
    listChatModelsAction(),
  ]);

  const rags = ragsResult.success ? ragsResult.data : [];
  const chatModels = chatModelsResult.success ? chatModelsResult.data : [];

  return <HomeChat rags={rags} chatModels={chatModels} />;
}
