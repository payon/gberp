# TDD — 테스트 주도 개발 / 검증 절차

> 버전: v0.2.1 · 갱신일: 2026-09-28
> 프로젝트의 검증 전략은 **정적 검사(Lint/tsc) → 개발 서버 스모크 테스트(HTTP) → 수동 시나리오** 3단계입니다.

## 1. 사전 검증 (필수)

```bash
# 코드 스타일
npm run lint

# 타입 검사 (next.config는 ignoreBuildErrors:false이므로 빌드도 타입 강제)
./node_modules/.bin/tsc --noEmit
```

- 둘 다 통과해야 산출물로 인정합니다.

## 2. 스모크 테스트 절차

### 2.1 테스트 준비
- 개발 서버: `npm run dev -p 3000` + PostgreSQL: `docker compose up -d db`
- 데이터: `npx prisma db push` 후 `npx prisma db seed` (시드 데이터 기준, `SEED_PASSWORD` 환경변수로 비밀번호 주입 가능)
- 임시 테스트 스크립트(ESM .mjs)는 셸의 `$` 문제 때문에 항상 **temp 스크립트 파일**로 작성합니다.
  - 위치: OS 임시 디렉토리(`$TMPDIR/opencode/` 또는 `/tmp/opencode/`)
  - 프로젝트 밖에서 Prisma 사용 시 workspace의 `@prisma/client` 절대경로 import 사용(하드코딩된 `D:/` 경로 사용 금지)

### 2.2 쿠키 파서 주의사항 (반드시)
- NextAuth 세션 쿠키는 `next-auth.session-token`처럼 `-`/`.`이 포함됩니다.
- `set-cookie`를 파싱할 때 **다음 정규식만 신뢰**합니다:
  ```js
  const cookies = split(/,(?=\s*[^;]+=[^;]+;)/).map(s => s.trim().split(";")[0]);
  ```
  `\s*\w+=` 기반 파싱은 대시/점 쿠키를 놓쳐 401이 납니다.

### 2.3 핵심 시나리오 목록 (자동 스모크)
| # | 시나리오 | 기대 |
|---|---|---|
| 1 | admin 로그인 | 200, 세션 쿠키 획득 |
| 2 | `/api/features` 조회 | 기본값: `semiAutoDispatch:true`, 나머지 false |
| 3 | 설정 저장(PUT /api/settings) | whitelist 키만 저장/반영 |
| 4 | 기능 OFF 시 추천/알림/엑셀 API | 409 (기능 비활성 오류) |
| 5 | 기능 전부 ON 후 재조회 | 모두 true |
| 6 | 반자동 배차: 배차 없는 일정 생성→`GET /api/dispatch-recommend?scheduleId=` | 200, 후보 5순위(기사/차량) |
| 7 | 추천 커밋 `POST /api/dispatch-recommend` | 201, PENDING 배차 생성, 감사 로그 |
| 8 | 기사 로그인 → 운행 시작 PATCH | IN_PROGRESS, DriverWorkLog(STARTED) |
| 9 | 운행 종료(runLog 포함) PATCH | COMPLETED, worklog ENDED, 정산 초안 PENDING 생성 |
| 10 | 정산 초안 조회 | `details`에 dispatchId 포함, `driverId/guideId` 미포함 |
| 11 | 차량 보험만료 설정 후 ops-alerts | 경고 표시 |
| 12 | 엑셀 일괄 등록 (클라이언트) | 첫 행부터 등록, 생성수 증가, 중복(Foreign/Unique) 오류는 행 단위 실패 |
| 13 | 테스트 데이터 정리 | 생성/수정된 데이터 원복 |
| 14 | 가이드 로그인 → `/guide` 진입·운행 시작/종료 | 기사 앱과 동일 동작, 가이드 본인 배차만 |
| 15 | 문서 출력 `POST /api/documents/render` | 201, 스냅샷 파일 + 이력 기록, 필수 필드 누락 시 400 |
| 16 | 원본 보존 `POST /api/import/raw` (xlsx/hwpx) | 201 COMPLETED + 행 보존, hwp/pdf는 PENDING 보존 |
| 17 | 더존 전송 `POST /api/accounting/douzone/export` (URL 미설정) | 201 PENDING 적재, URL 설정 시 SUCCESS/FAILED |
| 18 | 알림 재시도 `POST /api/notifications/retry` + 수신함 | 처리 건수 반환, IN_APP 읽음 처리 |
| 19 | `/api/stats` 2회 조회 | 2회째 `cached:true`, `POST /api/stats/refresh` 후 미캐시 |
| 20 | `/api/health` + `/api/audit-logs/verify` | 200 + `{ intact:true }` |
| 21 | 목록 페이지네이션 `GET /api/dispatches?limit=1&offset=1` | 200 + `{ data, total, limit, offset }` |
| 22 | 차량 삭제 가드(진행중 배차 참조) | 409 |

### 2.4 기능 OFF→ON 매트릭스 (반드시 확인)
| 기능 키 | OFF 시 | ON 시 |
|---|---|---|
| semiAutoDispatch | /dispatch-recommend 409 | 추천/커밋 동작 |
| runLog | 종료시 runLog 불필요, 작업일지 미기록 | 종료시 `RUN_LOG_REQUIRED`(400), 작업일지 기록 |
| autoSettlement | 종료시 정산 미생성 | 종료시 정산 초안 생성 |
| vehicleExpiry | 만료 표시·알림 없음 | 목록 표시 + ops-alerts 알림 |
| excelImport | /api/import/[r] 409 | 일괄 등록 동작 |
| dashboardAlert | /api/ops-alerts 409 | 알림 목록 제공 |
| smsNotify | 배차 시 큐 기록 없음 | NotificationQueue(SMS) 기록 + 게이트웨이 fire-and-forget |

## 3. TDD 제안 (신규 기능 개발 시)

1. **레드**: 위 스모크에 추가할 시나리오를 먼저 작성(실패 확인)
2. **그린**: `src/lib/*`와 `src/app/api/*` 구현, lint/tsc 통과
3. **리팩터**: ResourceDef 기반 패턴 재사용(새 리소스는 `resources.ts`에 정의), 기능 키는 `features.ts` FEATURE_DEFS에 등록
4. **회귀**: 2.3 전체 시나리오 재실행

## 4. 알려진 함정 (과거 실패 사례)

| 함정 | 증상 | 해결 |
|---|---|---|
| 쿠키 파싱 정규식 오류 | 스모크에서 전부 401 | 2.2 규칙 준수 |
| `prisma generate` EPERM | DLL 잠김(dev 서버가 실행 중) | 포트 3000 node 프로세스 종료 후 generate |
| 추천 테스트용 일정 부재 | 배차 없는 일정을 못 찾음(시드 2건 모두 배차됨) | 테스트용 일정을 Prisma로 직접 생성 후 사용 |
| Settlement `driverId/guideId` @unique | 같은 기사 2번째 정산 생성 시 충돌 | v0.2.1 unique 제거 + targetId 인덱스, 자동 정산은 `driverId/guideId` 미설정 철칙 유지 |
| sheet_to_json 배열 가정 | headerMapFor가 빈 맵 → "필수 입력" 400 | `sheet[0]`가 객체이므로 `Object.keys(sheet[0])` 사용 + 첫 행부터 처리(수정 완료) |
| 엑셀 수식 셀 | `=1+1` 등 수식 주입 | `textCell()`가 문자열 안전 처리 |
| PowerShell `node -e`의 `$` | 셸이 `$변수` 해석 | temp .mjs 파일로 작성 |