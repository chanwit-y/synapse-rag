"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import "./TextField.css";

type Variant = "outlined" | "filled" | "standard";
type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

type SharedProps = {
  /** Visual variant of the text field. */
  variant?: Variant;
  /** Size of the text field. */
  size?: Size;
  /** Theme color applied on focus. */
  color?: Color;
  /** Label text displayed above / inside the field. */
  label?: ReactNode;
  /** Helper text displayed below the field. */
  helperText?: ReactNode;
  /** If true, the field is styled in an error state. */
  error?: boolean;
  /** If true, the input takes the full width of its container. */
  fullWidth?: boolean;
  /** Element placed at the start of the input. */
  startAdornment?: ReactNode;
  /** Element placed at the end of the input. */
  endAdornment?: ReactNode;
  /** If true, renders a `<textarea>` instead of `<input>`. */
  multiline?: boolean;
  /** Number of rows when multiline. */
  rows?: number;
  /** Minimum number of rows when multiline (auto-grow). */
  minRows?: number;
  /** Maximum number of rows when multiline (auto-grow). */
  maxRows?: number;
};

export type TextFieldProps = SharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

const VARIANT_CLASS: Record<Variant, string> = {
  outlined: "mui-textfield-outlined",
  filled: "mui-textfield-filled",
  standard: "mui-textfield-standard",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-textfield-small",
  medium: "mui-textfield-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-textfield-color-primary",
  secondary: "mui-textfield-color-secondary",
  error: "mui-textfield-color-error",
};

const TextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(function TextField(
  {
    variant = "outlined",
    size = "medium",
    color = "primary",
    label,
    helperText,
    error,
    fullWidth,
    startAdornment,
    endAdornment,
    multiline,
    rows,
    minRows,
    maxRows,
    className = "",
    id,
    disabled,
    required,
    placeholder,
    value,
    defaultValue,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;

  const [focused, setFocused] = useState(false);

  const hasValue =
    value != null
      ? String(value).length > 0
      : defaultValue != null
        ? String(defaultValue).length > 0
        : false;

  const shrinkLabel = focused || hasValue || !!placeholder || !!startAdornment;

  const rootClasses = [
    "mui-textfield",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    COLOR_CLASS[error ? "error" : color],
    focused ? "mui-textfield-focused" : "",
    disabled ? "mui-textfield-disabled" : "",
    error ? "mui-textfield-error" : "",
    fullWidth ? "mui-textfield-fullwidth" : "",
    shrinkLabel ? "mui-textfield-label-shrink" : "",
    label ? "" : "mui-textfield-no-label",
    startAdornment ? "mui-textfield-has-start" : "",
    endAdornment ? "mui-textfield-has-end" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    setFocused(true);
    onFocus?.(e as never);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    setFocused(false);
    onBlur?.(e as never);
  };

  const inputProps = {
    ref: ref as never,
    id: inputId,
    className: "mui-textfield-input",
    disabled,
    required,
    placeholder,
    value,
    defaultValue,
    "aria-describedby": helperText ? helperId : undefined,
    "aria-invalid": error || undefined,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ...rest,
  };

  return (
    <div className={rootClasses}>
      <div className="mui-textfield-input-wrapper">
        {label && (
          <label htmlFor={inputId} className="mui-textfield-label">
            {label}
            {required && <span aria-hidden> *</span>}
          </label>
        )}

        {startAdornment && (
          <span className="mui-textfield-adornment mui-textfield-adornment-start">
            {startAdornment}
          </span>
        )}

        {multiline ? (
          <textarea
            {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement> & { ref: never })}
            rows={rows ?? minRows}
          />
        ) : (
          <input {...(inputProps as InputHTMLAttributes<HTMLInputElement> & { ref: never })} />
        )}

        {endAdornment && (
          <span className="mui-textfield-adornment mui-textfield-adornment-end">
            {endAdornment}
          </span>
        )}

        {variant === "outlined" && (
          <fieldset aria-hidden className="mui-textfield-outline">
            <legend className="mui-textfield-outline-legend">
              {shrinkLabel && label ? (
                <span>
                  {label}
                  {required && " *"}
                </span>
              ) : (
                <span className="mui-textfield-outline-legend-empty" />
              )}
            </legend>
          </fieldset>
        )}
      </div>

      {helperText && (
        <p id={helperId} className="mui-textfield-helper">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default TextField;
