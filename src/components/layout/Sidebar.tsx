"use client";

import { useLayoutStore } from "@/store/layout-store";
import Icon from "@/components/common/Icon";
import NavMenuItems from "@/components/layout/NavMenuItems";
import { useEffect, useRef, useState } from "react";

export default function Sidebar() {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const hasHydrated = useLayoutStore((s) => s.hasHydrated);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const [animKey, setAnimKey] = useState(0);
  const [expandGroupHref, setExpandGroupHref] = useState<string | null>(null);
  const skipNextAnimKeyRef = useRef(false);
  const settledRef = useRef(false);

  // Replay the staggered entrance only on user-initiated collapse toggles.
  // The first settled render (after persisted state hydrates) establishes the
  // baseline silently, so the post-hydration width correction doesn't replay
  // the animation or flash the active item.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }
    if (skipNextAnimKeyRef.current) {
      skipNextAnimKeyRef.current = false;
      return;
    }
    setAnimKey((k) => k + 1);
  }, [collapsed, hasHydrated]);

  const handleExpandNavGroup = (href: string) => {
    skipNextAnimKeyRef.current = true;
    setExpandGroupHref(href);
    setSidebarCollapsed(false);
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={`hidden h-full shrink-0 overflow-y-auto border-r border-border bg-surface md:flex md:flex-col data-[collapsed=true]:w-16 data-[collapsed=false]:w-60 ${
        hasHydrated ? "transition-[width] duration-200 ease-out" : ""
      }`}
    >
      <nav className="flex flex-1 flex-col gap-1 p-2 my-2">
        <NavMenuItems
          collapsed={collapsed}
          animKey={animKey}
          expandGroupHref={expandGroupHref}
          onExpandNavGroup={handleExpandNavGroup}
          onExpandGroupConsumed={() => setExpandGroupHref(null)}
        />
      </nav>

      <div className="border-t border-border p-3">
        <div
          data-collapsed={collapsed}
          className="flex items-center gap-3 justify-end data-[collapsed=true]:justify-center"
        >
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground"
          >
            <span
              className={`inline-flex transition-transform duration-300 ease-in-out ${collapsed ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"}`}
            >
              <Icon.PanelLeftClose className="h-5 w-5" />
            </span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes sidebar-ripple{to{transform:scale(1);opacity:0}}
        @keyframes sidebar-enter{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
    </aside>
  );
}
