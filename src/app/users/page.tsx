import { redirect } from "next/navigation";

// User management now lives under Settings.
export default function UsersPage() {
  redirect("/settings/users");
}
