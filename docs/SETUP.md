# 포토부스 템플릿 — 새 행사 배포 가이드

약 30분 안에 새 행사용 포토부스를 배포하는 방법입니다.

## 사전 준비

- Node.js 18+
- [Supabase](https://supabase.com) 계정
- [Vercel](https://vercel.com) 계정 (또는 정적 호스팅)

---

## 1. 프로젝트 준비

```bash
git clone https://github.com/kim-kwanho/event-photobooth.git my-event-photobooth
cd my-event-photobooth
npm install
cp .env.example .env
```

---

## 2. Supabase 설정

### 프로젝트 생성
1. Supabase → **New project**
2. 프로젝트 이름·리전·DB 비밀번호 설정

### Storage 버킷
1. **Storage** → **New bucket**
2. 이름: `photos`
3. **Public bucket** ✅

### RLS 정책
**SQL Editor**에서 `supabase/storage-policies.sql` 내용 실행

### API 키
**Settings → API**에서 복사 후 `.env`에 입력:

```env
VITE_SUPABASE_URL=https://<프로젝트-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ADMIN_PIN=행사용비밀번호
```

---

## 3. 행사 설정 (`public/config/event.json`)

```json
{
  "event": {
    "id": "easter-2026",
    "name": "부활절 네컷",
    "tagline": "함께하는 부활절 인생네컷!"
  },
  "branding": {
    "startBackground": "/assets/backgrounds/start.png"
  },
  "theme": {
    "framesPath": "/themes/christmas/frames.json",
    "defaultFrameId": 1
  },
  "features": {
    "frameSelect": true,
    "photoDrag": true,
    "gallery": true,
    "qrShare": true,
    "admin": true,
    "print": false
  }
}
```

### 기능 플래그

| 플래그 | 설명 |
|--------|------|
| `frameSelect` | 촬영 후 프레임 선택 화면 |
| `photoDrag` | 사진 위치 드래그 조정 |
| `gallery` | 사이드 메뉴 로컬 갤러리 |
| `qrShare` | Supabase 저장 + QR 공유 |
| `admin` | `/admin` 관리 페이지 |
| `print` | Admin 프린트 버튼 (로컬 서버 필요) |

---

## 4. 테마·프레임 커스터마이즈

### 배경 이미지
`public/assets/backgrounds/start.png` 교체

### 프레임 추가
1. `public/themes/내테마/frames.json` 생성 (christmas 예시 참고)
2. `event.json`의 `theme.framesPath` 수정

---

## 5. 로컬 테스트

```bash
npm run dev:all
```

- http://localhost:8000 — 앱
- http://localhost:8000/admin — 관리 (PIN 입력)

---

## 6. Vercel 배포

**프로덕션 도메인:** https://photobooth-kwanho-kims-projects-ab5d8261.vercel.app

1. GitHub에 push
2. Vercel → **Import Project** (또는 기존 `event-photobooth` 연결)
3. **Environment Variables**에 등록:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PIN`
   - `VITE_APP_URL` = `https://photobooth-kwanho-kims-projects-ab5d8261.vercel.app` (QR·공유 링크용)
4. Deploy

### Vercel 도메인 안내

`photobooth.vercel.app` 은 **전 세계 Vercel 계정 중 하나만** 쓸 수 있는 이름이라, 이미 다른 프로젝트가 사용 중이면 추가가 거절됩니다.

**지금 쓰는 주소 (자동 발급):**
`https://photobooth-kwanho-kims-projects-ab5d8261.vercel.app`

**더 짧은 이름을 원하면** Domains에서 아래를 **Add** 해 보세요 (비어 있으면 사용 가능):

| 시도할 도메인 | 비고 |
|---------------|------|
| `kwanho-photobooth.vercel.app` | 개인 식별 |
| `peace-attic.vercel.app` | 평안다락방 행사명 |
| `event-photobooth-kwanho.vercel.app` | 프로젝트명 조합 |

추가에 성공하면 **Settings → Environment Variables** 의 `VITE_APP_URL` 을 새 주소로 바꾸고 **Redeploy** 하세요.

배포 후 QR·공유 링크는 `VITE_APP_URL` 또는 접속 중인 origin 을 사용합니다.

---

## 7. 키오스크 프린트 (선택)

프린트가 필요하면:

1. `event.json` → `"print": true`
2. 행사 PC에서 `npm run dev:all` 상시 실행
3. Canon SELPHY 등 프린터 연결

> Vercel만 배포한 경우 프린트 API는 동작하지 않습니다. 로컬 서버가 필요합니다.

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| 업로드 실패 (RLS) | `supabase/storage-policies.sql` 실행 |
| Admin 접근 불가 | `.env`의 `VITE_ADMIN_PIN` 확인 |
| QR 링크 깨짐 | Supabase 버킷 Public 여부 확인 |
| 갤러리 비어 있음 | 촬영 후 결과 화면까지 완료 (자동 저장) |

---

## 파일 구조 요약

```
public/
  config/event.json      ← 행사 설정 (가장 자주 수정)
  themes/*/frames.json   ← 프레임 정의
  assets/backgrounds/    ← 시작 화면 배경
.env                     ← Supabase 키, Admin PIN
supabase/
  storage-policies.sql   ← Storage RLS
```
