# Event Photobooth

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

**행사마다 `event.json`과 프레임 테마만 바꿔 배포하는 평안네컷 포토부스 키오스크**

[빠른 시작](#빠른-시작) · [행사 설정](#행사-설정) · [테마·프레임](#테마프레임) · [배포 가이드](docs/SETUP.md)

</div>

태블릿·키오스크에서 **촬영 → 프레임 합성 → Supabase 업로드·QR 공유·로컬 갤러리**까지 운영합니다.

> 저장소: [github.com/kim-kwanho/event-photobooth](https://github.com/kim-kwanho/event-photobooth) · 배포: [event-photobooth-kwanho.vercel.app](https://event-photobooth-kwanho.vercel.app)

---

## 빠른 시작

**요구:** Node.js 18+ · npm · (QR·클라우드) [Supabase](https://supabase.com)

```bash
git clone https://github.com/kim-kwanho/event-photobooth.git
cd event-photobooth
npm install
cp .env.example .env   # Supabase URL·anon key·Admin PIN 입력
npm run dev:all
```

| 주소 | 용도 |
|------|------|
| http://localhost:8000 | 시작 화면 |
| http://localhost:8000/app | 포토부스 |
| http://localhost:8000/admin | 관리자 (PIN) |
| http://localhost:3001/api | 업로드 API (QR) |

---

## 촬영 플로우

`flow.frameFirst` · `features.frameSelect` · `frames.json`의 `sizes` 개수에 따라 순서가 달라집니다.

| 조건 | 화면 순서 |
|------|-----------|
| `sizes` 2개+ · `frameFirst: true` **(현재)** | 시작 → **크기 선택** → 프레임 → 4컷 촬영 → 편집 → 완성·QR |
| `frameFirst: true` · `sizes` 0~1개 | 시작 → 프레임 → 4컷 촬영 → 편집 → 완성·QR |
| `frameFirst: false` | 시작 → 4컷 촬영 → 프레임 → 편집 → 완성·QR |
| `frameSelect: false` | 시작 → 4컷 촬영 → 편집 → 완성 (`defaultFrameId` 고정) |

**크기:** 카드형 1200×1600 (2×2) · 필름형 658×2009 (세로 네 컷) — 고른 `sizeId`에 맞는 프레임만 표시됩니다.

| URL | 설명 |
|-----|------|
| `/` | 랜딩 |
| `/app` | 포토부스 |
| `/admin` | 갤러리·관리 |
| `/result/:id` | QR 결과물 |

---

## 환경 변수

`.env` (커밋 금지) · 템플릿: [.env.example](.env.example)

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_SUPABASE_URL` | QR·업로드 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | QR·업로드 | anon public key |
| `VITE_ADMIN_PIN` | 권장 | `/admin` PIN (비우면 무인증) |
| `VITE_API_BASE_URL` | 선택 | API 베이스 (기본 `/api` → :3001 프록시) |
| `VITE_APP_URL` | 선택 | QR 공개 URL (비우면 `window.location.origin`) |
| `FIGMA_ACCESS_TOKEN` | 선택 | `export:figma-frames`용 (커밋 금지) |

---

## 행사 설정

경로: **`public/config/event.json`** — 행사마다 가장 자주 수정하는 파일입니다.

| 섹션 | 역할 |
|------|------|
| `event` | ID·이름·한 줄 소개 |
| `branding` | 시작 배경·포인트 색·폰트 |
| `flow.frameFirst` | 프레임을 촬영보다 먼저 선택 |
| `features` | 기능 on/off — [아래 표](#기능-플래그) |
| `camera` | 장수·카운트다운·JPEG 품질 |
| `output` | 기본 합성 해상도 (`sizes` 선택 시 해당 width/height 우선) |
| `theme` | `id` · `framesPath` · `defaultFrameId` · (선택) `framesStorage` |
| `kiosk` | 유휴 초·전체화면 |

`theme.framesStorage`: `local`(기본, git의 `frames.json`) · `supabase`(`themes` 버킷의 `{themeId}/frames.json`)

현재 설정 예시는 [public/config/event.json](public/config/event.json)을 참고하세요.

### 기능 플래그

| 플래그 | 설명 |
|--------|------|
| `frameSelect` | 프레임 선택 (`false` → `defaultFrameId`만) |
| `photoDrag` | 편집 화면 사진 위치 드래그 |
| `filters` | 원본·밝게·선명·흑백 |
| `gallery` | IndexedDB 로컬 갤러리 |
| `qrShare` | Supabase 업로드 + QR |
| `admin` | `/admin` |
| `kioskMode` | 키오스크 UX·유휴 리셋 |
| `print` | Admin 인쇄 (`server.js` + 프린터) |

---

## 테마·프레임

> **overlay PNG·`figma.json`은 git에 없습니다.** Figma export → Supabase `themes` 업로드 → `frames.json`에 public URL 등록.

```
public/themes/peace-attic-summer/
  frames.json           # sizes · 슬롯 · Supabase overlay URL
  figma.json.example    # → figma.json 복사 후 node-id 매핑
  *-overlay.png         # (git 제외) export 후 Supabase 업로드
```

### 크기 · 현재 프레임 (`peace-attic-summer`)

| sizeId | 해상도 | 레이아웃 |
|--------|--------|----------|
| `card` | 1200×1600 | 2×2 |
| `strip` | 658×2009 | 세로 네 컷 |

| ID | 이름 | sizeId | 비고 |
|----|------|--------|------|
| 1–6 | Hope · Peace · Summer · Vision · Love · Rest | `card` | Figma overlay |
| 7–8 | HA Way · HA Vibes | `strip` | 필름형 overlay |
| 10 | Film | `strip` | Outreach 2026 · `overlayKnockout: true` |

### overlay 추가·수정 워크플로우

1. Figma: 카드 1200×1600 또는 필름 658×2009
2. **4컷 placeholder 숨김** (export 시 슬롯 투명)
3. PNG export (2x) → Supabase 업로드 → `frames.json` 등록
4. 레이아웃 변경 시 **PNG 재업로드 + `slots` 좌표** 함께 수정

**자동 export (Figma API)**

```bash
# figma.json 설정 후
FIGMA_ACCESS_TOKEN=figd_xxx npm run export:figma-frames
npm run upload:theme-overlays
```

**수동 export (Film 등)**

```bash
# public/themes/peace-attic-summer/10-film.png 저장 후
npm run sync:film-overlay
# 또는 단일 파일만: npm run upload:theme-overlays -- peace-attic-summer 10-film-overlay.png
```

캐시 무효화: `frameOverlayImage` URL에 `?v=날짜` 쿼리 추가.

**Film export 참고**

| 영역 | Figma |
|------|-------|
| 4컷 슬롯 | placeholder 숨김 (투명) |
| 스프로킷 구멍 | **흰색 Fill** — Subtract만 쓰면 투명 구멍이 앱 배경색으로 비침 |
| 슬롯이 불투명 export | `overlayKnockout: true` (JSON `slots`로 사진 영역만 뚫음) |

### `frames.json` (overlay 모드)

```json
{
  "id": 1,
  "name": "Hope",
  "sizeId": "card",
  "layout": {
    "frameStyle": "overlay",
    "frameOverlayImage": "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/themes/peace-attic-summer/01-hope-overlay.png",
    "overlayKnockout": false,
    "slots": [{ "x": 0.016667, "y": 0.0125, "width": 0.48, "height": 0.451875 }],
    "slotColor": "#FFFFFF"
  }
}
```

| 필드 | 설명 |
|------|------|
| `frameOverlayImage` | Supabase public URL 권장 |
| `slots` | 사진 영역 (0~1 비율) |
| `overlayKnockout` | `true` = 슬롯으로 PNG 추가 뚫기 (투명 export면 `false`) |

Canvas 렌더 방식(레거시)은 `christmas`·`default` 테마 참고 · 렌더러: [`src/lib/canvasFrame.js`](src/lib/canvasFrame.js)

### 새 테마

1. `public/themes/{id}/frames.json` 생성
2. `event.json` → `theme.id` · `theme.framesPath` · `defaultFrameId`
3. overlay PNG → `upload:theme-overlays` → URL을 `frames.json`에 등록

---

## Supabase

| 버킷 | 용도 |
|------|------|
| `photos` | 완성 이미지 (QR) |
| `themes` | overlay PNG · `{themeId}/frames.json` |

RLS: Dashboard → SQL Editor → [`supabase/storage-policies.sql`](supabase/storage-policies.sql) 실행 (Public 버킷 권장).

---

## Admin · 배포

**Admin:** `/admin` → `VITE_ADMIN_PIN` → Supabase·로컬 갤러리 확인·삭제. 프레임 수정은 `frames.json` + overlay 업로드.

**Vercel:** push → `VITE_*` 환경 변수 → `VITE_APP_URL` = 배포 도메인. `event.json`·`frames.json` 변경은 **재배포** 필요.

**QR API:** `qrShare: true`면 업로드 API 필요 — 로컬 `dev:all`(:3001), 프로덕션은 별도 호스팅 또는 Serverless.

상세: [docs/SETUP.md](docs/SETUP.md)

---

## 프로젝트 구조

```
public/config/event.json          # 행사 설정 ★
public/themes/*/frames.json       # 프레임 테마
scripts/
  export-figma-frames.mjs         # Figma → PNG
  upload-theme-overlays.mjs       # PNG → Supabase (전체·단일)
  sync-film-overlay.mjs           # Film 수동 export 동기화
src/components/                   # Camera · FrameSelect · PhotoSelect · Result
src/lib/canvasFrame.js            # 합성 렌더러
server.js                         # 업로드·QR API
```

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev:all` | Vite :8000 + API :3001 **(권장)** |
| `npm run dev` / `dev:server` | 프론트 / API만 |
| `npm run build` / `preview` / `start` | 빌드·미리보기·프로덕션 |
| `npm run lint` | ESLint |
| `npm run export:figma-frames` | Figma REST → overlay PNG |
| `npm run upload:theme-overlays` | overlay → Supabase (`-- themeId file.png` 단일 업로드) |
| `npm run sync:film-overlay` | `10-film.png` → overlay 복사·업로드 |

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| Supabase 업로드 실패 | `storage-policies.sql` · 버킷 Public · 프로젝트 ACTIVE |
| Vercel에서 프레임 비어 있음 | overlay는 Supabase에만 있음 → URL·업로드 확인 |
| overlay 사진 안 보임 | placeholder 투명 export · 또는 `overlayKnockout: true` |
| 슬롯·사진 어긋남 | PNG 재export + `slots` 좌표 |
| 스프로킷 구멍 색 이상 | 구멍 투명 export → Figma에서 **흰색 Fill** |
| 프레임 변경 안 됨 | `framesPath` · `?v=` 캐시 · hard refresh |
| QR 404 | `VITE_APP_URL` · `photos` Public |
| Admin / 카메라 | PIN · HTTPS 또는 localhost · 권한 |

---

## 기술 스택 · 라이선스

React 18 · Vite 5 · React Router 6 · Express 5 · Supabase Storage · Canvas · IndexedDB · QRCode — **MIT**
