const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single'
const MAX_CHUNK_LENGTH = 4500

async function translateChunk(text: string, source = 'en', target = 'ko'): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const params = new URLSearchParams({
    client: 'gtx',
    sl: source,
    tl: target,
    dt: 't',
    q: trimmed,
  })

  const res = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`)
  if (!res.ok) throw new Error(`Translation API error: ${res.status}`)

  const data = await res.json() as [Array<[string, string]>]
  return data[0].map(segment => segment[0]).join('')
}

function splitIntoParagraphs(content: string): string[] {
  return content.split(/\n\n+/)
}

function splitLongParagraph(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text]

  const sentences = text.split(/(?<=[.!?。！？])\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current.trim())
      current = ''
    }
    current += (current ? ' ' : '') + sentence
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

function isCodeBlock(paragraph: string): boolean {
  return paragraph.startsWith('```') || paragraph.startsWith('    ')
}

function isMarkdownMeta(paragraph: string): boolean {
  return /^(#{1,6}\s|[-*>]|\||\d+\.)/.test(paragraph.trim())
}

function extractTextFromMarkdown(paragraph: string): { prefix: string; text: string } {
  const headingMatch = paragraph.match(/^(#{1,6}\s+)(.*)/)
  if (headingMatch) return { prefix: headingMatch[1]!, text: headingMatch[2]! }

  const listMatch = paragraph.match(/^([-*]\s+|\d+\.\s+)(.*)/)
  if (listMatch) return { prefix: listMatch[1]!, text: listMatch[2]! }

  const quoteMatch = paragraph.match(/^(>\s+)(.*)/)
  if (quoteMatch) return { prefix: quoteMatch[1]!, text: quoteMatch[2]! }

  return { prefix: '', text: paragraph }
}

export async function translateContent(
  content: string,
  onProgress?: (progress: number) => void,
  source = 'en',
  target = 'ko',
): Promise<string> {
  const paragraphs = splitIntoParagraphs(content)
  const translated: string[] = []
  let completed = 0

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      translated.push('')
      completed++
      continue
    }

    if (isCodeBlock(paragraph)) {
      translated.push(paragraph)
      completed++
      onProgress?.(completed / paragraphs.length)
      continue
    }

    if (isMarkdownMeta(paragraph)) {
      const { prefix, text } = extractTextFromMarkdown(paragraph)
      const chunks = splitLongParagraph(text)
      const translatedChunks: string[] = []

      for (const chunk of chunks) {
        const result = await translateChunk(chunk, source, target)
        translatedChunks.push(result)
      }

      translated.push(prefix + translatedChunks.join(' '))
    } else {
      const chunks = splitLongParagraph(paragraph)
      const translatedChunks: string[] = []

      for (const chunk of chunks) {
        const result = await translateChunk(chunk, source, target)
        translatedChunks.push(result)
      }

      translated.push(translatedChunks.join(' '))
    }

    completed++
    onProgress?.(completed / paragraphs.length)
  }

  return translated.join('\n\n')
}

export function buildBilingualContent(original: string, translated: string): string {
  const origParagraphs = splitIntoParagraphs(original)
  const transParagraphs = splitIntoParagraphs(translated)
  const result: string[] = []

  const maxLen = Math.max(origParagraphs.length, transParagraphs.length)

  for (let i = 0; i < maxLen; i++) {
    const orig = origParagraphs[i]?.trim() ?? ''
    const trans = transParagraphs[i]?.trim() ?? ''

    if (orig && isCodeBlock(orig)) {
      result.push(orig)
      continue
    }

    if (orig) result.push(orig)
    if (trans && trans !== orig) result.push(`> ${trans}`)
  }

  return result.join('\n\n')
}
