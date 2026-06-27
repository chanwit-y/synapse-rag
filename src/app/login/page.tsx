import LoginPageContent from "@/components/container/auth/LoginPageContent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-app relative redirects to avoid open-redirects.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return <LoginPageContent next={safeNext} />;
}
