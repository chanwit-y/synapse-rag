"use client";

import Loader from "@/components/common/Loader/Loader";

type ApiLoadingBackdropProps = {
  show: boolean;
  label?: string;
};

export default function ApiLoadingBackdrop({
  show,
  label = "Loading…",
}: ApiLoadingBackdropProps) {
  if (!show) return null;

  return <Loader backdrop fixed label={label} size="large" />;
}
