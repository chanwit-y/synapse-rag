"use client";

import { useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Video, X } from "lucide-react";
import { useCanvas } from "../CanvasContext";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import type { VideoNode as VideoNodeType } from "../types";

/** Extract a YouTube video id from the common URL shapes (watch, youtu.be,
 *  shorts, embed). Returns null when the URL isn't recognisably YouTube. */
function youtubeId(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export default function VideoNode({ id, data, selected }: NodeProps<VideoNodeType>) {
  const { interacting } = useCanvas();
  const notify = useCanvasStore((s) => s.notify);
  const c = nodeColor(data.color);
  const [videoUrl, setVideoUrl] = useState(data.videoUrl);
  const [caption, setCaption] = useState(data.caption);
  const [urlInput, setUrlInput] = useState("");

  const videoId = youtubeId(videoUrl);

  const addVideo = () => {
    const vid = youtubeId(urlInput);
    if (!vid) {
      notify("Not a valid YouTube URL.");
      return;
    }
    setVideoUrl(urlInput.trim());
    setUrlInput("");
  };

  return (
    <div className={`group relative h-full w-full rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout] dark:bg-slate-900 dark:shadow-black/40`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        color="#38bdf8"
      />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5 dark:border-slate-800`}>
        <Video size={15} className="text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{data.title}</span>
      </div>

      {/* Video section */}
      <div className="px-3 pt-3">
        {videoId ? (
          <div className="group relative">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            {/* Pointer guard: while the canvas is being panned/zoomed or this
                node dragged, cover the iframe so the embed can't hijack the
                gesture. Absent at rest, so the video stays fully interactive. */}
            {interacting && <div className="absolute inset-0 z-10" />}
            <button
              onClick={() => setVideoUrl("")}
              className="nodrag absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity hover:bg-slate-900/80 group-hover:opacity-100"
              title="Remove video"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1.5 dark:border-slate-700 dark:bg-slate-800/60">
            <Video size={16} className="ml-1 shrink-0 text-red-500" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addVideo();
              }}
              placeholder="Paste a YouTube URL"
              className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            <button
              onClick={addVideo}
              className="nodrag shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-[11.5px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-slate-600"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Editable caption */}
      <div className="px-4 pb-3 pt-2.5">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption…"
          className="nodrag nowheel w-full bg-transparent text-[12.5px] leading-snug text-slate-500 placeholder:text-slate-400 focus:outline-none dark:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}
