"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import "../Button/Button.css";
import "./Checkbox.css";

type Color = "primary" | "secondary" | "error";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label?: ReactNode;
  indeterminate?: boolean;
  color?: Color;
  disableRipple?: boolean;
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "",
  secondary: "mui-checkbox-color-secondary",
  error: "mui-checkbox-color-error",
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      className = "",
      label,
      id,
      indeterminate,
      color = "primary",
      disabled,
      disableRipple,
      onPointerDown,
      ...rest
    },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLSpanElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    useEffect(() => {
      const el = innerRef.current;
      if (el) el.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    const triggerRipple = useCallback(() => {
      const el = wrapRef.current;
      if (!el) return;

      const ripple = document.createElement("span");
      ripple.className = "ripple-checkbox-wave";
      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    }, []);

    const handlePointerDown = (e: ReactPointerEvent<HTMLInputElement>) => {
      if (!disabled && !disableRipple) triggerRipple();
      onPointerDown?.(e);
    };

    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <label
        className={["mui-checkbox", COLOR_CLASS[color], className]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={innerRef}
          id={inputId}
          type="checkbox"
          className="mui-checkbox-input"
          disabled={disabled}
          onPointerDown={handlePointerDown}
          {...rest}
        />
        <span ref={wrapRef} className="mui-checkbox-box-wrap">
          <span className="mui-checkbox-box" aria-hidden />
        </span>
        {label != null && <span className="mui-checkbox-label">{label}</span>}
      </label>
    );
  },
);

export default Checkbox;
