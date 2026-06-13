"use client";

import Image from "next/image";
import Icon from "@/components/common/Icon";
import ThemeToggle from "./ThemeToggle";
import { useLayoutStore } from "@/store/layout-store";
import logoLight from "@/asset/logo-l.png";
import logoDark from "@/asset/logo-d.png";

export default function AppBar() {
  const toggleMobileSidebar = useLayoutStore((s) => s.toggleMobileSidebar);

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 pr-3 backdrop-blur-sm">
      <div className="flex flex-1 h-14 items-center gap-2 px-4">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground md:hidden"
          aria-label="Toggle sidebar"
        >
          <Icon.Menu className="h-5 w-5" />
        </button>
        <Image
          src={logoDark}
          alt="Logo"
          width={42}
          height={42}
          className="shrink-0 rounded-lg dark:hidden"
        />
        <Image
          src={logoLight}
          alt="Logo"
          width={42}
          height={42}
          className="hidden shrink-0 rounded-lg dark:block"
        />
        <span className="truncate text-lg font-semibold text-foreground">
          Synapse
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
