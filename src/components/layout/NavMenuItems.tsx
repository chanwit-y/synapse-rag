"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/common/Icon";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const trigger = useCallback((e: MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:currentColor;opacity:0.15;
      transform:scale(0);pointer-events:none;
      animation:sidebar-ripple 500ms ease-out forwards;
    `;
    el.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }, []);

  return { ref, trigger };
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Match the exact route or a nested child (`/settings` → `/settings/api-key`),
  // but not an unrelated sibling that merely shares the prefix (`/doc-archive`).
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navParentButtonClass(active: boolean, height: "h-9" | "h-10") {
  return [
    "group flex w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
    "hover:bg-surface-strong hover:text-foreground",
    height,
    active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
  ].join(" ");
}

type NavMenuItemsProps = {
  collapsed?: boolean;
  animKey?: number;
  variant?: "desktop" | "mobile";
  expandGroupHref?: string | null;
  onExpandNavGroup?: (href: string) => void;
  onExpandGroupConsumed?: () => void;
};

export default function NavMenuItems({
  collapsed = false,
  animKey = 0,
  variant = "desktop",
  expandGroupHref = null,
  onExpandNavGroup,
  onExpandGroupConsumed,
}: NavMenuItemsProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <>
      {NAV_ITEMS.map((item, index) =>
        item.children && item.children.length > 0 ? (
          <NavGroup
            key={`${item.href}-${animKey}`}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            index={index}
            isMobile={isMobile}
            expandGroupHref={expandGroupHref}
            onExpandNavGroup={onExpandNavGroup}
            onExpandGroupConsumed={onExpandGroupConsumed}
          />
        ) : (
          <NavLink
            key={`${item.href}-${animKey}`}
            item={item}
            collapsed={collapsed}
            active={isActive(pathname, item.href)}
            index={index}
            isMobile={isMobile}
          />
        ),
      )}
    </>
  );
}

function NavLink({
  item,
  collapsed,
  active,
  index,
  isMobile,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  index: number;
  isMobile: boolean;
}) {
  const { ref, trigger } = useRipple<HTMLAnchorElement>();
  const { href, label, Icon: ItemIcon } = item;

  return (
    <Link
      ref={ref}
      href={href}
      title={collapsed ? label : undefined}
      data-active={active}
      data-collapsed={collapsed}
      onClick={trigger}
      style={
        isMobile
          ? undefined
          : { animation: `sidebar-enter 400ms ease-out ${index * 60}ms both` }
      }
      className={
        isMobile
          ? "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          : "group relative flex h-9 items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[collapsed=true]:justify-center data-[collapsed=true]:px-0 data-[collapsed=true]:gap-0"
      }
    >
      <ItemIcon
        className={
          isMobile
            ? "h-5 w-5 shrink-0"
            : "h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-125"
        }
      />
      {(!collapsed || isMobile) && (
        <span
          className={
            isMobile
              ? undefined
              : "truncate transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          }
        >
          {label}
        </span>
      )}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  collapsed,
  index,
  isMobile,
  expandGroupHref,
  onExpandNavGroup,
  onExpandGroupConsumed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  index: number;
  isMobile: boolean;
  expandGroupHref?: string | null;
  onExpandNavGroup?: (href: string) => void;
  onExpandGroupConsumed?: () => void;
}) {
  const { href, label, Icon: ItemIcon, children = [] } = item;
  const hasActiveChild = children.some((child) => isActive(pathname, child.href));
  const parentActive = isActive(pathname, href) || hasActiveChild;
  const [expanded, setExpanded] = useState(
    parentActive || expandGroupHref === href,
  );

  useEffect(() => {
    if (parentActive) setExpanded(true);
  }, [parentActive]);

  useEffect(() => {
    if (!collapsed && expandGroupHref === href) {
      setExpanded(true);
      onExpandGroupConsumed?.();
    }
  }, [collapsed, expandGroupHref, href, onExpandGroupConsumed]);

  const isSubmenuOpen =
    expanded || (!collapsed && expandGroupHref === href);

  if (collapsed && !isMobile) {
    return (
      <CollapsedNavGroupButton
        item={item}
        active={parentActive}
        index={index}
        onExpand={() => onExpandNavGroup?.(href)}
      />
    );
  }

  return (
    <div
      className="flex flex-col gap-0.5"
      style={
        isMobile
          ? undefined
          : { animation: `sidebar-enter 400ms ease-out ${index * 60}ms both` }
      }
    >
      <button
        type="button"
        aria-expanded={isSubmenuOpen}
        onClick={() => setExpanded((open) => !open)}
        className={navParentButtonClass(parentActive, isMobile ? "h-10" : "h-9")}
      >
        <ItemIcon
          className={
            isMobile
              ? "h-5 w-5 shrink-0"
              : "h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-125"
          }
        />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <Icon.ChevronDown
          className={`h-4 w-4 shrink-0 transition-[color,transform] duration-300 ease-in-out ${parentActive ? "text-accent-foreground" : "text-muted-foreground"} ${isSubmenuOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      <SubmenuPanel expanded={isSubmenuOpen}>
        {children.map((child) => {
          const childActive = isActive(pathname, child.href);
          const ChildIcon = child.Icon;

          return (
            <Link
              key={child.href}
              href={child.href}
              tabIndex={isSubmenuOpen ? undefined : -1}
              data-active={childActive}
              className={
                isMobile
                  ? "group/sub flex h-10 items-center gap-1.5 rounded-md px-3 py-2 my-0.5 text-sm text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-accent-foreground"
                  : "group/sub flex h-9 items-center gap-1.5 rounded-md px-3 py-1.5 my-0.5 text-sm text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-accent-foreground"
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors group-hover/sub:border-border group-hover/sub:bg-background group-data-[active=true]/sub:border-accent/30 group-data-[active=true]/sub:bg-accent/15 group-data-[active=true]/sub:text-accent-foreground">
                <ChildIcon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{child.label}</span>
            </Link>
          );
        })}
      </SubmenuPanel>
    </div>
  );
}

function CollapsedNavGroupButton({
  item,
  active,
  index,
  onExpand,
}: {
  item: NavItem;
  active: boolean;
  index: number;
  onExpand: () => void;
}) {
  const { ref, trigger } = useRipple<HTMLButtonElement>();
  const { label, Icon: ItemIcon } = item;

  return (
    <button
      ref={ref}
      type="button"
      title={label}
      data-active={active}
      data-collapsed={true}
      onClick={(e) => {
        trigger(e);
        onExpand();
      }}
      style={{ animation: `sidebar-enter 400ms ease-out ${index * 60}ms both` }}
      className="group relative flex h-9 w-full items-center justify-center overflow-hidden rounded-lg px-0 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
    >
      <ItemIcon className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-125" />
    </button>
  );
}

function SubmenuPanel({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!expanded}
      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={`my-2 flex flex-col gap-0.5 rounded-lg border border-border bg-surface-strong p-1.5 transition-[opacity,transform,margin] duration-300 ease-in-out ${
            expanded
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
