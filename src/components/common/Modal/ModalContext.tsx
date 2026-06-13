"use client";

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

export interface ModalOptions {
  /** Unique key – prevents the same modal from stacking twice. */
  key?: string;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  title?: ReactNode;
  /** Hide the default close button in the header. */
  hideCloseButton?: boolean;
  /** Close when clicking the backdrop. @default true */
  closeOnBackdropClick?: boolean;
  /** Close when pressing Escape. @default true */
  closeOnEscape?: boolean;
  footer?: ReactNode;
}

export interface ModalEntry extends ModalOptions {
  id: string;
  content: ReactNode;
}

interface ModalContextValue {
  modals: ModalEntry[];
  openModal: (content: ReactNode, options?: ModalOptions) => string;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

let counter = 0;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalEntry[]>([]);

  const openModal = useCallback((content: ReactNode, options: ModalOptions = {}) => {
    const id = options.key ?? `modal-${++counter}`;

    setModals((prev) => {
      if (prev.some((m) => m.id === id)) return prev;
      return [...prev, { id, content, ...options }];
    });

    return id;
  }, []);

  const closeModal = useCallback((id?: string) => {
    setModals((prev) => {
      if (id) return prev.filter((m) => m.id !== id);
      return prev.slice(0, -1);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within a <ModalProvider>");
  }
  return ctx;
}
