"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import "./Button.css";

type Variant = "contained" | "outlined" | "text";
type Color = "primary" | "secondary" | "error" | "inherit";
type Size = "small" | "medium" | "large";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  color?: Color;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  disableElevation?: boolean;
  disableRipple?: boolean;
  rippleColor?: string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  contained: "mui-btn-contained",
  outlined: "mui-btn-outlined",
  text: "mui-btn-text",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-btn-color-primary",
  secondary: "mui-btn-color-secondary",
  error: "mui-btn-color-error",
  inherit: "mui-btn-color-inherit",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-btn-size-small",
  medium: "mui-btn-size-medium",
  large: "mui-btn-size-large",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "contained",
    color = "primary",
    size = "medium",
    fullWidth,
    loading,
    startIcon,
    endIcon,
    disableElevation,
    disableRipple,
    rippleColor,
    className = "",
    disabled,
    onClick,
    onPointerDown,
    children,
    type = "button",
    ...rest
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLButtonElement);

  const triggerRipple = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const el = innerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement("span");
      ripple.className = "ripple-btn-wave";
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      if (rippleColor) ripple.style.backgroundColor = rippleColor;

      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    },
    [rippleColor],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && !disableRipple) {
      triggerRipple(e as unknown as MouseEvent<HTMLButtonElement>);
    }
    onPointerDown?.(e);
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      ref={innerRef}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={[
        "mui-btn",
        VARIANT_CLASS[variant],
        COLOR_CLASS[color],
        SIZE_CLASS[size],
        disableElevation ? "mui-btn-no-elevation" : "",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading && <span aria-hidden className="mui-btn-spinner" />}
      {!loading && startIcon && (
        <span className="mui-btn-start-icon">{startIcon}</span>
      )}
      {children != null && <span className="relative z-[1]">{children}</span>}
      {!loading && endIcon && (
        <span className="mui-btn-end-icon">{endIcon}</span>
      )}
    </button>
  );
});

export default Button;
