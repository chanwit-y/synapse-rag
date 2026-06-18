"use client";

import {
  MousePointer2,
  MessageSquarePlus,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  Pencil,
  MapPin,
} from "lucide-react";
import type { NodeKind } from "./types";

type ToolbarProps = {
  onAdd: (kind: NodeKind) => void;
  selectMode: boolean;
  onToggleSelect: () => void;
};

export default function Toolbar({ onAdd, selectMode, onToggleSelect }: ToolbarProps) {
  return (
    <div className="absolute left-5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur">
      <ToolButton
        label="Select tool"
        active={selectMode}
        onClick={onToggleSelect}
        icon={<MousePointer2 size={18} />}
      />
      <div className="mx-2 h-px bg-slate-200" />
      <ToolButton
        label="Add chat"
        onClick={() => onAdd("chat")}
        icon={<MessageSquarePlus size={18} />}
      />
      <ToolButton
        label="Add text editor"
        onClick={() => onAdd("textEditor")}
        icon={<FileText size={18} />}
      />
      <ToolButton
        label="Add image"
        onClick={() => onAdd("image")}
        icon={<ImageIcon size={18} />}
      />
      <ToolButton
        label="Add video"
        onClick={() => onAdd("video")}
        icon={<Video size={18} />}
      />
      <ToolButton
        label="Add links"
        onClick={() => onAdd("links")}
        icon={<Link2 size={18} />}
      />
      <ToolButton
        label="Add draw"
        onClick={() => onAdd("draw")}
        icon={<Pencil size={18} />}
      />
      <ToolButton
        label="Add map"
        onClick={() => onAdd("map")}
        icon={<MapPin size={18} />}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-violet-500 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {icon}
      <span className="pointer-events-none absolute left-12 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
