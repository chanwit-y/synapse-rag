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
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import "./DateTimePicker.css";

type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

export type DateTimePickerProps = {
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
  /** Controlled value (ISO string or Date). */
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
  /** Use 24-hour format. Defaults to true. */
  use24Hour?: boolean;
  /** Minute step interval. Defaults to 1. */
  minuteStep?: number;
  /** Render dropdown via portal. Defaults to true. */
  usePortal?: boolean;
  /** Called when the datetime changes. */
  onChange?: (value: string | null) => void;
  /** Called after the dropdown is closed. */
  onBlur?: () => void;
  /** If true, shows a clear button. */
  clearable?: boolean;
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-datetimepicker-small",
  medium: "mui-datetimepicker-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-datetimepicker-color-primary",
  secondary: "mui-datetimepicker-color-secondary",
  error: "mui-datetimepicker-color-error",
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISOString(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

function parseDateTime(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(d: Date, use24: boolean): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (use24) {
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day} ${h}:${mi}`;
  }
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi} ${ampm}`;
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

const DateTimePicker = forwardRef<HTMLButtonElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      label,
      helperText,
      error,
      fullWidth,
      size = "medium",
      color = "primary",
      value,
      defaultValue,
      placeholder = "Select date & time",
      disabled,
      required,
      className = "",
      id,
      name,
      minDate,
      maxDate,
      use24Hour = true,
      minuteStep = 1,
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
      const d = parseDateTime(defaultValue);
      return d ? toISOString(d) : null;
    });
    const currentValue = isControlled
      ? value ? (parseDateTime(value) ? toISOString(parseDateTime(value)!) : null) : null
      : internalValue;

    const selectedDate = useMemo(() => parseDateTime(currentValue), [currentValue]);

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [viewYear, setViewYear] = useState(() => selectedDate?.getFullYear() ?? new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? new Date().getMonth());
    const [hours, setHours] = useState(() => selectedDate?.getHours() ?? new Date().getHours());
    const [minutes, setMinutes] = useState(() => selectedDate?.getMinutes() ?? 0);
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
      const showAbove = spaceBelow < 440 && rect.top > spaceBelow;

      const styles: CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        left: rect.left,
        minWidth: 296,
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
        setHours(selectedDate.getHours());
        setMinutes(selectedDate.getMinutes());
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
        const d = new Date(viewYear, viewMonth, day, hours, minutes);
        if (minDate && d < minDate) return;
        if (maxDate && d > maxDate) return;
        commitValue(toISOString(d));
      },
      [viewYear, viewMonth, hours, minutes, minDate, maxDate, commitValue],
    );

    const handleTimeChange = useCallback(
      (h: number, m: number) => {
        setHours(h);
        setMinutes(m);
        if (selectedDate) {
          const d = new Date(selectedDate);
          d.setHours(h, m);
          commitValue(toISOString(d));
        }
      },
      [selectedDate, commitValue],
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
        if (minDate) {
          const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
          if (d < minDay) return true;
        }
        if (maxDate) {
          const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
          if (d > maxDay) return true;
        }
        return false;
      },
      [viewYear, viewMonth, minDate, maxDate],
    );

    const rootClasses = [
      "mui-datetimepicker",
      SIZE_CLASS[size],
      COLOR_CLASS[error ? "error" : color],
      isOpen ? "mui-datetimepicker-focused" : "",
      disabled ? "mui-datetimepicker-disabled" : "",
      error ? "mui-datetimepicker-error" : "",
      fullWidth ? "mui-datetimepicker-fullwidth" : "",
      label ? "mui-datetimepicker-label-shrink" : "",
      className,
    ].filter(Boolean).join(" ");

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="mui-datetimepicker-cell mui-datetimepicker-cell-empty" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
      const isToday = isSameDay(d, today);
      const isDayDisabled = isDateDisabled(day);

      const cellClasses = [
        "mui-datetimepicker-cell",
        isSelected ? "mui-datetimepicker-cell-selected" : "",
        isToday && !isSelected ? "mui-datetimepicker-cell-today" : "",
        isDayDisabled ? "mui-datetimepicker-cell-disabled" : "",
      ].filter(Boolean).join(" ");

      calendarCells.push(
        <button
          key={day}
          type="button"
          className={cellClasses}
          disabled={isDayDisabled}
          onClick={() => handleSelect(day)}
          tabIndex={-1}
        >
          {day}
        </button>,
      );
    }

    const hourOptions = Array.from({ length: use24Hour ? 24 : 12 }, (_, i) => use24Hour ? i : i + 1);
    const minuteOptions = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

    const dropdown = isOpen ? (
      <div
        ref={dropdownRef}
        className="mui-datetimepicker-dropdown"
        style={dropdownStyles}
        role="dialog"
        aria-label="Choose date and time"
      >
        <div className="mui-datetimepicker-calendar-section">
          <div className="mui-datetimepicker-header">
            <button type="button" className="mui-datetimepicker-nav-btn" onClick={prevMonth} tabIndex={-1}>
              <ChevronLeft size={18} />
            </button>
            <span className="mui-datetimepicker-month-year">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="mui-datetimepicker-nav-btn" onClick={nextMonth} tabIndex={-1}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mui-datetimepicker-weekdays">
            {DAYS.map((d) => (
              <div key={d} className="mui-datetimepicker-weekday">{d}</div>
            ))}
          </div>
          <div className="mui-datetimepicker-grid">
            {calendarCells}
          </div>
        </div>

        <div className="mui-datetimepicker-time-section">
          <div className="mui-datetimepicker-time-label">
            <Clock size={14} />
            <span>Time</span>
          </div>
          <div className="mui-datetimepicker-time-controls">
            <select
              className="mui-datetimepicker-time-select"
              value={hours}
              onChange={(e) => handleTimeChange(Number(e.target.value), minutes)}
              tabIndex={-1}
            >
              {hourOptions.map((h) => (
                <option key={h} value={use24Hour ? h : h % 12 || 12}>
                  {String(use24Hour ? h : h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="mui-datetimepicker-time-separator">:</span>
            <select
              className="mui-datetimepicker-time-select"
              value={minutes}
              onChange={(e) => handleTimeChange(hours, Number(e.target.value))}
              tabIndex={-1}
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
            {!use24Hour && (
              <select
                className="mui-datetimepicker-time-select mui-datetimepicker-ampm-select"
                value={hours >= 12 ? "PM" : "AM"}
                onChange={(e) => {
                  const isPM = e.target.value === "PM";
                  const h12 = hours % 12;
                  handleTimeChange(isPM ? h12 + 12 : h12, minutes);
                }}
                tabIndex={-1}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            )}
          </div>
        </div>

        <div className="mui-datetimepicker-footer">
          <button
            type="button"
            className="mui-datetimepicker-now-btn"
            onClick={() => {
              const now = new Date();
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
              setHours(now.getHours());
              setMinutes(now.getMinutes());
              commitValue(toISOString(now));
            }}
            tabIndex={-1}
          >
            Now
          </button>
          <button
            type="button"
            className="mui-datetimepicker-ok-btn"
            onClick={closeDropdown}
            tabIndex={-1}
          >
            OK
          </button>
        </div>
      </div>
    ) : null;

    return (
      <div className={rootClasses}>
        {label && (
          <label htmlFor={triggerId} className="mui-datetimepicker-label">
            {label}
            {required && <span aria-hidden> *</span>}
          </label>
        )}

        <div className="mui-datetimepicker-input-wrapper">
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
            className="mui-datetimepicker-trigger"
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
          >
            <Calendar size={18} className="mui-datetimepicker-icon" />
            <span className={currentValue ? "mui-datetimepicker-value" : "mui-datetimepicker-placeholder"}>
              {selectedDate ? formatDisplay(selectedDate, use24Hour) : placeholder}
            </span>
          </button>

          {clearable && currentValue && !disabled && (
            <button
              type="button"
              className="mui-datetimepicker-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear date and time"
            >
              <X size={16} />
            </button>
          )}

          {name && (
            <input type="hidden" name={name} value={currentValue ?? ""} />
          )}

          <fieldset aria-hidden className="mui-datetimepicker-outline">
            <legend className="mui-datetimepicker-outline-legend">
              {label ? (
                <span>{label}{required && " *"}</span>
              ) : (
                <span className="mui-datetimepicker-outline-legend-empty" />
              )}
            </legend>
          </fieldset>
        </div>

        {helperText && (
          <p id={helperId} className="mui-datetimepicker-helper">
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

export default DateTimePicker;
