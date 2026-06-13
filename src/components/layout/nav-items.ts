import Icon from "@/components/common/Icon";
import type { ComponentType, SVGProps } from "react";

export type NavSubItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  children?: NavSubItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: Icon.Home },
  { href: "/document", label: "Document", Icon: Icon.FileText },
  { href: "/rag", label: "RAG", Icon: Icon.Database },
  {
    href: "/settings",
    label: "Setting",
    Icon: Icon.Settings,
    children: [
      { href: "/settings/ai-model", label: "AI Model", Icon: Icon.Cpu },
      { href: "/settings/api-key", label: "API Key", Icon: Icon.Key },
    ],
  },
];
