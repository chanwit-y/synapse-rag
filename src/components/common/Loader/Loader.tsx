import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import "./Loader.css";

type Color = "primary" | "secondary" | "error" | "inherit";
type Size = "small" | "medium" | "large";

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  /** Spinner color palette. */
  color?: Color;
  /** Spinner dimensions. */
  size?: Size;
  /** Optional text shown below the spinner. */
  label?: ReactNode;
  /** Center the loader horizontally within its container. */
  centered?: boolean;
  /** Cover the parent (or viewport when `fixed`) with a blurred backdrop. */
  backdrop?: boolean;
  /** With `backdrop`, use `position: fixed` to cover the viewport. */
  fixed?: boolean;
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-loader-color-primary",
  secondary: "mui-loader-color-secondary",
  error: "mui-loader-color-error",
  inherit: "mui-loader-color-inherit",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-loader-size-small",
  medium: "mui-loader-size-medium",
  large: "mui-loader-size-large",
};

const Loader = forwardRef<HTMLDivElement, LoaderProps>(function Loader(
  {
    color = "primary",
    size = "medium",
    label,
    centered,
    backdrop,
    fixed,
    className = "",
    "aria-label": ariaLabel,
    ...rest
  },
  ref,
) {
  const accessibleLabel =
    ariaLabel ?? (typeof label === "string" ? label : "Loading");

  const loaderClassName = [
    "mui-loader",
    COLOR_CLASS[color],
    SIZE_CLASS[size],
    centered || backdrop ? "mui-loader-centered" : "",
    backdrop ? "mui-loader-backdrop-content" : "",
    !backdrop ? className : "",
  ]
    .filter(Boolean)
    .join(" ");

  const spinner = (
    <>
      <span className="mui-loader-spinner" aria-hidden />
      {label != null && <span className="mui-loader-label">{label}</span>}
    </>
  );

  if (backdrop) {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={accessibleLabel}
        aria-busy="true"
        className={[
          "mui-loader-backdrop",
          fixed ? "mui-loader-backdrop-fixed" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        <div className={loaderClassName}>{spinner}</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-label={accessibleLabel}
      className={loaderClassName}
      {...rest}
    >
      {spinner}
    </div>
  );
});

export default Loader;
