"use client";

import { useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { encode } from "blurhash";
import { Blurhash } from "react-blurhash";
import { ImageIcon, Upload, X, Maximize2 } from "lucide-react";
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
  const c = nodeColor(data.color);
  const [imageUrl, setImageUrl] = useState(data.imageUrl);
  const [blurHash, setBlurHash] = useState(data.blurHash);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [fullDims, setFullDims] = useState<{ w: number; h: number } | null>(null);
  const [caption, setCaption] = useState(data.caption);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify("That file isn't an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImgLoaded(false);
      setBlurHash(undefined);
      setImageUrl(dataUrl);
      // Encode the blur placeholder for next time the image (re)loads.
      encodeBlurHash(dataUrl).then((h) => h && setBlurHash(h));
    };
    reader.readAsDataURL(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file);
    e.target.value = ""; // allow re-picking the same file
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readImageFile(file);
  };

  return (
    <div className={`group relative h-full w-full rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout]`}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        color="#38bdf8"
      />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5`}>
        <ImageIcon size={15} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">{data.title}</span>
      </div>

      {/* Image section */}
      <div className="px-3 pt-3">
        {imageUrl ? (
          <div className="group relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
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
                src={imageUrl}
                alt={caption}
                onLoad={() => setImgLoaded(true)}
                className={`h-full w-full object-cover transition-opacity duration-500 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
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
              <button
                onClick={() => {
                  setImageUrl("");
                  setBlurHash(undefined);
                  setImgLoaded(false);
                }}
                className="nodrag flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white transition-colors hover:bg-slate-900/80"
                title="Remove image"
              >
                <X size={13} />
              </button>
            </div>
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
                ? "border-sky-400 bg-sky-50"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/60"
            }`}
          >
            <Upload size={18} className="text-slate-400" />
            <span className="text-[12px] font-medium text-slate-500">
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
          placeholder="Add a caption…"
          className="nodrag nowheel w-full bg-transparent text-[12.5px] leading-snug text-slate-500 placeholder:text-slate-400 focus:outline-none"
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
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-200 transition-colors hover:text-rose-500"
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
