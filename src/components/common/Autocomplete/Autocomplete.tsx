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
import { AlertCircle, Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import "./Autocomplete.css";

type Variant = "outlined" | "filled" | "standard";
type Size = "small" | "medium";
type Color = "primary" | "secondary" | "error";

export type AutocompleteOption = {
  /** Underlying value used for selection. */
  value: string | number;
  /** Display node rendered in the trigger and option list. */
  label: ReactNode;
  /** Optional plain string used for filtering when label is non-string. */
  searchText?: string;
  /** Disable selection of this option. */
  disabled?: boolean;
};

type AutocompletePropsBase = {
  /** Visual variant of the trigger field. */
  variant?: Variant;
  /** Size of the trigger field. */
  size?: Size;
  /** Theme color applied on focus. */
  color?: Color;
  /** Label text displayed above / inside the field. */
  label?: ReactNode;
  /** Helper text displayed below the field. */
  helperText?: ReactNode;
  /** Message shown in place of helperText when error is true. */
  errorMessage?: ReactNode;
  /** If true, the field is styled in an error state. */
  error?: boolean;
  /** If true, the field takes the full width of its container. */
  fullWidth?: boolean;
  /** Options to display in the dropdown list. */
  options: AutocompleteOption[];
  /** Placeholder shown when no option is selected. */
  placeholder?: string;
  /** Placeholder text for the dropdown search input. */
  searchPlaceholder?: string;
  /** Empty-state node when filter yields no matches. */
  noResultsText?: ReactNode;
  /** Loading-state node when loading is true. */
  loadingText?: ReactNode;
  /** Show a loading indicator and override empty state. */
  loading?: boolean;
  /** Disable the trigger. */
  disabled?: boolean;
  /** Mark field as required (renders a "*" near the label). */
  required?: boolean;
  /** Class name applied to the root element. */
  className?: string;
  /** DOM id forwarded to the trigger button. */
  id?: string;
  /** Form name. */
  name?: string;
  /** Render the dropdown into document.body via a portal. Defaults to true. */
  usePortal?: boolean;
  /** Maximum dropdown height in pixels. Defaults to 280. */
  maxDropdownHeight?: number;
  /** Called when the search query inside the dropdown changes. */
  onSearchChange?: (query: string) => void;
  /** Called after the dropdown is closed. */
  onBlur?: () => void;
};

export type AutocompleteProps =
  | (AutocompletePropsBase & {
      multiple?: false;
      /** Controlled selected value. */
      value?: string | number | null;
      /** Initial value when uncontrolled. */
      defaultValue?: string | number | null;
      /** Called when the selection changes. Receives null when cleared. */
      onChange?: (value: string | number | null) => void;
    })
  | (AutocompletePropsBase & {
      multiple: true;
      /** Controlled selected values. */
      value?: (string | number)[];
      /** Initial values when uncontrolled. */
      defaultValue?: (string | number)[];
      /** Called when the selection changes. */
      onChange?: (value: (string | number)[]) => void;
    });

const VARIANT_CLASS: Record<Variant, string> = {
  outlined: "mui-autocomplete-outlined",
  filled: "mui-autocomplete-filled",
  standard: "mui-autocomplete-standard",
};

const SIZE_CLASS: Record<Size, string> = {
  small: "mui-autocomplete-small",
  medium: "mui-autocomplete-medium",
};

const COLOR_CLASS: Record<Color, string> = {
  primary: "mui-autocomplete-color-primary",
  secondary: "mui-autocomplete-color-secondary",
  error: "mui-autocomplete-color-error",
};

const DEFAULT_DROPDOWN_HEIGHT = 280;

const optionSearchString = (opt: AutocompleteOption): string => {
  if (opt.searchText) return opt.searchText;
  if (typeof opt.label === "string" || typeof opt.label === "number") {
    return String(opt.label);
  }
  return String(opt.value);
};

const Autocomplete = forwardRef<HTMLButtonElement, AutocompleteProps>(
  function Autocomplete(props, ref) {
    const {
      variant = "outlined",
      size = "medium",
      color = "primary",
      label,
      helperText,
      errorMessage,
      error,
      fullWidth,
      options,
      value,
      defaultValue,
      placeholder,
      searchPlaceholder = "Type to search...",
      noResultsText = "No results found",
      loadingText = "Loading...",
      loading = false,
      disabled,
      required,
      className = "",
      id,
      name,
      usePortal = true,
      maxDropdownHeight = DEFAULT_DROPDOWN_HEIGHT,
      multiple = false,
      onChange,
      onSearchChange,
      onBlur,
    } = props;

    const autoId = useId();
    const triggerId = id ?? autoId;
    const helperId = `${triggerId}-helper`;
    const listboxId = `${triggerId}-listbox`;

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | number | null>(
      !multiple ? ((defaultValue as string | number | null | undefined) ?? null) : null,
    );
    const [internalValues, setInternalValues] = useState<(string | number)[]>(
      multiple ? ((defaultValue as (string | number)[] | undefined) ?? []) : [],
    );

    const currentValue = !multiple
      ? isControlled
        ? (value as string | number | null | undefined) ?? null
        : internalValue
      : null;

    const currentValues = multiple
      ? isControlled
        ? (value as (string | number)[] | undefined) ?? []
        : internalValues
      : [];

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

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

    const filteredOptions = useMemo(() => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) return options;
      return options.filter((opt) =>
        optionSearchString(opt).toLowerCase().includes(trimmed),
      );
    }, [options, query]);

    const selectedOption = useMemo(
      () =>
        !multiple && currentValue != null
          ? options.find((opt) => String(opt.value) === String(currentValue))
          : undefined,
      [options, currentValue, multiple],
    );

    const selectedOptions = useMemo(
      () =>
        multiple
          ? options.filter((opt) =>
              currentValues.some((v) => String(v) === String(opt.value)),
            )
          : [],
      [options, currentValues, multiple],
    );

    const isOptionSelected = useCallback(
      (opt: AutocompleteOption) => {
        if (multiple) {
          return currentValues.some((v) => String(v) === String(opt.value));
        }
        return (
          currentValue != null && String(currentValue) === String(opt.value)
        );
      },
      [multiple, currentValues, currentValue],
    );

    const hasError = !!error && !!errorMessage;
    const displayHelperText = hasError ? errorMessage : helperText;

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
      setQuery("");
      setActiveIndex(-1);
      onBlur?.();
    }, [onBlur]);

    const openDropdown = useCallback(() => {
      if (disabled) return;
      computeDropdownStyles();
      setIsOpen(true);
      setActiveIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }, [computeDropdownStyles, disabled]);

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
        if (!multiple) {
          (onChange as ((value: string | number | null) => void) | undefined)?.(
            next,
          );
        }
      },
      [isControlled, onChange, multiple],
    );

    const commitValues = useCallback(
      (next: (string | number)[]) => {
        if (!isControlled) {
          setInternalValues(next);
        }
        if (multiple) {
          (onChange as ((value: (string | number)[]) => void) | undefined)?.(
            next,
          );
        }
      },
      [isControlled, onChange, multiple],
    );

    const handleSelect = useCallback(
      (option: AutocompleteOption) => {
        if (option.disabled) return;

        if (multiple) {
          const isSelected = currentValues.some(
            (v) => String(v) === String(option.value),
          );
          const next = isSelected
            ? currentValues.filter((v) => String(v) !== String(option.value))
            : [...currentValues, option.value];
          commitValues(next);
          setTimeout(() => searchInputRef.current?.focus(), 0);
          return;
        }

        commitValue(option.value);
        setIsOpen(false);
        setQuery("");
        setActiveIndex(-1);
        onBlur?.();
        triggerRef.current?.focus();
      },
      [multiple, currentValues, commitValue, commitValues, onBlur],
    );

    const handleRemoveChip = useCallback(
      (e: React.MouseEvent, optionValue: string | number) => {
        e.stopPropagation();
        if (!multiple) return;
        commitValues(
          currentValues.filter((v) => String(v) !== String(optionValue)),
        );
      },
      [multiple, currentValues, commitValues],
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (multiple) {
          commitValues([]);
        } else {
          commitValue(null);
        }
        setQuery("");
      },
      [multiple, commitValue, commitValues],
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setQuery(next);
        onSearchChange?.(next);
      },
      [onSearchChange],
    );

    const handleTriggerKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (!isOpen) {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            openDropdown();
          }
          return;
        }
      },
      [disabled, isOpen, openDropdown],
    );

    const handleSearchKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setActiveIndex((prev) =>
              filteredOptions.length === 0
                ? -1
                : prev < filteredOptions.length - 1
                  ? prev + 1
                  : 0,
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setActiveIndex((prev) =>
              filteredOptions.length === 0
                ? -1
                : prev > 0
                  ? prev - 1
                  : filteredOptions.length - 1,
            );
            break;
          case "Enter": {
            e.preventDefault();
            const target =
              activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;
            if (target) handleSelect(target);
            break;
          }
          case "Escape":
            e.preventDefault();
            closeDropdown();
            triggerRef.current?.focus();
            break;
          case "Tab":
            closeDropdown();
            break;
        }
      },
      [activeIndex, filteredOptions, handleSelect, closeDropdown],
    );

    useEffect(() => setActiveIndex(-1), [query]);

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

    const hasSelection = multiple
      ? selectedOptions.length > 0
      : !!selectedOption;

    const rootClasses = [
      "mui-autocomplete",
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      COLOR_CLASS[error ? "error" : color],
      isOpen ? "mui-autocomplete-focused" : "",
      disabled ? "mui-autocomplete-disabled" : "",
      error ? "mui-autocomplete-error" : "",
      fullWidth ? "mui-autocomplete-fullwidth" : "",
      shrinkLabel ? "mui-autocomplete-label-shrink" : "",
      label ? "" : "mui-autocomplete-no-label",
      multiple ? "mui-autocomplete-multiple" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const dropdown = isOpen ? (
      <div
        ref={dropdownRef}
        className="mui-autocomplete-dropdown"
        style={dropdownStyles}
        role="presentation"
      >
        <div className="mui-autocomplete-search">
          <Search className="mui-autocomplete-search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            type="text"
            className="mui-autocomplete-search-input"
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              className="mui-autocomplete-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className="mui-autocomplete-listbox"
          style={{ maxHeight: maxDropdownHeight - 48 }}
        >
          {loading ? (
            <li className="mui-autocomplete-state-row">
              <Loader2
                className="mui-autocomplete-spinner"
                size={16}
                aria-hidden
              />
              <span>{loadingText}</span>
            </li>
          ) : filteredOptions.length === 0 ? (
            <li className="mui-autocomplete-state-row mui-autocomplete-empty">
              {noResultsText}
            </li>
          ) : (
            filteredOptions.map((opt, index) => {
              const isActive = index === activeIndex;
              const isSelected = isOptionSelected(opt);
              const optionClasses = [
                "mui-autocomplete-option",
                isActive ? "mui-autocomplete-option-active" : "",
                isSelected ? "mui-autocomplete-option-selected" : "",
                opt.disabled ? "mui-autocomplete-option-disabled" : "",
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
                  <span className="mui-autocomplete-option-label">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check
                      className="mui-autocomplete-option-check"
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
        <div className="mui-autocomplete-input-wrapper">
          {label && (
            <label
              htmlFor={triggerId}
              className="mui-autocomplete-label"
            >
              {label}
              {required && <span aria-hidden> *</span>}
            </label>
          )}

          <span className="mui-autocomplete-adornment mui-autocomplete-adornment-start">
            <Search size={16} aria-hidden />
          </span>

          <button
            ref={setTriggerRef}
            id={triggerId}
            name={name}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-describedby={displayHelperText ? helperId : undefined}
            aria-invalid={error || undefined}
            disabled={disabled}
            className="mui-autocomplete-trigger"
            onClick={toggleDropdown}
            onKeyDown={handleTriggerKeyDown}
          >
            {multiple ? (
              selectedOptions.length > 0 ? (
                <span className="mui-autocomplete-chips">
                  {selectedOptions.map((opt) => (
                    <span key={String(opt.value)} className="mui-autocomplete-chip">
                      <span className="mui-autocomplete-chip-label">
                        {opt.label}
                      </span>
                      <button
                        type="button"
                        className="mui-autocomplete-chip-remove"
                        aria-label={`Remove ${optionSearchString(opt)}`}
                        onClick={(e) => handleRemoveChip(e, opt.value)}
                        tabIndex={-1}
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="mui-autocomplete-placeholder">
                  {placeholder ?? ""}
                </span>
              )
            ) : (
              <span
                className={
                  selectedOption
                    ? "mui-autocomplete-value"
                    : "mui-autocomplete-placeholder"
                }
              >
                {selectedOption ? selectedOption.label : placeholder ?? ""}
              </span>
            )}
          </button>

          <span className="mui-autocomplete-adornment mui-autocomplete-adornment-end">
            {loading && (
              <Loader2
                className="mui-autocomplete-spinner"
                size={16}
                aria-hidden
              />
            )}
            {!loading && hasSelection && !disabled && (
              <button
                type="button"
                className="mui-autocomplete-clear"
                onClick={handleClear}
                aria-label={multiple ? "Clear all selections" : "Clear selection"}
                tabIndex={-1}
              >
                <X size={14} aria-hidden />
              </button>
            )}
            <ChevronDown
              size={18}
              className={
                isOpen
                  ? "mui-autocomplete-chevron mui-autocomplete-chevron-open"
                  : "mui-autocomplete-chevron"
              }
              aria-hidden
            />
          </span>

          {variant === "outlined" && (
            <fieldset
              aria-hidden
              className="mui-autocomplete-outline"
            >
              <legend className="mui-autocomplete-outline-legend">
                {shrinkLabel && label ? (
                  <span>
                    {label}
                    {required && " *"}
                  </span>
                ) : (
                  <span className="mui-autocomplete-outline-legend-empty" />
                )}
              </legend>
            </fieldset>
          )}
        </div>

        {displayHelperText && (
          <p
            id={helperId}
            className={
              hasError
                ? "mui-autocomplete-helper mui-autocomplete-helper-error"
                : "mui-autocomplete-helper"
            }
          >
            {hasError && (
              <AlertCircle size={12} className="mui-autocomplete-helper-icon" />
            )}
            {displayHelperText}
          </p>
        )}

        {mounted && isOpen && usePortal
          ? createPortal(dropdown, document.body)
          : dropdown}
      </div>
    );
  },
);

export default Autocomplete;
