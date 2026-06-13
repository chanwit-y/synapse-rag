"use client";

import { diffLines, type Change } from "diff";

function splitLines(text: string) {
  return (text ?? "").replace(/\r\n/g, "\n").split("\n");
}

function toLineChanges(changes: Change[]) {
  const lines: Array<{ type: "add" | "del" | "same"; text: string }> = [];

  for (const ch of changes) {
    const type: "add" | "del" | "same" = ch.added ? "add" : ch.removed ? "del" : "same";
    for (const line of splitLines(ch.value)) {
      lines.push({ type, text: line });
    }
  }

  // `diffLines` often ends with a trailing empty string line; keep it but don't render a final blank-only row.
  while (lines.length && lines[lines.length - 1]?.text === "") {
    lines.pop();
  }

  return lines;
}

export type DiffViewerProps = {
  oldText: string;
  newText: string;
  className?: string;
};

export default function DiffViewer({ oldText, newText, className }: DiffViewerProps) {
  const changes = diffLines(oldText ?? "", newText ?? "");
  const lines = toLineChanges(changes);

  return (
    <pre
      className={[
        "min-h-[240px] w-full overflow-auto rounded-md border border-border bg-surface p-3 text-xs leading-5",
        className ?? "",
      ].join(" ")}
    >
      {lines.length ? (
        lines.map((l, idx) => {
          const prefix = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
          const rowClass =
            l.type === "add"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : l.type === "del"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "text-foreground";

          return (
            <div key={idx} className={`whitespace-pre ${rowClass}`}>
              {prefix}
              {l.text}
            </div>
          );
        })
      ) : (
        <div className="text-muted-foreground">(no changes)</div>
      )}
    </pre>
  );
}

