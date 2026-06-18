"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MapPin, X, ExternalLink, Copy } from "lucide-react";
import { useCanvas } from "../CanvasContext";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import type { MapNode as MapNodeType } from "../types";

type Parsed = { lat: number; lng: number; zoom: number; name: string | null };

/** Pull a place out of a Google Maps URL. Tries, in order: the place pin
 *  (`!3d<lat>!4d<lng>`), the viewport (`@lat,lng,zoomz`), then `?q=lat,lng`.
 *  Returns null for links without coordinates (e.g. shortened maps.app.goo.gl,
 *  which can't be resolved without a backend). */
export function parseMapsUrl(raw: string): Parsed | null {
  const url = raw.trim();
  if (!url) return null;

  let lat: number | null = null;
  let lng: number | null = null;
  let zoom = 14;

  const place = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const viewport = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/);
  const query = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  if (place) {
    lat = parseFloat(place[1]);
    lng = parseFloat(place[2]);
    // The viewport zoom often frames a different point than the pin, so prefer
    // a sensible close zoom; only borrow the viewport zoom when there's no pin.
  } else if (viewport) {
    lat = parseFloat(viewport[1]);
    lng = parseFloat(viewport[2]);
    zoom = Math.round(parseFloat(viewport[3]));
  } else if (query) {
    lat = parseFloat(query[1]);
    lng = parseFloat(query[2]);
  }

  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const nameMatch = url.match(/\/place\/([^/@]+)/);
  let name: string | null = null;
  if (nameMatch) {
    try {
      name = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
    } catch {
      name = nameMatch[1].replace(/\+/g, " ");
    }
  }

  return { lat, lng, zoom, name };
}

/** Keyless embeddable map src (OpenStreetMap — Google blocks framing of its
 *  keyless embed). A small bbox around the point gives an appropriate zoom.
 *  bbox/marker use literal commas — OSM's embed.html ignores a %2C-encoded
 *  bbox and falls back to a world view. */
function embedSrc({ lat, lng, zoom }: Parsed) {
  const delta = 360 / Math.pow(2, Math.min(Math.max(zoom, 1), 19));
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export default function MapNode({ id, data, selected }: NodeProps<MapNodeType>) {
  const { interacting } = useCanvas();
  const notify = useCanvasStore((s) => s.notify);
  const [mapUrl, setMapUrl] = useState(data.mapUrl);
  const [title, setTitle] = useState(data.title);
  const [caption, setCaption] = useState(data.caption);
  const [urlInput, setUrlInput] = useState("");
  const [showLink, setShowLink] = useState(false);

  const parsed = mapUrl ? parseMapsUrl(mapUrl) : null;
  const c = nodeColor(data.color);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(mapUrl);
      notify("Map link copied.");
    } catch {
      notify("Couldn't copy the link.");
    }
  };

  const addMap = () => {
    const next = urlInput.trim();
    const p = parseMapsUrl(next);
    if (!p) {
      notify("Couldn't read a location from that Google Maps link.");
      return;
    }
    setMapUrl(next);
    if (p.name) setTitle(p.name);
    setUrlInput("");
  };

  return (
    <div className={`group relative flex h-full w-full flex-col rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout]`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={200}
        color="#f43f5e"
      />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5`}>
        <MapPin size={15} className="shrink-0 text-rose-500" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Map section */}
      <div className={`px-3 pt-3 ${parsed ? "flex min-h-0 flex-1 flex-col" : ""}`}>
        {parsed ? (
          <div className="group relative min-h-0 flex-1">
            <div className="h-full min-h-[140px] w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-100">
              <iframe
                src={embedSrc(parsed)}
                title={title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full"
              />
            </div>
            {/* Pointer guard during pan/zoom/drag so the map iframe doesn't
                hijack the gesture; absent at rest so the map stays interactive. */}
            {interacting && <div className="absolute inset-0 z-10" />}
            <button
              onClick={() => setMapUrl("")}
              className="nodrag absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity hover:bg-slate-900/80 group-hover:opacity-100"
              title="Clear map"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1.5">
            <MapPin size={16} className="ml-1 shrink-0 text-rose-500" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addMap();
              }}
              placeholder="Paste a Google Maps URL"
              className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              onClick={addMap}
              className="nodrag shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-[11.5px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Caption + open-in-maps */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-2.5">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption…"
          className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[12.5px] leading-snug text-slate-500 placeholder:text-slate-400 focus:outline-none"
        />
        {parsed && (
          <button
            onClick={() => setShowLink(true)}
            title="Show map link"
            className="nodrag flex shrink-0 items-center gap-1 text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700"
          >
            <ExternalLink size={12} /> Maps
          </button>
        )}
      </div>

      {/* Map-link modal — portaled to the body so the canvas zoom/pan transform
          doesn't scale it; shows the original Google Maps URL with copy/open. */}
      {showLink &&
        parsed &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={() => setShowLink(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                  <MapPin size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-slate-800">
                    {title || "Map link"}
                  </h2>
                  <p className="text-[11px] text-slate-400">Map preview</p>
                </div>
                <button
                  onClick={() => setShowLink(false)}
                  title="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-100">
                <iframe
                  src={embedSrc(parsed)}
                  title={title || "Map"}
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[440px] w-full"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Copy size={13} /> Copy link
                </button>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-600"
                >
                  <ExternalLink size={13} /> Open in Google Maps
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
