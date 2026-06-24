"use client";

import { useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Link2, Globe, ExternalLink, X, Plus } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import type { LinkItem, LinksNode as LinksNodeType } from "../types";

/** Normalize a pasted string into a URL (prefixing https:// when no scheme is
 *  present) and pull out the bare hostname for the favicon + default label.
 *  Returns null when it still isn't a parseable URL. */
function parseLink(raw: string): { url: string; host: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return { url: u.toString(), host: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

let linkCounter = 0;
const nextLinkId = () => `lnk-${Date.now()}-${linkCounter++}`;

/** A site favicon via Google's keyless s2 service, falling back to a globe icon
 *  if it fails to load (no network / blocked / unknown host). */
function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* leave host empty → s2 returns a generic icon */
  }
  if (failed) {
    return <Globe size={15} className="shrink-0 text-slate-400" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
      className="h-4 w-4 shrink-0 rounded-sm"
    />
  );
}

export default function LinksNode({ id, data, selected }: NodeProps<LinksNodeType>) {
  const notify = useCanvasStore((s) => s.notify);
  const c = nodeColor(data.color);
  const [title, setTitle] = useState(data.title);
  const [links, setLinks] = useState<LinkItem[]>(data.links);
  const [urlInput, setUrlInput] = useState("");

  const addLink = () => {
    const parsed = parseLink(urlInput);
    if (!parsed) {
      notify("That doesn't look like a valid URL.");
      return;
    }
    setLinks((ls) => [
      ...ls,
      { id: nextLinkId(), url: parsed.url, label: parsed.host },
    ]);
    setUrlInput("");
  };

  const updateLabel = (linkId: string, label: string) =>
    setLinks((ls) => ls.map((l) => (l.id === linkId ? { ...l, label } : l)));

  const removeLink = (linkId: string) =>
    setLinks((ls) => ls.filter((l) => l.id !== linkId));

  return (
    <div className={`group relative flex h-full w-full flex-col rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout] dark:bg-slate-900 dark:shadow-black/40`}>
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={160}
        color="#2dd4bf"
      />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5 dark:border-slate-800`}>
        <Link2 size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none dark:text-slate-100"
        />
      </div>

      {/* Link list */}
      <div className="nodrag nowheel min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {links.length === 0 ? (
          <p className="px-2 py-4 text-center text-[12px] text-slate-400 dark:text-slate-500">
            No links yet — paste one below.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {links.map((l) => (
              <li
                key={l.id}
                className="group/row flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Favicon url={l.url} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <input
                    value={l.label}
                    onChange={(e) => updateLabel(l.id, e.target.value)}
                    className="nodrag min-w-0 bg-transparent text-[12.5px] font-medium text-slate-700 focus:outline-none dark:text-slate-200"
                  />
                  <span className="truncate text-[11px] text-slate-400 dark:text-slate-500" title={l.url}>
                    {l.url}
                  </span>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in a new tab"
                  className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors hover:bg-slate-100 hover:text-sky-600 group-hover/row:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-sky-400"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => removeLink(l.id)}
                  title="Remove link"
                  className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors hover:bg-slate-100 hover:text-rose-500 group-hover/row:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add-link input */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 px-2.5 py-2 dark:border-slate-800">
        <Link2 size={15} className="ml-1 shrink-0 text-slate-400 dark:text-slate-500" />
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addLink();
          }}
          placeholder="Paste a link…"
          className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
        />
        <button
          onClick={addLink}
          title="Add link"
          className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white transition-opacity hover:opacity-90 dark:bg-slate-600"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
