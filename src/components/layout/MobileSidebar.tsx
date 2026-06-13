"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/store/layout-store";
import NavMenuItems from "@/components/layout/NavMenuItems";

export default function MobileSidebar() {
  const open = useLayoutStore((s) => s.mobileSidebarOpen);
  const close = useLayoutStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();

  useEffect(() => {
    close(false);
  }, [pathname, close]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        data-open={open}
        onClick={() => close(false)}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-[open=false]:pointer-events-none data-[open=false]:opacity-0 md:hidden"
      />

      {/* Drawer */}
      <aside
        data-open={open}
        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-xl transition-transform duration-200 ease-out data-[open=false]:-translate-x-full md:hidden"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
              N
            </div>
            <span className="text-sm font-semibold text-foreground">
              Next Starter
            </span>
          </div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => close(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          <NavMenuItems variant="mobile" />
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-medium text-foreground">
              CY
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                Chanwit Y.
              </p>
              <p className="truncate text-xs text-muted-foreground">
                user@example.com
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
