"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import "./SelectField.css";

type Variant = "outlined" | "filled" | "standard";
type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

export type SelectOption = {
  /** Underlying value used for selection. */
  value: string | number;
  /** Display node rendered in the trigger and option list. */
  label: ReactNode;
  /** If true, the option is disabled. */
  disabled?: boolean;
};

export type SelectFieldProps = {
  /** Visual variant of the select field. */
  variant?: Variant;
  /** Size of the select field. */
  size?: Size;
  /** Theme color applied on focus. */
  color?: Color;
  /** Label text displayed above / inside the field. */
  label?: ReactNode;
  /** Helper text displayed below the field. */
  helperText?: ReactNode;
  /** If true, the field is styled in an error state. */
  error?: boolean;
  /** If true, the select takes the full width of its container. */
  fullWidth?: boolean;
  /** Element placed at the start of the select. */
  startAdornment?: ReactNode;
  /** Options to display in the dropdown list. */
  options?: SelectOption[];
  /** Controlled selected value. */
  value?: string | number | null;
  /** Initial value when uncontrolled. */
  defaultValue?: string | number | null;
  /** Placeholder shown when no option is selected. */
  placeholder?: string;
  /** Disable the trigger. */
  disabled?: boolean;
  /** Mark field as required (renders a "*" near the label). */
  required?: boolean;
  /** Class name applied to the root element. */
  className?: string;
  /** DOM id forwarded to the trigger button. */
  id?: string;
  /** Form name. Renders a hidden input so the value is included in form submissions. */
  name?: string;
  /** Render the dropdown into document.body via a portal. Defaults to true. */
  usePortal?: boolean;
  /** Maximum dropdown height in pixels. Defaults to 280. */
  maxDropdownHeight?: number;
  /** Called when the selection changes. Receives null when cleared. */
  onChange?: (value: string | number | null) => void;
  /** Called after the dropdown is closed. */
  onBlur?: () => void;
};

const VARIANT_CLASS: Record<Variant, string> = {
  outlined: "mui-selectfield-outlined",
  filled: "mui-selectfield-filled",
  standard: "mui-selectfield-standard",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-selectfield-small",
  medium: "mui-selectfield-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-selectfield-color-primary",
  secondary: "mui-selectfield-color-secondary",
  error: "mui-selectfield-color-error",
};

const DEFAULT_DROPDOWN_HEIGHT = 280;

