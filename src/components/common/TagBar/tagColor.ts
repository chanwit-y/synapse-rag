import { TAG_COLOR_KEYS, type TagColorKey } from "@/util/const/tagColor";

/**
 * Tailwind chip classes per color key. Each entry is a self-contained set that
 * works in both light and dark themes. Keys mirror `TAG_COLOR_KEYS`.
 */
const CLASSES: Record<TagColorKey, string> = {
  rose: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  amber: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  sky: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  violet: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  lime: "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30",
  orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  teal: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
};

/** Stable, case-insensitive hash of a name → color key (legacy fallback). */
function keyFromName(name: string): TagColorKey {
  const key = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return TAG_COLOR_KEYS[Math.abs(hash) % TAG_COLOR_KEYS.length];
}

/**
 * Chip classes for a tag. Uses the stored `color` key when present (and valid),
 * otherwise derives a stable color from the name — so legacy tags created before
 * colors were persisted keep their original appearance.
 */
export function tagColorClasses(
  color: string | null | undefined,
  name: string,
): string {
  const key: TagColorKey =
    color && color in CLASSES ? (color as TagColorKey) : keyFromName(name);
  return CLASSES[key];
}
