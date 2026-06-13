import DocumentPageContent from "@/components/container/DocumentPageContent";
import { listCollectionsAction } from "@/server/actions";

export default async function DocumentPage() {
  const result = await listCollectionsAction();

  return (
    <DocumentPageContent
      initialCollections={result.success ? result.data : []}
      loadError={result.success ? null : result.error}
    />
  );
}
