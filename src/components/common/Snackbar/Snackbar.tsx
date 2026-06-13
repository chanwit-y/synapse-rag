"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  X,
  XCircle,
  type LucideProps,
} from "lucide-react";
import "./Snackbar.css";

export type SnackbarVariant =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "neutral";

export type SnackbarPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SnackbarOptions = {
  id?: string;
  title?: string;
  message: string;
  variant?: SnackbarVariant;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
};

type SnackbarMessage = {
  id: string;
  title?: string;
  message: string;
  variant: SnackbarVariant;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
  dismissible: boolean;
  createdAt: number;
};

export interface SnackbarProviderProps extends PropsWithChildren {
  duration?: number;
  position?: SnackbarPosition;
  maxSnackbars?: number;
  pauseOnHover?: boolean;
}

type SnackbarContextValue = {
  showSnackbar: (options: SnackbarOptions) => string;
  dismissSnackbar: (id: string) => void;
  clearSnackbars: () => void;
};

const defaultDuration = 4000;
const defaultPosition: SnackbarPosition = "bottom-right";
const defaultVariant: SnackbarVariant = "neutral";

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const variantIcons: Record<SnackbarVariant, ComponentType<LucideProps>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: Circle,
};

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `snackbar-${Date.now().toString(36)}-${Math.random()
    .toString(16)
    .slice(2, 8)}`;
};

const normalizeOptions = (options: SnackbarOptions): SnackbarMessage => {
  const {
    id = generateId(),
    title,
    message,
    variant = defaultVariant,
    duration = defaultDuration,
    actionLabel,
    onAction,
    dismissible = true,
  } = options;

  if (!message?.trim()) {
    throw new Error("Snackbar message cannot be empty");
  }

  return {
    id,
    title,
    message,
    variant,
    duration,
    actionLabel,
    onAction,
    dismissible,
    createdAt: Date.now(),
  };
};

export function SnackbarProvider({
  children,
  duration = defaultDuration,
  position = defaultPosition,
  maxSnackbars = 3,
  pauseOnHover = true,
}: SnackbarProviderProps) {
  const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const node = document.createElement("div");
    node.setAttribute("data-snackbar-portal", "true");
    document.body.append(node);
    setPortalNode(node);

    return () => {
      setPortalNode(null);
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      const normalized = normalizeOptions({
        duration,
        ...options,
      });

      setSnackbars((prev) => {
        const next = [...prev, normalized];
        if (maxSnackbars > 0 && next.length > maxSnackbars) {
          return next.slice(next.length - maxSnackbars);
        }
        return next;
      });

      return normalized.id;
    },
    [duration, maxSnackbars],
  );

  const dismissSnackbar = useCallback((id: string) => {
    setSnackbars((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearSnackbars = useCallback(() => {
    setSnackbars([]);
  }, []);

  const value = useMemo(
    () => ({
      showSnackbar,
      dismissSnackbar,
      clearSnackbars,
    }),
    [showSnackbar, dismissSnackbar, clearSnackbars],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {portalNode
        ? createPortal(
            <SnackbarContainer
              snackbars={snackbars}
              position={position}
              pauseOnHover={pauseOnHover}
              onDismiss={dismissSnackbar}
            />,
            portalNode,
          )
        : null}
    </SnackbarContext.Provider>
  );
}

type SnackbarContainerProps = {
  snackbars: SnackbarMessage[];
  position: SnackbarPosition;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
};

function SnackbarContainer({
  snackbars,
  position,
  pauseOnHover,
  onDismiss,
}: SnackbarContainerProps) {
  if (!snackbars.length) {
    return null;
  }

  return (
    <div
      className={`snackbar-container snackbar-container--${position}`}
      role="region"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {snackbars.map((snackbar) => (
        <SnackbarItem
          key={snackbar.id}
          snackbar={snackbar}
          pauseOnHover={pauseOnHover}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

type SnackbarItemProps = {
  snackbar: SnackbarMessage;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
};

function SnackbarItem({
  snackbar,
  pauseOnHover,
  onDismiss,
}: SnackbarItemProps) {
  const {
    id,
    title,
    message,
    variant,
    duration,
    actionLabel,
    onAction,
    dismissible,
  } = snackbar;
  const [isHovering, setIsHovering] = useState(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (duration <= 0 || duration === Infinity) return;
    if (pauseOnHover && isHovering) return;

    const timer = window.setTimeout(() => {
      onDismissRef.current(id);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, pauseOnHover, isHovering, id]);

  const Icon = variantIcons[variant];

  return (
    <div
      className={`snackbar snackbar--${variant}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      onMouseEnter={pauseOnHover ? () => setIsHovering(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsHovering(false) : undefined}
    >
      <span className="snackbar__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="snackbar__content">
        {title ? <p className="snackbar__title">{title}</p> : null}
        <p className="snackbar__message">{message}</p>
      </div>
      {actionLabel ? (
        <button
          type="button"
          className="snackbar__action"
          onClick={() => {
            onAction?.();
            onDismiss(id);
          }}
        >
          {actionLabel}
        </button>
      ) : null}
      {dismissible ? (
        <button
          type="button"
          className="snackbar__close"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(id)}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}

export const SnackbarConsumer = SnackbarContext.Consumer;
