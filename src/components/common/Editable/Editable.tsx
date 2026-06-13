"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./Editable.css";

type Variant = "inline" | "outlined" | "filled";
type Size = "small" | "medium";

export type EditableProps = {
  /** Current text value (controlled). */
  value?: string;
  /** Initial text value (uncontrolled). */
  defaultValue?: string;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Visual variant. */
  variant?: Variant;
  /** Size of the editable field. */
  size?: Size;
  /** Disables editing. */
  disabled?: boolean;
  /** If true, the component is always in read-only display mode. */
  readOnly?: boolean;
  /** Trigger to enter edit mode. */
  startEditOn?: "click" | "doubleClick";
  /** Called when the user confirms a new value. */
  onConfirm?: (value: string) => void;
  /** Called when the user cancels editing. */
  onCancel?: () => void;
  /** Called on every keystroke while editing. */
  onChange?: (value: string) => void;
  /** Label rendered above the editable. */
  label?: ReactNode;
  /** Additional CSS class names on the root element. */
  className?: string;
  /** Maximum character length. */
  maxLength?: number;
  /** If true, the component takes the full width of its container. */
  fullWidth?: boolean;
};

export type EditableRef = {
  /** Programmatically enter edit mode. */
  startEditing: () => void;
  /** Programmatically confirm the current draft. */
  confirm: () => void;
  /** Programmatically cancel editing. */
  cancel: () => void;
  /** The underlying input element. */
  inputElement: HTMLInputElement | null;
};

const VARIANT_CLASS: Record<Variant, string> = {
  inline: "",
  outlined: "si-editable-outlined",
  filled: "si-editable-filled",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "si-editable-sm",
  medium: "",
};

const Editable = forwardRef<EditableRef, EditableProps>(function Editable(
  {
    value: controlledValue,
    defaultValue = "",
    placeholder = "Click to edit",
    variant = "inline",
    size = "medium",
    disabled = false,
    readOnly = false,
    startEditOn = "click",
    onConfirm,
    onCancel,
    onChange,
    label,
    className = "",
    maxLength,
    fullWidth = false,
  },
  forwardedRef,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const displayValue = isControlled ? controlledValue : internalValue;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => ({
    startEditing: () => enterEdit(),
    confirm: () => confirmEdit(),
    cancel: () => cancelEdit(),
    inputElement: inputRef.current,
  }));

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const enterEdit = useCallback(() => {
    if (disabled || readOnly) return;
    setDraft(displayValue);
    setEditing(true);
  }, [disabled, readOnly, displayValue]);

  const confirmEdit = useCallback(() => {
    setEditing(false);
    if (!isControlled) setInternalValue(draft);
    onConfirm?.(draft);
  }, [draft, isControlled, onConfirm]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(displayValue);
    onCancel?.();
  }, [displayValue, onCancel]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleBlur = () => {
    confirmEdit();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setDraft(next);
    onChange?.(next);
  };

  const rootClass = [
    "si-editable",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    disabled ? "si-editable-disabled" : "",
    readOnly ? "si-editable-readonly" : "",
    editing ? "si-editable-editing" : "",
    fullWidth ? "si-editable-full-width" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const triggerProps =
    startEditOn === "doubleClick"
      ? { onDoubleClick: enterEdit }
      : { onClick: enterEdit };

  const isEmpty = !displayValue;

  return (
    <div className={rootClass}>
      {label != null && <span className="si-editable-label">{label}</span>}

      {editing ? (
        <input
          ref={inputRef}
          className="si-editable-input"
          type="text"
          value={draft}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          maxLength={maxLength}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
        />
      ) : (
        <span
          className={`si-editable-display${isEmpty ? " si-editable-placeholder" : ""}`}
          tabIndex={disabled || readOnly ? undefined : 0}
          role={disabled || readOnly ? undefined : "button"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              enterEdit();
            }
          }}
          {...triggerProps}
        >
          {isEmpty ? placeholder : displayValue}
          {!disabled && !readOnly && (
            <svg
              className="si-editable-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          )}
        </span>
      )}
    </div>
  );
});

export default Editable;
