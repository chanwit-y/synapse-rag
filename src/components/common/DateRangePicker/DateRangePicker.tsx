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
import "./DateRangePicker.css";

type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

export type DateRange = {
  start: string | null;
  end: string | null;
};

export type DateRangePickerProps = {
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
  /** Controlled value. */
  value?: DateRange | null;
  /** Initial value when uncontrolled. */
  defaultValue?: DateRange | null;
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
  /** Form name for hidden inputs. */
  name?: string;
  /** Minimum selectable date. */
  minDate?: Date;
  /** Maximum selectable date. */
  maxDate?: Date;
  /** Date display format. */
  displayFormat?: "yyyy-MM-dd" | "MM/dd/yyyy" | "dd/MM/yyyy";
  /** Render dropdown via portal. Defaults to true. */
  usePortal?: boolean;
  /** Called when the range changes. */
  onChange?: (value: DateRange | null) => void;
  /** Called after the dropdown is closed. */
  onBlur?: () => void;
  /** If true, shows a clear button. */
  clearable?: boolean;
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-daterangepicker-small",
  medium: "mui-daterangepicker-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-daterangepicker-color-primary",
  secondary: "mui-daterangepicker-color-secondary",
  error: "mui-daterangepicker-color-error",
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

function formatShort(d: Date): string {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      label,
      helperText,
      error,
      fullWidth,
      size = "medium",
      color = "primary",
      value,
      defaultValue,
      placeholder = "Select date range",
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
    const [internalValue, setInternalValue] = useState<DateRange | null>(
      defaultValue ?? null,
    );
    const currentValue = isControlled ? value ?? null : internalValue;

    const startDate = useMemo(() => parseDate(currentValue?.start), [currentValue?.start]);
    const endDate = useMemo(() => parseDate(currentValue?.end), [currentValue?.end]);

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [selecting, setSelecting] = useState<"start" | "end">("start");
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [tempStart, setTempStart] = useState<Date | null>(null);
    const [leftYear, setLeftYear] = useState(() => startDate?.getFullYear() ?? new Date().getFullYear());
    const [leftMonth, setLeftMonth] = useState(() => startDate?.getMonth() ?? new Date().getMonth());
    const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});

    const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
    const rightMonth = (leftMonth + 1) % 12;

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
      const showAbove = spaceBelow < 400 && rect.top > spaceBelow;
      const dropdownWidth = 600;
      const viewportPadding = 8;
      let leftPos = rect.left;
      if (leftPos + dropdownWidth > window.innerWidth - viewportPadding) {
        leftPos = Math.max(viewportPadding, window.innerWidth - dropdownWidth - viewportPadding);
      }

      const styles: CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        left: leftPos,
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
      setSelecting("start");
      setTempStart(null);
      setHoverDate(null);
      onBlur?.();
    }, [onBlur]);

    const openDropdown = useCallback(() => {
      if (disabled) return;
      computeDropdownStyles();
      if (startDate) {
        setLeftYear(startDate.getFullYear());
        setLeftMonth(startDate.getMonth());
      }
      setSelecting("start");
      setTempStart(null);
      setIsOpen(true);
    }, [computeDropdownStyles, disabled, startDate]);

    const toggleDropdown = useCallback(() => {
      if (isOpen) closeDropdown();
      else openDropdown();
    }, [isOpen, openDropdown, closeDropdown]);

    const commitValue = useCallback(
      (next: DateRange | null) => {
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    const handleDayClick = useCallback(
      (d: Date) => {
        if (minDate && d < minDate) return;
        if (maxDate && d > maxDate) return;

        if (selecting === "start") {
          setTempStart(d);
          setSelecting("end");
        } else {
          const s = tempStart!;
          const [rangeStart, rangeEnd] = s <= d ? [s, d] : [d, s];
          commitValue({
            start: toDateString(rangeStart),
            end: toDateString(rangeEnd),
          });
          closeDropdown();
          triggerRef.current?.focus();
        }
      },
      [selecting, tempStart, minDate, maxDate, commitValue, closeDropdown],
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        commitValue(null);
      },
      [commitValue],
    );

    const prevMonth = useCallback(() => {
      setLeftMonth((m) => {
        if (m === 0) { setLeftYear((y) => y - 1); return 11; }
        return m - 1;
      });
    }, []);

    const nextMonth = useCallback(() => {
      setLeftMonth((m) => {
        if (m === 11) { setLeftYear((y) => y + 1); return 0; }
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

    const isDateDisabled = useCallback(
      (year: number, month: number, day: number) => {
        const d = new Date(year, month, day);
        if (minDate && d < minDate) return true;
        if (maxDate && d > maxDate) return true;
        return false;
      },
      [minDate, maxDate],
    );

    const rootClasses = [
      "mui-daterangepicker",
      SIZE_CLASS[size],
      COLOR_CLASS[error ? "error" : color],
      isOpen ? "mui-daterangepicker-focused" : "",
      disabled ? "mui-daterangepicker-disabled" : "",
      error ? "mui-daterangepicker-error" : "",
      fullWidth ? "mui-daterangepicker-fullwidth" : "",
      label ? "mui-daterangepicker-label-shrink" : "",
      className,
    ].filter(Boolean).join(" ");

    const displayValue = useMemo(() => {
      if (!startDate || !endDate) return null;
      return `${formatDisplay(startDate, displayFormat)} — ${formatDisplay(endDate, displayFormat)}`;
    }, [startDate, endDate, displayFormat]);

    function renderMonth(year: number, month: number) {
      const daysInM = getDaysInMonth(year, month);
      const firstD = getFirstDayOfMonth(year, month);

      const cells = [];
      for (let i = 0; i < firstD; i++) {
        cells.push(<div key={`empty-${i}`} className="mui-daterangepicker-cell mui-daterangepicker-cell-empty" />);
      }

      for (let day = 1; day <= daysInM; day++) {
        const d = new Date(year, month, day);
        const isDayDisabled = isDateDisabled(year, month, day);
        const isToday = isSameDay(d, today);

        const activeStart = tempStart ?? startDate;
        const activeEnd = selecting === "end" && tempStart && hoverDate
          ? (hoverDate >= tempStart ? hoverDate : tempStart)
          : endDate;
        const actualStart = tempStart ?? startDate;
        const actualEnd = selecting === "end" && tempStart && hoverDate
          ? (hoverDate < tempStart ? hoverDate : null)
          : null;
        const rangeStart = actualEnd ?? actualStart;
        const rangeEnd = actualEnd ? actualStart : activeEnd;

        const isStart = rangeStart ? isSameDay(d, rangeStart) : false;
        const isEnd = rangeEnd ? isSameDay(d, rangeEnd) : false;
        const inRange = rangeStart && rangeEnd
          ? isInRange(d, rangeStart < rangeEnd ? rangeStart : rangeEnd, rangeStart < rangeEnd ? rangeEnd : rangeStart)
          : false;

        const isHoverRange = selecting === "end" && tempStart && hoverDate
          ? isInRange(
              d,
              tempStart <= hoverDate ? tempStart : hoverDate,
              tempStart <= hoverDate ? hoverDate : tempStart,
            )
          : false;

        const isHoverEnd = selecting === "end" && hoverDate ? isSameDay(d, hoverDate) : false;

        const cellClasses = [
          "mui-daterangepicker-cell",
          isStart ? "mui-daterangepicker-cell-start" : "",
          isEnd ? "mui-daterangepicker-cell-end" : "",
          inRange ? "mui-daterangepicker-cell-in-range" : "",
          isHoverRange ? "mui-daterangepicker-cell-hover-range" : "",
          isHoverEnd && !isStart ? "mui-daterangepicker-cell-hover-end" : "",
          isToday && !isStart && !isEnd ? "mui-daterangepicker-cell-today" : "",
          isDayDisabled ? "mui-daterangepicker-cell-disabled" : "",
        ].filter(Boolean).join(" ");

        cells.push(
          <button
            key={day}
            type="button"
            className={cellClasses}
            disabled={isDayDisabled}
            onClick={() => handleDayClick(d)}
            onMouseEnter={() => setHoverDate(d)}
            onMouseLeave={() => setHoverDate(null)}
            tabIndex={-1}
          >
            {day}
          </button>,
        );
      }
      return cells;
    }

    const presets = useMemo(() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return [
        { label: "Today", start: t, end: t },
        { label: "Last 7 days", start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6), end: t },
        { label: "Last 30 days", start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29), end: t },
        { label: "This month", start: new Date(t.getFullYear(), t.getMonth(), 1), end: t },
        { label: "Last month", start: new Date(t.getFullYear(), t.getMonth() - 1, 1), end: new Date(t.getFullYear(), t.getMonth(), 0) },
      ];
    }, []);

    const dropdown = isOpen ? (
      <div
        ref={dropdownRef}
        className="mui-daterangepicker-dropdown"
        style={dropdownStyles}
        role="dialog"
        aria-label="Choose date range"
      >
        <div className="mui-daterangepicker-body">
          <div className="mui-daterangepicker-presets">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="mui-daterangepicker-preset-btn"
                onClick={() => {
                  commitValue({
                    start: toDateString(p.start),
                    end: toDateString(p.end),
                  });
                  closeDropdown();
                  triggerRef.current?.focus();
                }}
                tabIndex={-1}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mui-daterangepicker-calendars">
            <div className="mui-daterangepicker-calendar">
              <div className="mui-daterangepicker-header">
                <button type="button" className="mui-daterangepicker-nav-btn" onClick={prevMonth} tabIndex={-1}>
                  <ChevronLeft size={18} />
                </button>
                <span className="mui-daterangepicker-month-year">{MONTHS[leftMonth]} {leftYear}</span>
                <div style={{ width: 32 }} />
              </div>
              <div className="mui-daterangepicker-weekdays">
                {DAYS.map((d) => (<div key={d} className="mui-daterangepicker-weekday">{d}</div>))}
              </div>
              <div className="mui-daterangepicker-grid">
                {renderMonth(leftYear, leftMonth)}
              </div>
            </div>

            <div className="mui-daterangepicker-calendar">
              <div className="mui-daterangepicker-header">
                <div style={{ width: 32 }} />
                <span className="mui-daterangepicker-month-year">{MONTHS[rightMonth]} {rightYear}</span>
                <button type="button" className="mui-daterangepicker-nav-btn" onClick={nextMonth} tabIndex={-1}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="mui-daterangepicker-weekdays">
                {DAYS.map((d) => (<div key={`r-${d}`} className="mui-daterangepicker-weekday">{d}</div>))}
              </div>
              <div className="mui-daterangepicker-grid">
                {renderMonth(rightYear, rightMonth)}
              </div>
            </div>
          </div>
        </div>

        <div className="mui-daterangepicker-footer">
          <span className="mui-daterangepicker-summary">
            {selecting === "end" && tempStart
              ? `${formatShort(tempStart)} — ...`
              : startDate && endDate
                ? `${formatShort(startDate)} — ${formatShort(endDate)}`
                : "Select start date"}
          </span>
        </div>
      </div>
    ) : null;

    return (
      <div className={rootClasses}>
        {label && (
          <label htmlFor={triggerId} className="mui-daterangepicker-label">
            {label}
            {required && <span aria-hidden> *</span>}
          </label>
        )}

        <div className="mui-daterangepicker-input-wrapper">
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
            className="mui-daterangepicker-trigger"
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
          >
            <Calendar size={18} className="mui-daterangepicker-icon" />
            <span className={displayValue ? "mui-daterangepicker-value" : "mui-daterangepicker-placeholder"}>
              {displayValue ?? placeholder}
            </span>
          </button>

          {clearable && currentValue?.start && !disabled && (
            <button
              type="button"
              className="mui-daterangepicker-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear date range"
            >
              <X size={16} />
            </button>
          )}

          {name && (
            <>
              <input type="hidden" name={`${name}_start`} value={currentValue?.start ?? ""} />
              <input type="hidden" name={`${name}_end`} value={currentValue?.end ?? ""} />
            </>
          )}

          <fieldset aria-hidden className="mui-daterangepicker-outline">
            <legend className="mui-daterangepicker-outline-legend">
              {label ? (
                <span>{label}{required && " *"}</span>
              ) : (
                <span className="mui-daterangepicker-outline-legend-empty" />
              )}
            </legend>
          </fieldset>
        </div>

        {helperText && (
          <p id={helperId} className="mui-daterangepicker-helper">
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

export default DateRangePicker;
