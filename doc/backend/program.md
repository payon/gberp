# Program — 프로그램 구성 및 모듈 개요

> 버전: v0.2.0 · 갱신일: 2026-09-17

## 1. 런타임 스택

| 계층 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, RSC + Client) |
| UI | React 19, Tailwind CSS v4, shadcn/ui(radix), lucide-react, react-query, sonner |
| ORM/DB | Prisma 6 + SQLite (`db/custom.db`) |
| 인증 | NextAuth v4 (Credentials, JWT) |
| 차트 | recharts |
| 기타 | xlsx, web-push, bcryptjs, next-intl, zustand, @dnd-kit (정차 재정렬 등) |

## 2. 디렉터리 구조

```
src/
├── middleware.ts            # 페이지/API 권한 게이트
├── app/
│   ├── api/                 # 전 백엔드 API Route
│   │   ├── [resource]/      #   동적 리소스 CRUD
│   │   ├── [resource]/[id]/
│   │   ├── auth/[...nextauth]/
│   │   ├── audit-logs/
│   │   ├── dispatch-recommend/
│   │   ├── driver/dispatches/
│   │   │   └── [id]/status/
│   │   ├── exports/         # [resource], contracts
│   │   ├── features/
│   │   ├── import/[resource]/
│   │   ├── ops-alerts/
│   │   ├── push/            # subscribe/unsubscribe/vapid/send/test
│   │   ├── settings/        # GET/PUT (+ public)
│   │   ├── stats/
│   │   ├── upload/          # logo, spec
│   ├── dashboard/           # 관리자 화면 (clients, products, schedules, contracts,
│   │                        #   dispatches, vehicles, drivers, guides, accounting,
│   │                        #   settlements, reports, notifications, settings, audit-logs, users)
│   ├── driver/              # 기사 앱 (PWA 대상)
│   ├── guide/               # 가이드 앱
│   ├── login/               # 로그인
│   └── offline/             # PWA 오프라인
├── components/              # ui/ (shadcn), 사업 컴포넌트 (auto-dispatch-button,
│                           #   ops-alerts-widget, excel-import-button, tts-button …)
└── lib/                     # 비즈니스 로직 (아래 표)
```

## 3. lib 모듈 책임

| 파일 | 책임 |
|---|---|
| `auth.ts` | NextAuth 설정, 로그인 실패 잠금, SessionUser 타입 |
| `permissions.ts` | ROLE_LABELS/MENU, hasRole, menuForRole, canAccessModule |
| `resources.ts` | **리소스 정의(ResourceDef)** + 라벨 맵 + ConflictError + 각종 serialize |
| `crud.ts` | 공통 CRUD 핸들러(handleList/Create/Update/Delete), parseValue/buildData/validateRequired |
| `features.ts` | FeatureKey, FEATURE_DEFS, featureEnabled/enabledFeatures |
| `settings.ts` | DEFAULT_SETTINGS, getSettings(캐시), saveSettings(whitelist), 휴일/날짜 유틸 |
| `holidays.ts` | 휴일 목록 파싱/검증 |
| `recommend.ts` | 반자동 배차 추천엔진 + createRecommendedDispatch |
| `notify.ts` | 배차 생성 SMS 발송 큐/게이트웨이 호출 |
| `audit.ts` | auditLog, logCreate/Update/SoftDelete |
| `xlsx.ts` | 엑셀 다운로드/텍스트 안전 처리 |
| `push.ts` / `push-client.ts` | 웹 푸시 서버/클라이언트 |
| `tts.ts` / `speech.ts` | TTS 프라임/큐 재생, 배차 음성 문장 생성 |
| `uploads.ts` | 로고·규격서 저장/삭제 |
| `utils.ts` / `amount.ts` | 날짜·통화 포맷 |
| `prisma.ts` | Prisma 클라이언트 싱글턴 |
| `revalidate.ts` | 설정 변경 시 리밸리데이션 |

## 4. 기능 플래그 아키텍처

- `DEFAULT_SETTINGS["features.*"]`으로 저장, `enabledFeatures()`로 부울 조합
- **클라이언트**: `/api/features`로 조회해 버튼/위젯 표시 제어
- **서버**: 각 라우트가 자체 검증(UI 우회 불가)
- 확장 방법: `features.ts`에 `FeatureKey` + `FEATURE_DEFS`(label/description/default)와 `settings.ts`의 `DEFAULT_SETTINGS` 기본값만 추가

## 5. 실행 진입점

- 개발: `npm run dev` (포트 3000)
- 배포: `npm run build` → `node scripts/start.mjs` (standalone 서버)
- DB: `npm run db:push` → `npm run db:seed`
- 부가 스크립트: `npm run icons`, `npm run vapid`, `npm run tauri`

## 6. 다운스트림 소비자

- **관리자 대시보드**: 웹 브라우저
- **기사/가이드**: `/driver`, `/guide` (PWA, Service Worker, 푸시, 오프라인)
- **데스크톱**: Tauri(`src-tauri/`)가 standalone 웹을 래핑 (Windows)
- **외부**: SMS 게이트웨이, 더존(준비)