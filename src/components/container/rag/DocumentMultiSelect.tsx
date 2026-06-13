"use client";

import { useMemo } from "react";
import Autocomplete from "@/components/common/Autocomplete/Autocomplete";
import type { DocumentOption } from "./types";

type DocumentMultiSelectProps = {
  documents: DocumentOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
};

export default function DocumentMultiSelect({
  documents,
  value,
  onChange,
  label = "Documents",
}: DocumentMultiSelectProps) {
  const options = useMemo(
    () =>
      documents.map((doc) => ({
        value: doc.id,
        label: `${doc.name} — ${doc.collection}${doc.contentTh ? " · TH" : ""}`,
        searchText: `${doc.name} ${doc.collection}`,
      })),
    [documents],
  );

  return (
    <Autocomplete
      multiple
      variant="outlined"
      label={label}
      placeholder="Search and select documents…"
      searchPlaceholder="Search documents…"
      fullWidth
      options={options}
      value={value}
      onChange={(ids) => onChange(ids.map(String))}
      helperText={
        value.length > 0
          ? `${value.length} document${value.length === 1 ? "" : "s"} selected`
          : undefined
      }
    />
  );
}
