import type { Note, PromptTemplate } from '@/types/note'
import { defaultTemplates } from '@/constants/promptTemplates'

export function applyTemplate(
  template: PromptTemplate,
  note: Note,
  content: string,
): string {
  return template.template
    .replace(/\{\{title\}\}/g, note.title || 'Untitled')
    .replace(/\{\{content\}\}/g, content)
}

export function buildFullCopyText(note: Note): string {
  const header = `[Note: "${note.title || 'Untitled'}" | Category: ${note.category}]\n\n`
  return header + note.content
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

export function getRelevantTemplates(category: string): PromptTemplate[] {
  const matched = defaultTemplates.filter((t) => t.category === category)
  const general = defaultTemplates.filter((t) => t.category === 'general')
  const rest = defaultTemplates.filter(
    (t) => t.category !== category && t.category !== 'general',
  )
  return [...matched, ...general, ...rest]
}
