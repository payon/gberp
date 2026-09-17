# 종합여행사 ERP — 설치·운영 안내 (GUIDE)

여행사 통합 업무관리 플랫폼. 대시보드·배차·정산·회계·문서 관리와,
기사/가이드용 **모바일 앱(PWA/TWA) + 새 배차 자동 음성 안내(TTS) + 푸시 알림**까지 포함합니다.

---

## 1. 기술 스택

| 영역 | 스택 | 버전 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) | 16.x |
| DB | SQLite via Prisma ORM | 6.x |
| 인증 | NextAuth (Credentials) | 최신 |
| 푸시 | `web-push` (VAPID) | 최신 |
| 음성 | Web Speech API (`speechSynthesis`, ko-KR) | 브라우저 내장 |
| UI | Tailwind CSS + shadcn/ui + lucide-react | — |
| 서버 상태 | TanStack Query | — |
| 앱 래퍼(향후) | TWA(bubblewrap), Tauri(v2) | 스캐폴드 제공 |

> 런타임: **Node.js 22+** 필요. 패키지 매니저는 프로젝트 기준 **npm** 사용.

---

## 2. 설치 및 실행

```bash
cd D:\develop\gberp

# 1) 의존성 설치
npm install

# 2) 데이터베이스 테이블 생성 (스키마 기준)
npx prisma db push

# 3) Prisma 클라이언트 생성
npx prisma generate

# 4) 시드 데이터(계정/고객/상품/배차 등) 로드
npx prisma db seed        # package.json의 db:seed 실행

# 5) 개발 서버 실행
npm run dev               # = next dev -p 3000
# → http://localhost:3000
```

> ⚠️ **prisma generate(`npm run db:generate`)는 반드시 개발 서버를 멈춘 상태에서 실행**하세요.
> 서버가 켜진 채로 Client가 재생성되면 페이지가 깨질 수 있습니다. 작업 후 `npm run dev` 재시작.

유용한 스크립트:

```bash
npm run dev          # 개발 서버 (3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 실행
npm run lint         # ESLint
npm run db:push      # 스키마 반영
npm run db:generate  # Prisma Client 생성
npm run db:seed      # 시드 데이터 로드 (스키마 변경 후 초기 데이터 복원용: id prefix seed-)
```

---

## 3. 기본 계정 (시드)

비밀번호는 전부 `admin1234`

| 역할 | 이메일 |
| --- | --- |
| 최고관리자 (SUPER_ADMIN) | `admin@example.com` |
| 관리자 (ADMIN) | `manager@example.com` |
| 영업 (SALES) | `sales@example.com` |
| 운영자 (OPERATOR) | `op@example.com` |
| 기사1 (DRIVER) | `driver1@globe.com` |
| 기사2 (DRIVER) | `driver2@globe.com` |
| 가이드 (GUIDE) | `guide1@globe.com` |
| 임원 (EXECUTIVE) | `exec@globe.com` |

---

## 4. 데이터베이스

- **실DB 파일**: `db/custom.db` (프로젝트 루트)
- 연결 문자열: `.env` → `DATABASE_URL="file:../db/custom.db"`
  (Prisma의 상대경로는 `prisma/` 기준이므로 반드시 `../db/` 가 맞습니다.)
- 백업: `db/custom.db.bak` (통합 전 DB) — 삭제하지 마세요.
- 시드 데이터 id 접두어: `demo-*` 실데이터, `seed-*` 고정 시드(배차 2건: `seed-d1-0000`, `seed-d2-0000`).
- 정리: 개발 중 실서버 데이터 시드가 섞이면 `npm run db:reset && npm run db:seed` 로 초기화하되,
  **시드 배차 2건은 `db:seed`의 고정 분기로 항상 복원**됩니다.

---

## 5. 디렉터리 구조 (핵심)

```
src/
├─ app/
│  ├─ api/            # REST API (lib/crud.ts + resources.ts 지시, 기타 라우터)
│  │  ├─ auth/        # NextAuth
│  │  ├─ driver/dispatches  # 기사/가이드 배차 목록
│  │  └─ push/        # vapid / subscribe / unsubscribe / test / send
│  ├─ dashboard/      # 사무실 웹 (staff)
│  ├─ driver/         # 기사·가이드 모바일 앱 (home / settings / notifications)
│  ├─ login/          # 로그인 (역할별 리다이렉트)
│  ├─ offline/        # PWA 오프라인 화면
│  ├─ manifest.ts     # PWA manifest (동적)
│  └─ layout.tsx      # 루트 레이아웃 (SW 등록, InstallPrompt, 메타, viewport)
├─ components/
│  ├─ ui/             # shadcn/ui
│  ├─ sidebar.tsx     # 사무실 사이드바 (md 이상)
│  ├─ mobile-nav.tsx  # 하단 네비 (md 미만, 역할별) — 안드로이드 우선 UI
│  ├─ tts-button.tsx  # 개별 음성 안내 버튼
│  ├─ notification-composer.tsx  # 관리자 알림 발송 폼
│  ├─ service-worker.tsx / install-prompt.tsx / providers.tsx
│  └─ resource-table.tsx, resource-wrapper.tsx 등 # CRUD 공용
├─ hooks/use-push.ts       # 푸시 상태 훅
└─ lib/
   ├─ prisma.ts  auth.ts  permissions.ts  crud.ts
   ├─ push.ts             # web-push 서버 로직
   ├─ push-client.ts      # 브라우저 구독/알림
   ├─ tts.ts              # speechSynthesis 유틸
   ├─ speech.ts           # 배차→한글 음성 문장 생성
   └─ resources.ts        # 리소스 정의·권한·검증 (실제 권한 단일 소스)
prisma/schema.prisma       # 스키마 (+ PushSubscription)
db/custom.db               # SQLite 실DB
public/
├─ sw.js                  # 서비스워커 (오프라인/푸시/알림 클릭)
├─ .well-known/assetlinks.json  # TWA 열기 검증
└─ icons/                 # PWA 아이콘 (스크립트 생성)
scripts/                  # generate-icons.mjs, gen-vapid.mjs
twa/                      # bubblewrap TWA 매니페스트
src-tauri/                # Tauri v2 스캐폴드 (향후 네이티브 앱)
```

