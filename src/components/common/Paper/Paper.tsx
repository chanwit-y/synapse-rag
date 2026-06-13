import { forwardRef, type HTMLAttributes } from "react";
import "./Paper.css";

type Variant = "elevation" | "outlined";

export type PaperProps = HTMLAttributes<HTMLDivElement> & {
  /** Shadow depth (0–24). Only applies when variant is "elevation". */
  elevation?: number;
  /** If true, rounded corners are disabled. */
  square?: boolean;
  /** The variant to use. */
  variant?: Variant;
  /** The HTML element or component used for the root node. */
  component?: React.ElementType;
};

const ELEVATION_CLASSES: Record<number, string> = {
  0: "mui-paper-elevation-0",
  1: "mui-paper-elevation-1",
  2: "mui-paper-elevation-2",
  3: "mui-paper-elevation-3",
  4: "mui-paper-elevation-4",
  6: "mui-paper-elevation-6",
  8: "mui-paper-elevation-8",
  12: "mui-paper-elevation-12",
  16: "mui-paper-elevation-16",
  24: "mui-paper-elevation-24",
};

const Paper = forwardRef<HTMLElement, PaperProps>(function Paper(
  {
    elevation = 1,
    square = false,
    variant = "elevation",
    component: Component = "div",
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const elevationClass =
    variant === "elevation"
      ? ELEVATION_CLASSES[elevation] ?? `mui-paper-elevation-${elevation}`
      : "";

  return (
    <Component
      ref={ref}
      className={[
        "mui-paper",
        square ? "mui-paper-square" : "mui-paper-rounded",
        variant === "elevation" ? "mui-paper-elevation" : "mui-paper-outlined",
        elevationClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Component>
  );
});

export default Paper;
