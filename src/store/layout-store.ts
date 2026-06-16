import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

/** How the Document page renders the main pane: the markdown editor or the Sigma graph. */
export type DocumentViewMode = "editor" | "graph";

interface LayoutState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  documentViewMode: DocumentViewMode;
  /** True once the persisted state has been read from localStorage on the client. */
  hasHydrated: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setDocumentViewMode: (mode: DocumentViewMode) => void;
  toggleDocumentViewMode: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      documentViewMode: "editor",
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setDocumentViewMode: (mode) => set({ documentViewMode: mode }),
      toggleDocumentViewMode: () =>
        set((state) => ({
          documentViewMode: state.documentViewMode === "graph" ? "editor" : "graph",
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "layout-storage",
      storage: createJSONStorage(() => localStorage),
      // `mobileSidebarOpen` is ephemeral UI state — never restore it on load.
      partialize: ({ theme, sidebarCollapsed, documentViewMode }) => ({
        theme,
        sidebarCollapsed,
        documentViewMode,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
