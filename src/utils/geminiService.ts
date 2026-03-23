const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MODEL = 'gemini-2.0-flash'

const STORAGE_KEY = 'kab_gemini_api_key'

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

export type ImportFileType = 'image' | 'pdf' | 'audio' | 'video' | 'markdown' | 'text'

const MIME_MAP: Record<string, ImportFileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/heic': 'image',
  'application/pdf': 'pdf',
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  'audio/mp4': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'text/markdown': 'markdown',
  'text/plain': 'text',
  'text/html': 'text',
  'text/csv': 'text',
}

export function detectFileType(file: File): ImportFileType | null {
  if (MIME_MAP[file.type]) return MIME_MAP[file.type] as ImportFileType
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'webm'].includes(ext)) return 'audio'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (ext === 'md') return 'markdown'
  if (['txt', 'html', 'csv', 'json', 'xml', 'log'].includes(ext)) return 'text'
  return null
}

export const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic',
  '.pdf',
  '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a',
  '.mp4', '.webm', '.mov', '.avi',
  '.md', '.txt', '.html', '.csv',
].join(',')

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function uploadToGeminiFileApi(file: File, apiKey: string): Promise<string> {
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(file.size),
        'X-Goog-Upload-Header-Content-Type': file.type,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { displayName: file.name },
      }),
    },
  )

  const uploadUrl = startRes.headers.get('X-Goog-Upload-URL')
  if (!uploadUrl) throw new Error('Failed to get upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': file.type,
    },
    body: file,
  })

  const uploadData = await uploadRes.json()
  const fileUri = uploadData.file?.uri
  if (!fileUri) throw new Error('File upload failed')

  const fileName = uploadData.file.name
  let state = uploadData.file.state
  while (state === 'PROCESSING') {
    await new Promise((r) => setTimeout(r, 2000))
    const checkRes = await fetch(
      `${API_BASE}/${fileName}?key=${apiKey}`,
    )
    const checkData = await checkRes.json()
    state = checkData.state
    if (state === 'FAILED') throw new Error('File processing failed')
  }

  return fileUri
}

interface GeminiResult {
  title: string
  content: string
}

const PROMPTS: Record<ImportFileType, string> = {
  image: `이 이미지의 내용을 분석하여 Markdown 문서로 변환해주세요.
- 이미지에 텍스트가 있으면 원문 그대로 추출하세요 (OCR).
- 텍스트가 없으면 이미지 내용을 상세히 설명하세요.
- 제목(첫 줄에 # 사용)을 포함해주세요.
- 원본의 구조와 형식을 최대한 유지하세요.`,

  pdf: `이 PDF 문서의 내용을 Markdown 형식으로 변환해주세요.
- 원문 텍스트를 그대로 추출하세요.
- 제목, 소제목, 목록, 표 등 원본 구조를 Markdown으로 유지하세요.
- 제목(첫 줄에 # 사용)을 포함해주세요.
- 내용을 요약하지 말고, 원문 그대로 보존하세요.`,

  audio: `이 오디오 파일의 내용을 텍스트로 변환(전사)해주세요.
- 말한 내용을 가능한 원문 그대로 텍스트로 적어주세요.
- 적절한 단락 구분을 해주세요.
- 제목(첫 줄에 # 사용)을 포함해주세요.
- Markdown 형식으로 출력하세요.`,

  video: `이 비디오의 내용을 Markdown 문서로 변환해주세요.
- 음성이 있으면 전사(transcription)해주세요.
- 중요한 화면 내용(텍스트, 슬라이드 등)도 설명해주세요.
- 제목(첫 줄에 # 사용)을 포함해주세요.
- 타임스탬프가 있으면 포함해주세요.`,

  markdown: '',
  text: '',
}

// --- YouTube URL ---

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url)
}

function normalizeYouTubeUrl(url: string): string {
  const match = url.match(YOUTUBE_REGEX)
  if (!match) return url
  return `https://www.youtube.com/watch?v=${match[1]}`
}

export async function processYouTubeUrl(url: string): Promise<GeminiResult> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('YouTube 영상 처리에는 Gemini API 키가 필요합니다. Settings에서 설정해주세요.')

  const normalizedUrl = normalizeYouTubeUrl(url)

  const prompt = `이 YouTube 영상의 내용을 Markdown 문서로 변환해주세요.

- 영상의 음성/자막 내용을 가능한 원문 그대로 전사해주세요.
- 적절한 단락과 소제목으로 구조화해주세요.
- 제목(첫 줄에 # 사용)을 포함해주세요.
- 핵심 내용이나 요점이 있으면 별도로 정리해주세요.
- 타임스탬프를 포함해주세요.
- Markdown 형식으로 출력하세요.`

  const parts = [
    { text: prompt },
    {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: normalizedUrl,
      },
    },
  ]

  const res = await fetch(
    `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const msg = err?.error?.message || `API error: ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini API에서 응답을 받지 못했습니다.')

  const titleMatch = text.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : 'YouTube Video'

  return { title, content: text }
}

// --- File processing ---

export async function processFile(file: File): Promise<GeminiResult> {
  const fileType = detectFileType(file)
  if (!fileType) throw new Error(`지원하지 않는 파일 형식입니다: ${file.name}`)

  const baseName = file.name.replace(/\.[^.]+$/, '')

  if (fileType === 'markdown' || fileType === 'text') {
    const text = await fileToText(file)
    return {
      title: baseName,
      content: text,
    }
  }

  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다. Settings에서 설정해주세요.')

  const prompt = PROMPTS[fileType]

  let parts: unknown[]

  if (fileType === 'audio' || fileType === 'video') {
    const fileUri = await uploadToGeminiFileApi(file, apiKey)
    parts = [
      { text: prompt },
      { fileData: { mimeType: file.type, fileUri } },
    ]
  } else {
    const base64 = await fileToBase64(file)
    parts = [
      { text: prompt },
      { inlineData: { mimeType: file.type || 'application/octet-stream', data: base64 } },
    ]
  }

  const res = await fetch(
    `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const msg = err?.error?.message || `API error: ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini API에서 응답을 받지 못했습니다.')

  const titleMatch = text.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : baseName

  return { title, content: text }
}
