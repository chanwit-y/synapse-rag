"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import "./Switch.css";

type Color = "primary" | "secondary" | "error";
type Size = "small" | "medium";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label?: ReactNode;
  color?: Color;
  size?: Size;
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "",
  secondary: "mui-switch-color-secondary",
  error: "mui-switch-color-error",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-switch-size-small",
  medium: "",
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(
    {
      className = "",
      label,
      id,
      color = "primary",
      size = "medium",
      disabled,
      ...rest
    },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <label
        className={[
          "mui-switch",
          COLOR_CLASS[color],
          SIZE_CLASS[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={innerRef}
          id={inputId}
          type="checkbox"
          role="switch"
          className="mui-switch-input"
          disabled={disabled}
          {...rest}
        />
        <span className="mui-switch-track">
          <span className="mui-switch-thumb-wrap">
            <span className="mui-switch-thumb" aria-hidden />
          </span>
        </span>
        {label != null && <span className="mui-switch-label">{label}</span>}
      </label>
    );
  },
);

export default Switch;
