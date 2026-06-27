"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { UserRecord } from "@/components/container/users/types";
import { useLayoutStore } from "@/store/layout-store";
import Sidebar from "./Sidebar";
import AppBar from "./AppBar";
import MobileSidebar from "./MobileSidebar";

function subscribeToMediaQuery(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  return false;
}

export default function LayoutProvider({
  children,
  user = null,
}: {
  children: React.ReactNode;
  /** Current authenticated user, or null on the login screen. */
  user?: UserRecord | null;
}) {
  const pathname = usePathname();
  const theme = useLayoutStore((s) => s.theme);
  const prefersDark = useSyncExternalStore(
    subscribeToMediaQuery,
    getPrefersDark,
    getServerSnapshot,
  );

  const resolvedTheme =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // The login screen renders bare — no sidebar / app bar.
  if (pathname === "/login") {
    return <div className="h-dvh w-full bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar user={user} />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <MobileSidebar />
    </div>
  );
}
