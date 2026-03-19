# KAB - Knowledge AI Bridge

AI에게 내 지식을 효과적으로 전달하기 위한 마크다운 노트 앱.

노트를 작성하고, 원하는 부분만 골라서 AI 프롬프트 템플릿에 담아 클립보드에 복사할 수 있다.

## 주요 기능

- **마크다운 에디터/프리뷰** — CodeMirror 기반 편집, GFM 지원 프리뷰, 코드 구문 강조
- **카테고리 분류** — Study, Code, Life, Idea 4개 카테고리로 노트 정리
- **퍼지 검색** — 제목, 본문, 태그를 대상으로 Fuse.js 기반 실시간 검색
- **AI 카피 패널** — 3가지 모드로 AI에게 전달할 콘텐츠 구성
  - **Full** — 노트 전체를 헤더와 함께 복사
  - **Chunks** — 헤딩 단위로 원하는 섹션만 선택 복사
  - **Template** — 7개 프롬프트 템플릿 적용 (코드 리뷰, 요약, 퀴즈 등)
- **핀 고정** — 중요한 노트를 목록 상단에 고정
- **가져오기/내보내기** — JSON 백업·복원, 단일 노트 `.md` 내보내기
- **크로스 플랫폼** — 웹 + Android (Capacitor)

## 기술 스택

| 영역     | 기술                                                 |
| -------- | ---------------------------------------------------- |
| UI       | React 18, TypeScript                                 |
| 빌드     | Vite 8                                               |
| 상태관리 | Zustand                                              |
| 에디터   | CodeMirror 6 (@uiw/react-codemirror)                 |
| 프리뷰   | react-markdown, remark-gfm, react-syntax-highlighter |
| 검색     | Fuse.js                                              |
| 모바일   | Capacitor 8 (Android)                                |
| 스타일   | CSS Modules + CSS Custom Properties (다크 테마)      |

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 빌드 apk 결과물 만들기
npm run cap:apk
android/app/build/outputs/apk/debug
```

### Android 빌드

```bash
# 웹 빌드 후 Android 프로젝트 동기화
npm run build
npx cap sync android

# Android Studio에서 열기
npx cap open android
```

## 프로젝트 구조

```
src/
├── components/
│   ├── ai-copy/          # AI 카피 패널, 청크 선택기
│   ├── editor/           # 마크다운 에디터, 노트 메타바
│   ├── layout/           # AppShell, Header, 설정 패널
│   ├── preview/          # 마크다운 프리뷰, 코드 블록
│   └── sidebar/          # 사이드바, 노트 목록, 카테고리 필터
├── constants/            # 프롬프트 템플릿, 시드 노트
├── hooks/                # useKeyboard, useSearch
├── lib/                  # 유틸리티 (aiCopy, markdown, search, export)
├── storage/              # localStorage / Capacitor Preferences 추상화
├── store/                # Zustand 스토어 (noteStore, uiStore)
└── types/                # TypeScript 타입 정의
```

## 키보드 단축키

| 단축키      | 동작              |
| ----------- | ----------------- |
| `⌘ + N`     | 새 노트           |
| `⌘ + E`     | 편집/프리뷰 전환  |
| `⌘ + ⇧ + C` | AI 카피 패널 토글 |
| `⌘ + K`     | 검색 포커스       |
| `Esc`       | 패널 닫기         |

## 데이터 저장

- **웹**: localStorage (5MB 제한)
- **네이티브**: Capacitor Preferences API
- 변경 시 500ms 디바운스 저장, 페이지 이탈 시 즉시 플러시
