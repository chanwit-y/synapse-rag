import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import "./Skeleton.css";

type Variant = "text" | "rectangular" | "rounded" | "circular";
type Animation = "wave" | "pulse" | false;

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Shape of the placeholder. */
  variant?: Variant;
  /** Width — number is treated as px. Defaults to 100%. */
  width?: number | string;
  /** Height — number is treated as px. Defaults vary by variant. */
  height?: number | string;
  /** Animation style, or `false` to disable. */
  animation?: Animation;
};

const VARIANT_CLASS: Record<Variant, string> = {
  text: "mui-skeleton-text",
  rectangular: "mui-skeleton-rectangular",
  rounded: "mui-skeleton-rounded",
  circular: "mui-skeleton-circular",
};

const ANIMATION_CLASS: Record<Exclude<Animation, false>, string> = {
  wave: "mui-skeleton-wave",
  pulse: "mui-skeleton-pulse",
};

function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/** Content placeholder shown while data or a route is loading. */
const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    variant = "text",
    width,
    height,
    animation = "wave",
    className = "",
    style,
    "aria-hidden": ariaHidden = true,
    ...rest
  },
  ref,
) {
  const resolvedStyle: CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
    // A text skeleton with no explicit height fills its line height.
    ...(variant === "text" && height == null ? { height: "1em" } : null),
    ...style,
  };

  const classes = [
    "mui-skeleton",
    VARIANT_CLASS[variant],
    animation ? ANIMATION_CLASS[animation] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      style={resolvedStyle}
      aria-hidden={ariaHidden}
      {...rest}
    />
  );
});

export default Skeleton;
