# API — 엔드포인트 명세서

> 버전: v0.2.0 · 갱신일: 2026-09-17
> Base: `http://localhost:3000` (개발) / 도메인(운영). App Router 기반 REST. `src/app/api/**/route.ts` 참조.

## 0. 공통 규칙

- **인증**: 모든 `/api` 요청은 세션 쿠키 필요. 미인증 → `401 {"error":"인증이 필요합니다."}`
- **인가 실패**: `403 {"error":"권한이 없습니다."}`
- **기능 토글 OFF**: `409 {"error":"…비활성화되었습니다.…"}`
- **본문**: JSON (multipart만 예외). 응답은 보통 `{ data, … }` 또는 `{ error }`
- **에러 코드 매핑**: P2002→400(중복), P2003→400(참조 오류), P2025→404, ConflictError→409

## 1. 인증

### `POST /api/auth/callback/credentials` — (NextAuth)
- body: `{ email, password }`
- 성공 시 세션 쿠키 발급, 실패 401
- 비정상 URL은 `/api/auth/*` (NextAuth 내장: providers, session, csrf, signin, signout)

## 2. 리소스 CRUD (동적)

패턴: `/api/{resource}` (GET/POST), `/api/{resource}/{id}` (PATCH/DELETE)

### 지원 리소스 (ResourceDef)
| resource | model | roles |
|---|---|---|
| clients | client | SA, ADMIN, SALES |
| products | travelProduct | SA, ADMIN, SALES, OP |
| schedules | schedule | SA, ADMIN, SALES, OP |
| contracts | contract | SA, ADMIN, SALES, OP |
| vehicles | vehicle | SA, ADMIN, OP |
| drivers | driver | SA, ADMIN, OP |
| guides | guide | SA, ADMIN, OP |
| dispatches | dispatch | SA, ADMIN, OP, SALES |
| accounting | accountingEntry | SA, ADMIN |
| settlements | settlement | SA, ADMIN |
| users | user | SA, ADMIN |

### `GET /api/{resource}`
- 쿼리:
  - `?all=1` → `{ options: [{value, label}] }` (selectbox용, 500건 제한)
  - `?month=YYYY-MM` → dispatches 전용(해당 월 scheduledStart 필터) → `{ data:[list] }`
  - 기본 → `{ data: rows[] }` (serialize된 표준 형태)
- 스럽지 않은 소프트 삭제는 `deletedAt` 필터

### `POST /api/{resource}` — 생성
- body: 필드 키 값 또는 빈 문자열
- 검증: required 누락 시 `400 {"error":"\"고객 유형\"(은)는 필수 입력 항목입니다."}`
- 후크: transformInput → beforeCreate(중복 배차 ConflictError 409, 경고 자동 추가, 번호 자동 생성 등)
- dispatch면 SMS 알림 후크(`notifyDispatchCreated`) 실행

### `PATCH /api/{resource}/{id}` — 수정
- beforeUpdate 후크(배차 중복 확인, 경고 재검사), response에 `warning` 포함 가능

### `DELETE /api/{resource}/{id}` — 소프트 삭제
- `{ "ok": true }`, 감사 로그(DELETE) 기록

## 3. 기능 토글 / 설정

### `GET /api/features`
- 인증만 필요(모든 역할). `{ semiAutoDispatch, runLog, vehicleExpiry, autoSettlement, excelImport, dashboardAlert, smsNotify }` 부울
- 민감값 없음

### `GET /api/settings` / `PUT /api/settings`
- SA, ADMIN만
- GET → `{ settings: { key: value, … } }`
- PUT body: `{ settings: { …whitelist 키 } }` → 저장, `revalidateSettings()`
- whitelist: `DEFAULT_SETTINGS` 키만 수용, 그 외 무시. 저장 가능 키 0개 → 400

### `GET /api/settings/public` (공개)
- middleware PUBLIC_PATHS 허용 경로(공개 회사 정보용)

## 4. 반자동 배차

### `GET /api/dispatch-recommend?scheduleId={id}`
- roles: SA/ADMIN/OP/SALES, feature `semiAutoDispatch` 필요
- 일정에 기존 배차 있으면 `409`
- 응답:
```json
{
  "data": { "drivers": [{id,name,detail,score,reasons[]}…5], "vehicles": […5] },
  "schedule": { "id","label","start","end","participants" }
}
```

