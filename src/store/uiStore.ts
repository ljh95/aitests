import { create } from 'zustand'

type ViewMode = 'edit' | 'preview'

interface UIState {
  sidebarOpen: boolean
  viewMode: ViewMode
  aiCopyPanelOpen: boolean

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  setAICopyPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  viewMode: 'edit',
  aiCopyPanelOpen: false,

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () =>
    set({ viewMode: get().viewMode === 'edit' ? 'preview' : 'edit' }),
  setAICopyPanelOpen: (open) => set({ aiCopyPanelOpen: open }),
}))
