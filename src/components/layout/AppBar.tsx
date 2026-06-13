"use client";

import Image from "next/image";
import Icon from "@/components/common/Icon";
import ThemeToggle from "./ThemeToggle";
import logoLight from "@/asset/logo-l.png";
import logoDark from "@/asset/logo-d.png";

export default function AppBar() {
  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 pr-3 backdrop-blur-sm">
      <div className="flex flex-1 h-14 items-center gap-2 px-4">
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
