import { create } from 'zustand'

type ViewMode = 'edit' | 'preview'
type Theme = 'dark' | 'light'
export type PreviewLang = 'original' | 'korean' | 'bilingual'

const isMobile = () => window.innerWidth <= 768

interface UIState {
  sidebarOpen: boolean
  viewMode: ViewMode
  aiCopyPanelOpen: boolean
  theme: Theme
  previewLang: PreviewLang

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  setAICopyPanelOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setPreviewLang: (lang: PreviewLang) => void
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('kab_theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'dark'
}

const initialTheme = getInitialTheme()
document.documentElement.dataset.theme = initialTheme

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: !isMobile(),
  viewMode: 'edit',
  aiCopyPanelOpen: false,
  theme: initialTheme,
  previewLang: 'original' as PreviewLang,

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () =>
    set({ viewMode: get().viewMode === 'edit' ? 'preview' : 'edit' }),
  setAICopyPanelOpen: (open) => set({ aiCopyPanelOpen: open }),
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('kab_theme', theme) } catch {}
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  setPreviewLang: (lang) => set({ previewLang: lang }),
}))
