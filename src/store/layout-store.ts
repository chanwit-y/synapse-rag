import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface LayoutState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  /** True once the persisted state has been read from localStorage on the client. */
  hasHydrated: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
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
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "layout-storage",
      storage: createJSONStorage(() => localStorage),
      // `mobileSidebarOpen` is ephemeral UI state — never restore it on load.
      partialize: ({ theme, sidebarCollapsed }) => ({ theme, sidebarCollapsed }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
