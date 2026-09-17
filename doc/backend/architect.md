# Architect — 아키텍처 설계서

> 버전: v0.2.0 · 갱신일: 2026-09-17

## 1. 아키텍처 개요

```
사용자 (브라우저 / PWA / Tauri)
        │
        ▼
┌─────────────────────── Next.js 16 (단일 서버, App Router) ───────────────────────┐
│  middleware.ts ── 인증(JWT) + 모듈 권한 게이트                                   │
│                                                                                 │
│  서버 API routes ─────────────┐          페이지(RSC/Client)                     │
│   [resource] CRUD ──┬─────────┤           dashboard/*, /driver, /guide          │
│   dispatch-recommend│         │                 ▲                               │
│   ops-alerts        │  lib/     │                 │ react-query                 │
│   import/exports    │  resources.ts, features.ts, │                             │
│   driver/dispatches │  settings.ts, recommend.ts,  │  fetch /api/*              │
│   audits/stats/push │  notify.ts, audit.ts …      │                             │
│   settings/features │                             │                             │
└──────────────────────┼────────────────────────────┼─────────────────────────────┘
                       ▼                            ▼
               ┌──────────────┐              ┌──────────────┐
               │  Prisma ORM   │◄────────────►│ SQLite DB     │
               │  (SQLite)     │              │ db/custom.db  │
               └──────────────┘              └──────────────┘
```

## 2. 계층 구분

1. **Edge 미들웨어** (`middleware.ts`): JWT 토큰 검사 → 페이지는 리다이렉트, API는 401, 모듈 RBAC
2. **API 라우트**: 최소한의 핸들러로 작성 → 비즈니스 로직은 `lib/*`에 (핵심은 반복 제거)
3. **도메인 레이어(`lib`)**:
   - `resources.ts`의 ResourceDef가 **CRUD·폼·목록·검색·시리얼라이즈·권한의 단일 정의**
   - `crud.ts`가 이 정의를 소비해 범용 핸들러 제공 — 새 리소스는 정의만 추가하면 됨
   - 기능 고유 로직(추천, 알림, 정산)은 별도 모듈로 분리
4. **프레젠테이션**: react-query로 서버 상태, shadcn/ui로 컴포넌트 구성

## 3. 핵심 설계 결정

| 결정 | 근거 |
|---|---|
| 단일 Next 서버(SSR+API) | 배포 단순화(Tauri 포함), 팀 운영의 단순성 |
| ResourceDef 메타 회로 | CRUD 11개 리소스를 한 구현으로 95% 커버, 일관된 폼/목록/권한 |
| 기능 토글을 설정 DB에 저장 | 운영자가 코드 배포 없이 기능 개폐 |
| 자동 저장소(SQLite) | 초기 운영·단일 인스턴스에 적합, 마이그레이션은 `prisma db push` |
| soft delete 전역 | 감사·복구 용이 |
| SMS/batch 실패 비전파 | 조회성 트랜잭션 분리, 부가 동작 실패는 무시(feature 큐에 잔존) |
| 자동 정산은 driverId 미사용 | Settlement.driverId/guideId가 @unique — 같은 기사 2회차 충돌 방지 |

## 4. 배차 추천 파이프라인

```
GET /api/dispatch-recommend
  → schedule 존재/배차 미존재 확인
  → computeScheduleTimes (startTime/endTime, 기본 09:00~18:00)
  → recommendDispatch({start,end,participants,region})
       기사: AVAILABLE + ACTIVE + 면허 유효 + 시간 비충돌
         점수: 지역(20/10) + 평점(×4) + 휴게(±8/15) + 야간미허용(-8)
       차량: ACTIVE + 좌석 적합 + 시간 비충돌
         점수: 좌석 적정(+15/+5) + 자차(+6)
       상위 5개 정렬
  → POST /api/dispatch-recommend
       재충돌 확인 → createRecommendedDispatch
         휴일·휴게 경고 수집 → dispatch 생성(autoRecommended, score)
       audit(CREATE) 기록
```

## 5. 정산 파이프라인 (자동)

```
PATCH /api/driver/dispatches/{id}/status { action:"end", … }
  → dispatch COMPLETED + actualEnd
  → (runLog ON) DriverWorkLog ENDED 기록
  → (autoSettlement ON) ensureAutoSettlement
       details.contains(dispatchId) 중복 검사(기존 정산이 있으면 skip)
       settlementNumber S-YYYYMMDD-NNN 자동
       settlementType DRIVER|GUIDE, targetId/targetName, details에 dispatchId/실기록 포함
       status=PENDING (금액 미정 — 운영자가 기입)
```

## 6. 캐싱/상태 관리

- `getSettings`는 React `cache()`로 요청 주기 캐시, PUT 시 `revalidateSettings()`
- `react-query` 키: `["dispatches"]`, `["cal-dispatches"]`, `["stats"]`, `["features"]`, `["driver-dispatches"]` 등
- 기사앱 폴링: 60초 (`refetchInterval`)
- 음성 자동 안내: localStorage `gb:auto-announce`, 본 배차 `gb:seen-dispatch`

## 7. 데이터 무결성 규칙

- 배차 생성/수정 `beforeCreate/beforeUpdate`에서 기사 시간 충돌 강제 차단(같은 날짜, CANCELLED/FAILED 제외)
- 차량 소프트 삭제 시 연관 배차는 외래키 위험—삭제 대신 상태 전환 권장
- 정산 번호/분개 번호/차량번호/이메일/전화 등 unique 필드 충돌 → 400 한글 메시지

## 8. 배포 아키텍처

- `next build` → `.next/standalone` 생성(`output:"standalone"`)
- `node scripts/start.mjs`가 standalone 서버 기동
- Caddyfile 리버스 프록시(TLS) — 프로젝트 루트에 `Caddyfile` 포함
- Tauri(`src-tauri`)가 로컬 서버/웹뷰를 데스크톱 앱으로 패키징 (향후 인스톨러 배포 목표)
- PWA: `manifest`, `sw.js`, `/offline` 페이지 — 설치 가능 웹앱

## 9. 확장 고려사항

- **새 리소스 추가**: `resources.ts`에 `ResourceDef` 추가(모델·필드·컬럼·roles·serialize) → CRUD/폼/목록/엑셀 자동
- **DB 전환**: Postgres 등으로 바꾸면 `DATABASE_URL` 변경 + 스키마 조정(JSON 컬럼 등) — 계획 수립 필요
- **다중 인스턴스**: 인메모리 로그인 잠금, 설정 캐시를 공유 스토리지(Redis)로 이동 필요
- **더존 연동**: AccountingEntry에 dz 플래그 준비됨, 전송 어댑터 구현 예정