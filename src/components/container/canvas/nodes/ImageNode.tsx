"use client";

import { useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { encode } from "blurhash";
import { Blurhash } from "react-blurhash";
import { ImageIcon, Loader2, Upload, X, Maximize2 } from "lucide-react";
import { uploadCanvasImageAction } from "@/server/actions";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import type { ImageNode as ImageNodeType } from "../types";

/** Encode an image src (data URL or CORS-enabled remote) to a BlurHash, by
 *  downscaling it onto a small canvas and reading the pixels. */
async function encodeBlurHash(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await img.decode();
    const w = 32;
    const h = Math.max(1, Math.round((32 * img.naturalHeight) / img.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return encode(ctx.getImageData(0, 0, w, h).data, w, h, 4, 3);
  } catch {
    return null;
  }
}

export default function ImageNode({ id, data, selected }: NodeProps<ImageNodeType>) {
  const notify = useCanvasStore((s) => s.notify);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const c = nodeColor(data.color);
  const [title, setTitle] = useState(data.title);
  const [caption, setCaption] = useState(data.caption);
  const imageUrl = data.imageUrl;
  const blurHash = data.blurHash;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [fullDims, setFullDims] = useState<{ w: number; h: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // While an upload is in flight, show the picked file locally (an object URL)
  // so the image appears instantly; we swap to the saved server path on success.
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The src actually rendered: the local preview while uploading, otherwise the
  // saved server path. `displaySrc` is empty when the node has no image yet.
  const displaySrc = preview ?? imageUrl;

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify("That file isn't an image.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    setImgLoaded(true); // the local preview is ready immediately
    // Encode the blur placeholder in parallel with the upload — it's persisted
    // so future loads from the server show it before the image arrives.
    const hashPromise = encodeBlurHash(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadCanvasImageAction(formData);
      if (!result.success) throw new Error(result.error);

      const hash = await hashPromise;
      // Swap to the server path; reset the loaded flag so the BlurHash shows
      // while the (not-yet-cached) server image fetches.
      setImgLoaded(false);
      updateNodeData(id, {
        imageUrl: result.data.path,
        blurHash: hash ?? undefined,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImageFile(file);
    e.target.value = ""; // allow re-picking the same file
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadImageFile(file);
  };

  const removeImage = () => {
    setImgLoaded(false);
    updateNodeData(id, { imageUrl: "", blurHash: undefined });
  };

  return (
    <div className={`group relative h-full w-full rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout] dark:bg-slate-900 dark:shadow-black/40`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        color="#38bdf8"
      />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5 dark:border-slate-800`}>
        <ImageIcon size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== data.title && updateNodeData(id, { title })}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none dark:text-slate-100"
        />
      </div>

      {/* Image section */}
      <div className="px-3 pt-3">
        {displaySrc ? (
          <div className="group relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {blurHash && !imgLoaded && (
                <Blurhash
                  hash={blurHash}
                  width="100%"
                  height="100%"
                  resolutionX={32}
                  resolutionY={32}
                  punch={1}
                  style={{ position: "absolute", inset: 0 }}
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt={caption}
                onLoad={() => setImgLoaded(true)}
                className={`h-full w-full object-cover transition-opacity duration-500 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-900/40 text-white backdrop-blur-[1px]">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[11px] font-medium">Uploading…</span>
                </div>
              )}
            </div>
            {!uploading && (
              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {imageUrl && (
                  <button
                    onClick={() => {
                      setFullDims(null);
                      setShowFull(true);
                    }}
                    className="nodrag flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white transition-colors hover:bg-slate-900/80"
                    title="View full size"
                  >
                    <Maximize2 size={12} />
                  </button>
                )}
                <button
                  onClick={removeImage}
                  className="nodrag flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white transition-colors hover:bg-slate-900/80"
                  title="Remove image"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`nodrag flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 text-center transition-colors ${
              dragOver
                ? "border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-500/10"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/60 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            <Upload size={18} className="text-slate-400 dark:text-slate-500" />
            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Upload or drop image
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Editable caption */}
      <div className="px-4 pb-3 pt-2.5">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption !== data.caption && updateNodeData(id, { caption })}
          placeholder="Add a caption…"
          className="nodrag nowheel w-full bg-transparent text-[12.5px] leading-snug text-slate-500 placeholder:text-slate-400 focus:outline-none dark:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Full-size image modal — portaled past the canvas transform. Shows the
          uncropped image at natural size, capped to the viewport, with its real
          pixel dimensions. */}
      {showFull &&
        imageUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-6 backdrop-blur-sm"
            onClick={() => setShowFull(false)}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={caption}
                onLoad={(e) =>
                  setFullDims({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
              />
              {fullDims && (
                <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-medium text-white">
                  {fullDims.w} × {fullDims.h}
                </span>
              )}
              <button
                onClick={() => setShowFull(false)}
                title="Close"
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-200 transition-colors hover:text-rose-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-rose-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
