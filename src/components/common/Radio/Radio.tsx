"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import "../Button/Button.css";
import "./Radio.css";

type Color = "primary" | "secondary" | "error";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label?: ReactNode;
  color?: Color;
  disableRipple?: boolean;
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "",
  secondary: "mui-radio-color-secondary",
  error: "mui-radio-color-error",
};

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  function Radio(
    {
      className = "",
      label,
      id,
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

    const triggerRipple = useCallback(() => {
      const el = wrapRef.current;
      if (!el) return;

      const ripple = document.createElement("span");
      ripple.className = "ripple-radio-wave";
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
        className={["mui-radio", COLOR_CLASS[color], className]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={innerRef}
          id={inputId}
          type="radio"
          className="mui-radio-input"
          disabled={disabled}
          onPointerDown={handlePointerDown}
          {...rest}
        />
        <span ref={wrapRef} className="mui-radio-circle-wrap">
          <span className="mui-radio-circle" aria-hidden />
        </span>
        {label != null && <span className="mui-radio-label">{label}</span>}
      </label>
    );
  },
);

export default Radio;
