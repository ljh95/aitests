import TurndownService from 'turndown'
import { Readability } from '@mozilla/readability'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

turndown.remove(['script', 'style', 'nav', 'footer', 'iframe', 'noscript'])

turndown.addRule('images', {
  filter: 'img',
  replacement(_content, node) {
    const el = node as HTMLImageElement
    const alt = el.getAttribute('alt') || ''
    const src = el.getAttribute('src') || ''
    return src ? `![${alt}](${src})` : ''
  },
})

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

async function fetchHtml(url: string): Promise<string> {
  // same-origin이면 직접 fetch
  if (isSameOrigin(url)) {
    const res = await fetch(url)
    if (res.ok) return await res.text()
  }

  // cross-origin은 바로 프록시 사용 (CORS 콘솔 에러 방지)
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(url)
      const res = await fetch(proxyUrl)
      if (res.ok) {
        const text = await res.text()
        if (text) return text
      }
    } catch {
      // try next proxy
    }
  }

  throw new Error('URL을 가져올 수 없습니다. 모든 프록시 시도가 실패했습니다.')
}

export interface FetchResult {
  title: string
  content: string
  url: string
}

export async function fetchUrlAsMarkdown(url: string): Promise<FetchResult> {
  const html = await fetchHtml(url)

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const base = doc.createElement('base')
  base.href = url
  doc.head.prepend(base)

  const reader = new Readability(doc.cloneNode(true) as Document)
  const article = reader.parse()

  if (article?.content) {
    const markdown = turndown.turndown(article.content)
    return {
      title: article.title || extractTitleFromUrl(url),
      content: markdown,
      url,
    }
  }

  const body = doc.body
  const markdown = turndown.turndown(body.innerHTML)
  const title = doc.querySelector('title')?.textContent ?? extractTitleFromUrl(url)

  return { title, content: markdown, url }
}

function extractTitleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return hostname
  } catch {
    return 'Imported from URL'
  }
}
