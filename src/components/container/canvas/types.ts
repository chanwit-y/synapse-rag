import type { Node } from "@xyflow/react";

/** A highlight inside a text-editor or chat node, paired 1:1 with the child node
 *  it spawned. Keyed by that child's id (`nodeId`) → anchors the source handle
 *  `highlight-<nodeId>` for the edge `parent → child`. Stored as character
 *  offsets (robust to remounts; the phrase is kept for spawn text + re-finding
 *  the seed). Created only at spawn time; removed when its paired node/edge is
 *  deleted. */
export type Highlight = {
  /** The paired child node's id. */
  nodeId: string;
  /** For a chat-node highlight, the id of the message the offsets are within.
   *  Absent for a text-editor highlight (offsets are into the single paragraph). */
  messageId?: string;
  start: number;
  end: number;
  phrase: string;
};

export type TextEditorNodeData = {
  title: string;
  /** Plain paragraph content rendered into the contentEditable body. */
  paragraph: string;
  /** Saved highlights — one per spawned child, each anchoring its own edge. */
  highlights?: Highlight[];
  /** Convenience seed: a phrase highlighted on first load. Migrated into
   *  `highlights` on mount, paired to the child read off the seeded edge. */
  initialHighlight?: string;
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
};

export type ChatNodeData = {
  title: string;
  messages: ChatMessage[];
  /** When true, the node auto-runs a typing → canned-reply pass on mount
   *  (used by an "Ask AI" spawn so the seeded question gets answered live). */
  pending?: boolean;
  /** Saved highlights — one per spawned child, anchored within an AI message. */
  highlights?: Highlight[];
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

/** A node accent color (picked from the palette). Tints the header + border.
 *  Absent / "default" keeps the neutral slate look. */
export type NodeColor =
  | "default"
  | "violet"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "teal"
  | "indigo";

export type ImageNodeData = {
  title: string;
  caption: string;
  /** Uploaded image as a data URL (or a remote URL for the seeded demo). */
  imageUrl: string;
  /** BlurHash of the image, shown as a placeholder while the image loads.
   *  Encoded from the file on upload; precomputed for the seeded demo image. */
  blurHash?: string;
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

export type VideoNodeData = {
  title: string;
  caption: string;
  /** A YouTube URL pasted into the node; embedded as an iframe. */
  videoUrl: string;
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

/** One link inside a Links node. `label` defaults to the URL's hostname on add
 *  and is inline-editable; `url` is the normalized (scheme-prefixed) target. */
export type LinkItem = {
  id: string;
  url: string;
  label: string;
};

export type LinksNodeData = {
  title: string;
  /** The links held by this node — a node can carry many. */
  links: LinkItem[];
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

/** One freehand stroke in a Draw node. `points` is a flat list of x,y pairs in
 *  the node's fixed 0–1000 internal coordinate space (rendered through an SVG
 *  viewBox that fills the body, so the sketch scales with NodeResizer). */
export type Stroke = {
  id: string;
  /** Ink color (a hex from the pen palette). */
  color: string;
  /** Stroke width in internal units. */
  width: number;
  /** Flat [x0, y0, x1, y1, …] in 0–1000 space. */
  points: number[];
};

export type DrawNodeData = {
  title: string;
  /** The freehand strokes making up the sketch. */
  strokes: Stroke[];
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

export type MapNodeData = {
  title: string;
  caption: string;
  /** A Google Maps URL pasted into the node; coordinates are parsed out of it
   *  and embedded as a keyless iframe. Kept verbatim for the "Open in Maps" link. */
  mapUrl: string;
  /** Accent color picked from the palette (tints header + border). */
  color?: NodeColor;
};

export type TextEditorNode = Node<TextEditorNodeData, "textEditor">;
export type ChatNode = Node<ChatNodeData, "chat">;
export type ImageNode = Node<ImageNodeData, "image">;
export type VideoNode = Node<VideoNodeData, "video">;
export type LinksNode = Node<LinksNodeData, "links">;
export type DrawNode = Node<DrawNodeData, "draw">;
export type MapNode = Node<MapNodeData, "map">;

export type AppNode =
  | TextEditorNode
  | ChatNode
  | ImageNode
  | VideoNode
  | LinksNode
  | DrawNode
  | MapNode;

export type NodeKind = AppNode["type"];