### `POST /api/dispatch-recommend`
- body: `{ scheduleId, driverId, vehicleId, guideId?, score? }`
- 차량 좌석 부족 → 409, 기사 시간 충돌 → 409
- 성공 201 `{ data:{id}, warning }`, audit(CREATE) 기록

## 5. 운영 알림

### `GET /api/ops-alerts`
- roles: SA/ADMIN/OP, feature `dashboardAlert` 필요
- 응답: `{ data: [{id, severity: danger|warn|info, title, desc, link}] }` 최대 10건
- 항목: 정산 대기 / 차량 보험·검사 만료·30일 임박(최대5) / 기사 면허 만료·임박(최대5) / 오늘 배차 현황

## 6. 엑셀

### `GET /api/exports/{resource}` — 리소스 목록 엑셀
- roles: 해당 리소스 권한. 응답: .xlsx (attachment, `-YYYY-MM-DD.xlsx`)
- 감사 로그 EXPORT

### `GET /api/exports/contracts` — 계약 전용 포맷
- 상단 회사명/사업자등록번호, 17열 상세, 컬럼 너비 지정

### `POST /api/import/{resource}` — 일괄 등록
- multipart `file`(.xlsx/.xls). feature `excelImport` 필요
- 행 단위 실패 수집, 전체 실패 시 `400 {"error":"등록된 행이 없습니다.","data":{created,failed}}`
- 성공: `{ data: { created, failed, total } }`

## 7. 대시보드 통계

### `GET /api/stats`
- roles: SA/ADMIN/OP/SALES
- 응답: `{ role, cards[], counts, recentDispatches[], recentContracts[], clientTypes[] }`
- 카드 구성은 역할별 상이(관리자→정산/매출, 운영자→배차, 기타→운행)

## 8. 감사 로그

### `GET /api/audit-logs?action=&table=&q=&limit=&offset=`
- roles: SA/ADMIN. limit 기본 100, 최대 500
- 응답: `{ data: rows[], total }` (createdAt 내림차순)

## 9. 기사/가이드 앱

### `GET /api/driver/dispatches?range=upcoming|today`
- DRIVER/GUIDE만. 본인 배차만 반환
- 응답: `{ data:[…], todayHoliday|null, voice:{defaultRate, autoAnnounce} }`

### `PATCH /api/driver/dispatches/{id}/status`
- DRIVER/GUIDE만, 본인 배차만(403)
- body:
  - 시작: `{ action:"start" }`
  - 종료: `{ action:"end", runLog?: { startOdometer?, endOdometer?, notes?, issues? } }`
- 상태 규칙: start는 PENDING/CONFIRMED만, end는 IN_PROGRESS만(409)
- **runLog ON**이고 end에 `runLog` 없으면 `400 {"error":"RUN_LOG_REQUIRED"}`
- 성공: `{ data:{id,status,statusLabel,statusVariant,actualStart,actualEnd}, features:{runLog, autoSettlement} }`
- 사이드이펙트(DRIVER): DriverWorkLog 시작/종료 기록, 프로필 상태 변경, autoSettlement ON이면 정산 초안 생성(중복 방지됨)

## 10. 웹 푸시

- `POST /api/push/subscribe` — VAPID 구독 등록
- `DELETE /api/push/unsubscribe` — 구독 해제
- `GET /api/push/vapid` — VAPID 공개키 제공
- `POST /api/push/send` — 관리자 발송
- `POST /api/push/test` — 예약 발송(테스트)

## 11. 업로드

- `POST /api/upload/logo` (raw body, Content-Type: image/*), `DELETE /api/upload/logo`
- `POST /api/upload/spec` (raw body, header `x-file-name`), `DELETE /api/upload/spec`

## 12. 상태 코드 요약

| 코드 | 의미 |
|---|---|
| 200 | 성공(GET/PATCH/DELETE) |
| 201 | 생성됨(POST) |
| 400 | 잘못된 본문/필수 누락/중복/파일 없음 |
| 401 | 인증 없음 |
| 403 | 권한 없음/본인 배차 아님 |
| 404 | 리소스 없음/프로필 없음 |
| 409 | 충돌(중복 배차, 기능 OFF, 배차 있는 일정, 상태 전이 불가, 차량 좌석 부족) |
| 500 | 서버 오류 |