const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(
  function SelectField(
    {
      variant = "outlined",
      size = "medium",
      color = "primary",
      label,
      helperText,
      error,
      fullWidth,
      startAdornment,
      options = [],
      value,
      defaultValue,
      placeholder,
      disabled,
      required,
      className = "",
      id,
      name,
      usePortal = true,
      maxDropdownHeight = DEFAULT_DROPDOWN_HEIGHT,
      onChange,
      onBlur,
    },
    ref,
  ) {
    const autoId = useId();
    const triggerId = id ?? autoId;
    const helperId = `${triggerId}-helper`;
    const listboxId = `${triggerId}-listbox`;

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | number | null>(
      defaultValue ?? null,
    );
    const currentValue = isControlled ? value ?? null : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const setTriggerRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
            node;
        }
      },
      [ref],
    );

    const selectedOption = useMemo(
      () =>
        currentValue == null
          ? undefined
          : options.find(
              (opt) => String(opt.value) === String(currentValue),
            ),
      [options, currentValue],
    );

    const selectedIndex = useMemo(
      () =>
        currentValue == null
          ? -1
          : options.findIndex(
              (opt) => String(opt.value) === String(currentValue),
            ),
      [options, currentValue],
    );

    const computeDropdownStyles = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showAbove =
        spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow;

      const viewportPadding = 8;
      const triggerWidth = rect.width;
      const availableRight = Math.max(
        triggerWidth,
        window.innerWidth - rect.left - viewportPadding,
      );

      const styles: CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        left: rect.left,
        minWidth: triggerWidth,
        maxWidth: availableRight,
        width: "max-content",
      };

      if (showAbove) {
        styles.bottom = window.innerHeight - rect.top + 4;
      } else {
        styles.top = rect.bottom + 4;
      }

      setDropdownStyles(styles);
    }, [maxDropdownHeight]);

    const closeDropdown = useCallback(() => {
      setIsOpen(false);
      setActiveIndex(-1);
      onBlur?.();
    }, [onBlur]);

    const openDropdown = useCallback(() => {
      if (disabled) return;
      computeDropdownStyles();
      setIsOpen(true);
      setActiveIndex(selectedIndex);
    }, [computeDropdownStyles, disabled, selectedIndex]);

    const toggleDropdown = useCallback(() => {
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }, [isOpen, openDropdown, closeDropdown]);

    const commitValue = useCallback(
      (next: string | number | null) => {
        if (!isControlled) {
          setInternalValue(next);
        }
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    const handleSelect = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return;
        commitValue(option.value);
        setIsOpen(false);
        setActiveIndex(-1);
        onBlur?.();
        triggerRef.current?.focus();
      },
      [commitValue, onBlur],
    );

    const moveActive = useCallback(
      (direction: 1 | -1) => {
        if (options.length === 0) {
          setActiveIndex(-1);
          return;
        }
        setActiveIndex((prev) => {
          const total = options.length;
          let next = prev;
          for (let i = 0; i < total; i += 1) {
            next =
              direction === 1
                ? next < total - 1
                  ? next + 1
                  : 0
                : next > 0
                  ? next - 1
                  : total - 1;
            if (!options[next]?.disabled) return next;
          }
          return prev;
        });
      },
      [options],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (!isOpen) {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openDropdown();
          }
          return;
        }
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            moveActive(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            moveActive(-1);
            break;
          case "Enter":
          case " ": {
            e.preventDefault();
            const target =
              activeIndex >= 0 ? options[activeIndex] : undefined;
            if (target) handleSelect(target);
            break;
          }
          case "Escape":
            e.preventDefault();
            closeDropdown();
            break;
          case "Tab":
            closeDropdown();
            break;
        }
      },
      [
        disabled,
        isOpen,
        openDropdown,
        moveActive,
        options,
        activeIndex,
        handleSelect,
        closeDropdown,
      ],
    );

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        const insideTrigger = triggerRef.current?.contains(target);
        const insideDropdown = dropdownRef.current?.contains(target);
        if (!insideTrigger && !insideDropdown) {
          closeDropdown();
        }
      };

      const handleReposition = () => computeDropdownStyles();

      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, [isOpen, closeDropdown, computeDropdownStyles]);

    const shrinkLabel = true;

    const rootClasses = [
      "mui-selectfield",
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      COLOR_CLASS[error ? "error" : color],
      isOpen ? "mui-selectfield-focused" : "",
      disabled ? "mui-selectfield-disabled" : "",
      error ? "mui-selectfield-error" : "",
      fullWidth ? "mui-selectfield-fullwidth" : "",
      shrinkLabel ? "mui-selectfield-label-shrink" : "",
      label ? "" : "mui-selectfield-no-label",
      startAdornment ? "mui-selectfield-has-start" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const dropdown = isOpen ? (
      <div
        ref={dropdownRef}
        className="mui-selectfield-dropdown"
        style={dropdownStyles}
        role="presentation"
      >
        <ul
          id={listboxId}
          role="listbox"
          className="mui-selectfield-listbox"
          style={{ maxHeight: maxDropdownHeight }}
        >
          {options.length === 0 ? (
            <li className="mui-selectfield-state-row mui-selectfield-empty">
              No options
            </li>
          ) : (
            options.map((opt, index) => {
              const isActive = index === activeIndex;
              const isSelected =
                currentValue != null &&
                String(currentValue) === String(opt.value);
              const optionClasses = [
                "mui-selectfield-option",
                isActive ? "mui-selectfield-option-active" : "",
                isSelected ? "mui-selectfield-option-selected" : "",
                opt.disabled ? "mui-selectfield-option-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  className={optionClasses}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                >
                  <span className="mui-selectfield-option-label">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check
                      className="mui-selectfield-option-check"
                      size={16}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

    return (
      <div className={rootClasses}>
        <div className="mui-selectfield-input-wrapper">
          {label && (
            <label htmlFor={triggerId} className="mui-selectfield-label">
              {label}
              {required && <span aria-hidden> *</span>}
            </label>
          )}

          {startAdornment && (
            <span className="mui-selectfield-adornment mui-selectfield-adornment-start">
              {startAdornment}
            </span>
          )}

          <button
            ref={setTriggerRef}
            id={triggerId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-describedby={helperText ? helperId : undefined}
            aria-invalid={error || undefined}
            aria-required={required || undefined}
            disabled={disabled}
            className="mui-selectfield-select"
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
          >
            <span
              className={
                selectedOption
                  ? "mui-selectfield-value"
                  : "mui-selectfield-placeholder"
              }
            >
              {selectedOption ? selectedOption.label : placeholder ?? ""}
            </span>
          </button>

          {name && (
            <input
              type="hidden"
              name={name}
              value={currentValue == null ? "" : String(currentValue)}
            />
          )}

          <span className="mui-selectfield-arrow" aria-hidden>
            <svg
              focusable="false"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </span>

          {variant === "outlined" && (
            <fieldset aria-hidden className="mui-selectfield-outline">
              <legend className="mui-selectfield-outline-legend">
                {shrinkLabel && label ? (
                  <span>
                    {label}
                    {required && " *"}
                  </span>
                ) : (
                  <span className="mui-selectfield-outline-legend-empty" />
                )}
              </legend>
            </fieldset>
          )}
        </div>

        {helperText && (
          <p id={helperId} className="mui-selectfield-helper">
            {helperText}
          </p>
        )}

        {mounted && isOpen && usePortal
          ? createPortal(dropdown, document.body)
          : dropdown}
      </div>
    );
  },
);

export default SelectField;
