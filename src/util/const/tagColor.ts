/**
 * Canonical set of tag chip color keys, shared by the server (which assigns a
 * random one when a tag is created) and the client (which maps a key to Tailwind
 * classes in `components/common/TagBar/tagColor.ts`). Storing a stable *key*
 * rather than a palette index or class string keeps the DB decoupled from both
 * the palette order and the concrete CSS.
 */
export const TAG_COLOR_KEYS = [
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
  "cyan",
  "lime",
  "orange",
  "teal",
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

/** Pick a random color key — used when persisting a brand-new tag. */
export function randomTagColorKey(): TagColorKey {
  return TAG_COLOR_KEYS[Math.floor(Math.random() * TAG_COLOR_KEYS.length)];
}
