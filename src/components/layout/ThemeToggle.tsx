"use client";

import { useLayoutStore } from "@/store/layout-store";
import Ic from "@/components/common/Icon";

export default function ThemeToggle() {
  const theme = useLayoutStore((s) => s.theme);
  const setTheme = useLayoutStore((s) => s.setTheme);

  const isDark = theme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-strong transition-colors duration-200"
    >
      <span
        className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-brand-900/10 transition-transform duration-200 dark:ring-brand-50/10 ${
          isDark ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      >
        {isDark ? (
          <Ic.Moon className="h-3 w-3 text-brand-200" />
        ) : (
          <Ic.Sun className="h-3 w-3 text-amber-500" />
        )}
      </span>
    </button>
  );
}
