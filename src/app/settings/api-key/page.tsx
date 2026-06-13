import ApiKeyPageContent from "@/components/container/api-key/ApiKeyPageContent";
import { listApiKeysAction } from "@/server/actions";

export default async function ApiKeyPage() {
  const result = await listApiKeysAction();

  return (
    <ApiKeyPageContent
      initialRecords={result.success ? result.data : []}
      loadError={result.success ? null : result.error}
    />
  );
}
