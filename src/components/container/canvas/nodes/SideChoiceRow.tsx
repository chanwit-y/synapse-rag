"use client";

/** Source/target handle labels for the position picker (shared by the text
 *  editor and chat highlight popovers). */
export const SIDE_LABEL: Record<string, string> = {
  highlight: "Highlight",
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
};

/** A labelled row of side-choice chips used inside the position picker. */
export default function SideChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
              value === o
                ? "bg-violet-500 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {SIDE_LABEL[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}
