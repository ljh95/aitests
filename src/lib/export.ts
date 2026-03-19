import type { Note } from '@/types/note'

export function exportNotesAsJson(notes: Note[]): string {
  return JSON.stringify(notes, null, 2)
}

export function importNotesFromJson(json: string): Note[] | null {
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    // Basic validation
    for (const item of parsed) {
      if (!item.id || !item.createdAt || typeof item.content !== 'string') {
        return null
      }
    }
    return parsed as Note[]
  } catch {
    return null
  }
}

export function exportSingleNoteAsMd(note: Note): string {
  const frontmatter = [
    '---',
    `title: "${note.title}"`,
    `category: ${note.category}`,
    `tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    '---',
    '',
  ].join('\n')
  return frontmatter + note.content
}

export function downloadFile(content: string, filename: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}