---

## 6. 인증 / 역할 / 권한

- 역할: `SUPER_ADMIN → ADMIN → SALES / OPERATOR → DRIVER / GUIDE → EXECUTIVE`
- 권한의 **단일 소스는 `src/lib/resources.ts`** (리소스별 허용 역할) + `src/lib/permissions.ts`(메뉴/모듈 접근).
- 흐름:
  - `src/middleware.ts` → 로그인 아니면 `/login`으로 리다이렉트 (public 경로 제외: `/login`, `/api/auth`, `/sw.js`, `/manifest.webmanifest`, `/offline`, `/.well-known`)
  - API: `src/app/api/[...]` 라우터는 `getSessionUser()` → 리소스별 `can(user, action)` 검사 → `403`
  - dashboard 레이아웃: DRIVER/GUIDE → `/driver`로 이동
  - driver 레이아웃: staff → `/dashboard`로 이동
- 지원: 데모 계정으로 역할별 메뉴/접근 차이를 확인하세요 (SALES는 `/api/users`·`/api/accounting` 403).

---

## 7. PWA (설치형 앱)

- `src/app/manifest.ts` → `/manifest.webmanifest` (App Router 동적 라우트)
- `src/app/layout.tsx` → 메타·`themeColor`·`appleWebApp`·아이콘 + `ServiceWorkerRegistrar`, `InstallPrompt` 마운트
- `public/sw.js` → **네트워크 우선 + 캐시 폴백**, 오프라인 셸(`/offline`), `push`/`notificationclick`/`message` 처리
- 아이콘: `public/icons/` (192, 512, maskable, apple-touch, favicon)
  - 재생성: `npm run icons` (`scripts/generate-icons.mjs`, sharp 필요 → `npm i -D sharp`)

### 설치 방법 (사용자)
1. Chrome(Android)·Edge에서 접속
2. 주소창 우측 **설치/홈 화면에 추가** 선택 (커스텀 프롬프트도 표시됨)
3. 전체 화면 standalone 앱으로 실행되고 푸시 알림 허용 가능

### VAPID 키 (푸시용)
`.env`에 이미 설정됨. 재발급:

```bash
npm run vapid       # scripts/gen-vapid.mjs → VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY 출력 후 .env 반영
```

---

## 8. 푸시 알림 (web-push)

- 스키마: `PushSubscription` (`push_subscriptions` 테이블)
- API:
  - `GET  /api/push/vapid` — 클라이언트용 공개 키
  - `POST /api/push/subscribe` — 구독 저장 (upsert: `endpoint` unique)
  - `POST /api/push/unsubscribe` — 구독 해제
  - `POST /api/push/test` — 자기 자신에게 테스트 (관리자/기사 공용)
  - `POST /api/push/send` — 관리자 발송 `{ title, message, role | userIds }` (403: 일반 직원)
- 발송 로직: `src/lib/push.ts` (`pushToSubscription`, `pushToUserIds`, `pushToRole`).
  410/404(만료 구독)은 자동 삭제.
- 관리 UI: **대시보드 → 알림 전파** `(dashboard/notifications)` — 기사 전체/가이드 전체/직원/모두 대상 발송
- 기사 측: **운행 → 알림** 페이지에서 권한 허용·테스트 발송

---

## 9. TTS 음성 안내 (기사·시니어 배려)

- `src/lib/tts.ts`: `speak`(1건), `speakQueued`(여러 건 순차), `primeVoices`, `readTtsRate`/`writeTtsRate`(속도 localStorage `gb:tts-rate`)
- `src/lib/speech.ts`: `buildDispatchSpeech`/`buildDriverSpeech` — 배차 정보 → 한국어 음성 문장 (차량번호 읽기 변환 포함)
- `src/components/tts-button.tsx`: 큰 터치 버튼 (on/off)
- **기사 홈(`/driver`)**: 
  - "전체 음성 안내 듣기" — 오늘 배차 전부 순차 재생
  - **자동 음성 안내 토글** — 켜두면 1분 폴링으로 새 배차가 내려올 때 자동으로 음성 + 로컬 알림
  - 개별 카드별 음성 버튼, 시니어용 큰 글씨/큰 버튼
