import UsersPageContent from "@/components/container/users/UsersPageContent";
import { listUsersAction } from "@/server/actions";

export default async function UsersSettingsPage() {
  const result = await listUsersAction();

  return (
    <UsersPageContent
      initialRecords={result.success ? result.data : []}
      loadError={result.success ? null : result.error}
    />
  );
}
