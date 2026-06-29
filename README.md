# Event Photobooth

행사마다 `public/config/event.json`과 테마 프레임만 바꿔 배포하는 **인생네컷 포토부스 키오스크** 템플릿입니다.

태블릿·키오스크에서 4컷 촬영 → 프레임 합성 → QR 공유·갤러리까지 한 번에 운영할 수 있습니다.

## 주요 기능

- **행사 설정 분리** — `event.json`으로 이름, 브랜딩, 기능 on/off, 카메라·출력 크기 제어
- **프레임 테마** — `public/themes/<테마>/frames.json` (Hope, Passport, Summer Sky 등)
- **촬영 플로우** — 프레임 먼저 선택(`frameFirst`) 또는 촬영 후 선택
- **편집** — 사진 드래그, 필터, 슬롯별 위치 조정
- **저장·공유** — Supabase Storage 업로드, QR 코드, 로컬 갤러리(IndexedDB)
- **키오스크 모드** — 유휴 화면, 전체화면
- **Admin** — PIN 보호, 프레임 디자이너, Supabase 테마 저장

## 빠른 시작

```bash
git clone https://github.com/kim-kwanho/event-photobooth.git
cd event-photobooth
npm install
cp .env.example .env
# .env에 Supabase URL·anon key·ADMIN PIN 입력

npm run dev:all
```

- 앱: http://localhost:8000/app
- Admin: http://localhost:8000/admin

자세한 배포 가이드는 [docs/SETUP.md](docs/SETUP.md)를 참고하세요.

## 행사 설정 예시

`public/config/event.json`:

```json
{
  "event": {
    "id": "my-event-2026",
    "name": "인생네컷",
    "tagline": "우리 행사 한 줄 소개"
  },
  "theme": {
    "id": "peace-attic-summer",
    "framesPath": "/themes/peace-attic-summer/frames.json",
    "defaultFrameId": 1
  },
  "features": {
    "frameSelect": true,
    "photoDrag": true,
    "gallery": true,
    "qrShare": true,
    "admin": true,
    "kioskMode": true,
    "filters": true
  }
}
```

## 프로젝트 구조

```
public/
  config/event.json          # 행사별 설정 (배포 시 주로 수정)
  themes/                    # 프레임 테마 JSON
src/
  config/                    # 설정 로더·Context
  components/                # 촬영·프레임·결과 UI
  lib/canvasFrame.js         # 프레임·합성 Canvas 렌더러
  pages/admin/               # Admin·Frame Designer
supabase/storage-policies.sql
docs/SETUP.md
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev:all` | Vite + API 서버 동시 실행 (권장) |
| `npm run dev` | 프론트엔드만 |
| `npm run dev:server` | Express API만 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 결과 + API 서버 |

## 기술 스택

React 18 · Vite · React Router · Express · Supabase Storage · Canvas API · IndexedDB

## 주의사항

- 카메라는 **HTTPS** 또는 **localhost**에서만 동작합니다.
- `.env`는 커밋하지 마세요. `.env.example`을 참고하세요.
- QR 공유를 쓰려면 API 서버(`server.js`) 또는 동등한 업로드 엔드포인트가 필요합니다.

## 라이선스

MIT
