import { useEffect } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore } from '@/store/uiStore'

export function useKeyboard() {
  const createNote = useNoteStore((s) => s.createNote)
  const toggleViewMode = useUIStore((s) => s.toggleViewMode)
  const setAICopyPanelOpen = useUIStore((s) => s.setAICopyPanelOpen)
  const aiCopyPanelOpen = useUIStore((s) => s.aiCopyPanelOpen)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd+N: New note
      if (isMod && e.key === 'n') {
        e.preventDefault()
        createNote()
      }

      // Cmd+E: Toggle edit/preview
      if (isMod && e.key === 'e') {
        e.preventDefault()
        toggleViewMode()
      }

      // Cmd+Shift+C: Toggle AI copy panel
      if (isMod && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setAICopyPanelOpen(!aiCopyPanelOpen)
      }

      // Cmd+K: Focus search
      if (isMod && e.key === 'k') {
        e.preventDefault()
        const el = document.getElementById('kab-search')
        if (el) el.focus()
      }

      // Escape: Close panels
      if (e.key === 'Escape') {
        if (aiCopyPanelOpen) {
          setAICopyPanelOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createNote, toggleViewMode, setAICopyPanelOpen, aiCopyPanelOpen])
}
