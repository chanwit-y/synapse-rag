import SharePointSettingsContent from "@/components/container/sharepoint/SharePointSettingsContent";
import { listApiKeysAction } from "@/server/actions";

export default async function SharePointSettingsPage() {
  const result = await listApiKeysAction();
  const records = result.success
    ? result.data.filter((r) => r.provider === "sharepoint")
    : [];

  return (
    <SharePointSettingsContent
      initialRecords={records}
      loadError={result.success ? null : result.error}
    />
  );
}