- 속도 조절: **운행 → 안내 페이지** (슬라이더)

> 브라우저 제한: Web Speech API는 사용자 상호작용(터치) 후에 활성화됩니다.
> 첫 화면 터치 시 목소리를 미리 로드하는 코드(`primeVoices`)가 들어 있습니다.

---

## 10. 기사/가이드 앱 (모바일 우선)

- 경로: `/driver`, `/driver/settings`, `/driver/notifications`
- `src/app/driver/layout.tsx`: 모바일 헤더 + 하단 네비 (`MobileNav`) + 앱 설치 프롬프트
- 데이터: `GET /api/driver/dispatches` — DB에서 로그인 기사/가이드에 배정된 배차만 반환
  (`range=upcoming` 기본, `range=today` 지원)
- 사무실 측도 모바일: md 이하에서 사이드바 숨김 + 하단 네비(홈/배차/알림/로그아웃)

---

## 11. Android TWA (설치형 네이티브 앱)

웹(PWA)을 Play 스토어에 등록 가능한 TWA로 감싸기 위한 준비물이 `public/.well-known/assetlinks.json`와 `twa/twa-manifest.json`.

빌드 가이드 (bubblewrap):

```bash
npm i -g @bubblewrap/cli

# 1) twa-manifest.json의 host/webManifestUrl/iconUrl을 실제 도메인으로 변경
# 2) 배포 후 HTTPS에서 접속 확인
# 3) assetlinks.json 채우기 (릴리즈 키 SHA256)
# 4) 빌드
bubblewrap build --manifest twa/twa-manifest.json
# → twa/app-release-signed.apk
```

- `assetlinks.json`의 `package_name`은 `com.globe.travelerp`(매니페스트와 일치),
  `sha256_cert_fingerprints`는 키스토어 SHA256으로 변경 필요.
- Play 스토어에 앱을 등록하거나, `adb install`로 직접 테스트할 수 있습니다.

---

## 12. Tauri (향후 네이티브 전환)

`src-tauri/`에 Tauri v2 기반 스캐폴드가 있습니다. 현재 상태는 **셸 스캐폴드**일 뿐, 바인딩 완성 전입니다.

```bash
npm i -D @tauri-apps/cli
npm run tauri dev        # 개발 (devUrl=http://localhost:3000)
```

주의:
- Next.js **SSR 앱**이므로 Tauri 빌드용 정적 출력(`out`)으로는 전체 기능이 안 됩니다.
  전환 시 ① 시크릿 없이 배포된 사이트를 WebView로 열기(TWA와 유사), 또는
  ② 서버 컴포넌트 대신 클라이언트 렌더링/API 서버 분리 후 내장 접근 방식을 선택하세요.
- 윈도우 크기 420×800(폰 비율)이 기본이며 `tauri.conf.json`에서 조정.
- 아이콘: `npm run tauri icon`으로 생성.

---

## 13. 문제 해결 (알려진 이슈)

| 증상 | 원인/해결 |
| --- | --- |
| `/api/auth/*` 404 | `.next` 스테일 캐시 → `Remove-Item -Recurse -Force .next` 후 재기동 |
| 페이지가 스키마를 못 참고 깨짐 | 서버 켠 채로 `prisma generate` → 서버 중지 후 재생성·재기동 |
| `start` 스크립트가 bun 호출 | 이 환경엔 bun 없음 → `npm run build` 후 `next start -p 3000`로 실행 |
| VAPID 오류 (push) | `.env`에서 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` 확인 |
| 로그인 후 무한 리다이렉트 | `NEXTAUTH_URL=http://localhost:3000` 확인, 시크릿 일치 |
| middleware deprecation 경고 | Next 16 → `proxy.ts` 권장이지만 동작에는 영향 없음 |
| `package.json#prisma` deprecation | `prisma.config.ts`로 이관 권장 (선택) |

**로그**: `dev.log`에 dev 서버 로그가 기록됩니다 (스크립트 실행 시 자동).

---

## 14. 테스트

인증/권한/중복 배차 검증 스크립트 (서버 기동 후):

```powershell
# C:\Users\...\opencode\temp\test-overlap.ps1 (인증+RABC+배차 중복 409)
```

간단 수동 확인:
1. `npm run dev` → `/login`에서 `driver1@globe.com` 로그인 → `/driver` 리다이렉트 확인
2. 기사 홈에서 "전체 음성 안내 듣기" 재생 확인 (관리자 화면에서 배차 생성)
3. 대시보드 → 알림 전파에서 기사 대상 알림 발송 → 기사 폰/브라우저에 도착 확인
4. `admin@example.com` 로그인 → `/dashboard` 접근, `/driver` 접근 시 강제 이동 확인