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
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import "./DatePicker.css";

type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

export type DatePickerProps = {
  /** Label text displayed above the field. */
  label?: ReactNode;
  /** Helper text displayed below the field. */
  helperText?: ReactNode;
  /** If true, the field is styled in an error state. */
  error?: boolean;
  /** If true, the input takes the full width of its container. */
  fullWidth?: boolean;
  /** Size of the field. */
  size?: Size;
  /** Theme color applied on focus. */
  color?: Color;
  /** Controlled selected date (ISO string yyyy-MM-dd or Date). */
  value?: string | Date | null;
  /** Initial value when uncontrolled. */
  defaultValue?: string | Date | null;
  /** Placeholder text. */
  placeholder?: string;
  /** Disable the field. */
  disabled?: boolean;
  /** Mark field as required. */
  required?: boolean;
  /** Class name applied to the root element. */
  className?: string;
  /** DOM id forwarded to the trigger button. */
  id?: string;
  /** Form name for hidden input. */
  name?: string;
  /** Minimum selectable date. */
  minDate?: Date;
  /** Maximum selectable date. */
  maxDate?: Date;
  /** Date display format. */
  displayFormat?: "yyyy-MM-dd" | "MM/dd/yyyy" | "dd/MM/yyyy";
  /** Render dropdown via portal. Defaults to true. */
  usePortal?: boolean;
  /** Called when the date changes. */
  onChange?: (value: string | null) => void;
  /** Called after the dropdown is closed. */
  onBlur?: () => void;
  /** If true, shows a clear button. */
  clearable?: boolean;
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-datepicker-small",
  medium: "mui-datepicker-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-datepicker-color-primary",
  secondary: "mui-datepicker-color-secondary",
  error: "mui-datepicker-color-error",
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(d: Date, fmt: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  switch (fmt) {
    case "MM/dd/yyyy": return `${m}/${day}/${y}`;
    case "dd/MM/yyyy": return `${day}/${m}/${y}`;
    default: return `${y}-${m}-${day}`;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  function DatePicker(
    {
      label,
      helperText,
      error,
      fullWidth,
      size = "medium",
      color = "primary",
      value,
      defaultValue,
      placeholder = "Select date",
      disabled,
      required,
      className = "",
      id,
      name,
      minDate,
      maxDate,
      displayFormat = "yyyy-MM-dd",
      usePortal = true,
      onChange,
      onBlur,
      clearable = true,
    },
    ref,
  ) {
    const autoId = useId();
    const triggerId = id ?? autoId;
    const helperId = `${triggerId}-helper`;

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | null>(() => {
      const d = parseDate(defaultValue);
      return d ? toDateString(d) : null;
    });
    const currentValue = isControlled
      ? value ? (parseDate(value) ? toDateString(parseDate(value)!) : null) : null
      : internalValue;

    const selectedDate = useMemo(() => parseDate(currentValue), [currentValue]);

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [viewYear, setViewYear] = useState(() => selectedDate?.getFullYear() ?? new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? new Date().getMonth());
    const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const setTriggerRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref],
    );

    const computeDropdownStyles = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 340 && rect.top > spaceBelow;

      const styles: CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        left: rect.left,
        minWidth: 280,
      };

      if (showAbove) {
        styles.bottom = window.innerHeight - rect.top + 4;
      } else {
        styles.top = rect.bottom + 4;
      }
      setDropdownStyles(styles);
    }, []);

    const closeDropdown = useCallback(() => {
      setIsOpen(false);
      onBlur?.();
    }, [onBlur]);

    const openDropdown = useCallback(() => {
      if (disabled) return;
      computeDropdownStyles();
      if (selectedDate) {
        setViewYear(selectedDate.getFullYear());
        setViewMonth(selectedDate.getMonth());
      }
      setIsOpen(true);
    }, [computeDropdownStyles, disabled, selectedDate]);

    const toggleDropdown = useCallback(() => {
      if (isOpen) closeDropdown();
      else openDropdown();
    }, [isOpen, openDropdown, closeDropdown]);

    const commitValue = useCallback(
      (next: string | null) => {
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    const handleSelect = useCallback(
      (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        if (minDate && d < minDate) return;
        if (maxDate && d > maxDate) return;
        commitValue(toDateString(d));
        closeDropdown();
        triggerRef.current?.focus();
      },
      [viewYear, viewMonth, minDate, maxDate, commitValue, closeDropdown],
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        commitValue(null);
      },
      [commitValue],
    );

    const prevMonth = useCallback(() => {
      setViewMonth((m) => {
        if (m === 0) { setViewYear((y) => y - 1); return 11; }
        return m - 1;
      });
    }, []);

    const nextMonth = useCallback(() => {
      setViewMonth((m) => {
        if (m === 11) { setViewYear((y) => y + 1); return 0; }
        return m + 1;
      });
    }, []);

    useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
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

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          openDropdown();
        }
        if (isOpen && e.key === "Escape") {
          e.preventDefault();
          closeDropdown();
        }
      },
      [disabled, isOpen, openDropdown, closeDropdown],
    );

    const today = useMemo(() => new Date(), []);
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const isDateDisabled = useCallback(
      (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        if (minDate && d < minDate) return true;
        if (maxDate && d > maxDate) return true;
        return false;
      },
      [viewYear, viewMonth, minDate, maxDate],
    );

    const rootClasses = [
      "mui-datepicker",
      SIZE_CLASS[size],
      COLOR_CLASS[error ? "error" : color],
      isOpen ? "mui-datepicker-focused" : "",
      disabled ? "mui-datepicker-disabled" : "",
      error ? "mui-datepicker-error" : "",
      fullWidth ? "mui-datepicker-fullwidth" : "",
      label ? "mui-datepicker-label-shrink" : "",
      className,
    ].filter(Boolean).join(" ");

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="mui-datepicker-cell mui-datepicker-cell-empty" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
      const isToday = isSameDay(d, today);
      const isDisabled = isDateDisabled(day);

      const cellClasses = [
        "mui-datepicker-cell",
        isSelected ? "mui-datepicker-cell-selected" : "",
        isToday && !isSelected ? "mui-datepicker-cell-today" : "",
        isDisabled ? "mui-datepicker-cell-disabled" : "",
      ].filter(Boolean).join(" ");

      calendarCells.push(
        <button
          key={day}
          type="button"
          className={cellClasses}
          disabled={isDisabled}
          onClick={() => handleSelect(day)}
          tabIndex={-1}
        >
          {day}
        </button>,
      );
    }

    const dropdown = isOpen ? (
      <div
        ref={dropdownRef}
        className="mui-datepicker-dropdown"
        style={dropdownStyles}
        role="dialog"
        aria-label="Choose date"
      >
        <div className="mui-datepicker-header">
          <button type="button" className="mui-datepicker-nav-btn" onClick={prevMonth} tabIndex={-1}>
            <ChevronLeft size={18} />
          </button>
          <span className="mui-datepicker-month-year">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button type="button" className="mui-datepicker-nav-btn" onClick={nextMonth} tabIndex={-1}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="mui-datepicker-weekdays">
          {DAYS.map((d) => (
            <div key={d} className="mui-datepicker-weekday">{d}</div>
          ))}
        </div>
        <div className="mui-datepicker-grid">
          {calendarCells}
        </div>
        <div className="mui-datepicker-footer">
          <button
            type="button"
            className="mui-datepicker-today-btn"
            onClick={() => {
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
              handleSelect(today.getDate());
            }}
            tabIndex={-1}
          >
            Today
          </button>
        </div>
      </div>
    ) : null;

    return (
      <div className={rootClasses}>
        {label && (
          <label htmlFor={triggerId} className="mui-datepicker-label">
            {label}
            {required && <span aria-hidden> *</span>}
          </label>
        )}

        <div className="mui-datepicker-input-wrapper">
          <button
            ref={setTriggerRef}
            id={triggerId}
            type="button"
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-describedby={helperText ? helperId : undefined}
            aria-invalid={error || undefined}
            aria-required={required || undefined}
            disabled={disabled}
            className="mui-datepicker-trigger"
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
          >
            <Calendar size={18} className="mui-datepicker-icon" />
            <span className={currentValue ? "mui-datepicker-value" : "mui-datepicker-placeholder"}>
              {selectedDate ? formatDisplay(selectedDate, displayFormat) : placeholder}
            </span>
          </button>

          {clearable && currentValue && !disabled && (
            <button
              type="button"
              className="mui-datepicker-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear date"
            >
              <X size={16} />
            </button>
          )}

          {name && (
            <input type="hidden" name={name} value={currentValue ?? ""} />
          )}

          <fieldset aria-hidden className="mui-datepicker-outline">
            <legend className="mui-datepicker-outline-legend">
              {label ? (
                <span>{label}{required && " *"}</span>
              ) : (
                <span className="mui-datepicker-outline-legend-empty" />
              )}
            </legend>
          </fieldset>
        </div>

        {helperText && (
          <p id={helperId} className="mui-datepicker-helper">
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

export default DatePicker;
