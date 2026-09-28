# Database — 데이터베이스 설계서

> 버전: v0.3.0 · 갱신일: 2026-09-28
> 스키마: `prisma/schema.prisma` (Prisma 6 + **PostgreSQL**). 운영 `DATABASE_URL=postgresql://USER:PASS@db:5432/gberp` (docker-compose `db` 서비스)

## 0. PostgreSQL 전환 노트 (v0.3.0, SQLite → PG)

- JSON 컬럼은 그대로 `String(Text)` 저장 — 코드 변경 없음.
- `contains` 검색은 PG에서 대소문자 구분 → 감사 로그 조회는 `mode: "insensitive"` 적용. 목록 검색은 클라이언트 필터라 영향 없음.
- SQLite 파일 백업 방식 폐기 → `pg_dump` (install.md §7, harness.md §4).
- 스키마 동기화: 컨테이너 entrypoint가 `prisma db push` 자동 수행. 로컬 개발은 `docker compose up -d db` 후 동일 명령.

## 1. 모델 목록 (26개)

| # | 모델 | 테이블 | 용도 |
|---|---|---|---|
| 1 | User | users | 사용자·권한·계정 |
| 2 | Client | clients | 고객/거래처(관공서·학교·기업·개인) |
| 3 | TravelProduct | travel_products | 여행상품 |
| 4 | Schedule | schedules | 일정 |
| 5 | Contract | contracts | 견적/계약 |
| 6 | Vehicle | vehicles | 차량 (보험·검사 만료 포함) |
| 7 | Driver | drivers | 기사 (면허·근무조건) |
| 8 | Guide | guides | 가이드 |
| 9 | Dispatch | dispatches | 배차 (자동추천·경고 포함) |
| 10 | DriverWorkLog | driver_work_logs | 기사 운행일지 |
| 11 | DispatchRule | dispatch_rules | 배차 규칙(가중치) |
| 12 | AccountingEntry | accounting_entries | 분개(회계) + 더존 플래그 |
| 13 | AccountingSlip | accounting_slips | 전표 + 더존 전표번호 |
| 14 | Settlement | settlements | 정산 (기사/가이드/외주) |
| 15 | RawImportFile / RawImportRow | raw_import_files / raw_import_rows | 원본 파일 이관 보존 |
| 16 | DocumentTemplate / DocumentField / DocumentOutputHistory | document_* | 관공서 문서 템플릿·출력 이력 |
| 17 | NotificationQueue | notification_queue | 알림 큐(SMS/PUSH/EMAIL/IN_APP) |
| 17-1 | PushSubscription | push_subscriptions | 웹 푸시 구독 |
| 17-2 | AppSetting | app_settings | 키-값 설정(기능 토글 포함) |
| 18 | AuditLog | audit_logs | 감사 로그 |
| 18-1 | LoginAttempt | login_attempts | 로그인 실패 잠금(DB 기반) |
| 19 | DouzoneExportLog | douzone_export_logs | 더존 전송 로그 |
| 20 | StatsCache | stats_cache | 통계 캐시 |

## 2. ER 주요 관계

```
User 1─1 Driver            User 1─1 Guide
Driver 1─N Dispatch        Guide 1─N Dispatch
Vehicle 1─N Dispatch       Schedule 1─N Dispatch
Client 1─N Schedule        TravelProduct 1─N Schedule
Client 1─N Contract        TravelProduct 1─N Contract
Contract 1─N Schedule      Schedule 1─N Dispatch
```
Dispatch 1─N DriverWorkLog (dispatchId + driverId로 이력)
Settlement ── targetId(targetName)로 Driver/Guide/외주 식별 (driverId/guideId는 optional @unique)
User ──(SalesManager)─N Client  (salesManagerId)
```

## 3. enum 목록

| enum | 값 |
|---|---|
| UserRole | SUPER_ADMIN, ADMIN, SALES, OPERATOR, DRIVER, GUIDE |
| UserStatus | ACTIVE, INACTIVE, SUSPENDED |
| ClientType | INDIVIDUAL, PUBLIC, SCHOOL, CORPORATION |
| ClientStatus | ACTIVE, INACTIVE, BLACKLIST |
| ProductType | PACKAGE_TOUR, GROUP_TOUR, COMMUTE_BUS, CHARTER_BUS |
| ProductStatus | ACTIVE, INACTIVE, DRAFT |
| ScheduleStatus | PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| ContractStatus | DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED |
| VehicleOwnership/Type/Status | OWN·EXTERNAL / MINIBUS·MIDBUS·LARGE_BUS·LIMOUSINE / ACTIVE·MAINTENANCE·RETIRED |
| DriverLicenseType | LARGE, LARGE_SPECIAL, TRAILER |
| DriverStatus | AVAILABLE, ON_DUTY, REST, LEAVE, RETIRED |
| GuideStatus | AVAILABLE, ON_TOUR, REST, LEAVE, RETIRED |
| DispatchStatus | PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, FAILED |
| WorkLogStatus | STARTED, ENDED, PAUSED |
| RuleType | REST_HOURS, MAX_DAILY_HOURS, CONSECUTIVE_DAYS, REGION_MATCH, PREFERENCE |
| EntryType | SALES, EXPENSE, RECEIVABLE, PAYABLE, DEPOSIT, WITHDRAWAL |
| AccountingStatus | PENDING, APPROVED, COMPLETED, EXPORTED, FAILED |
| SlipStatus | DRAFT, PENDING, APPROVED, REJECTED, POSTED |
| SettlementType | DRIVER, GUIDE, EXTERNAL_COMPANY |
| SettlementStatus | PENDING, CALCULATED, APPROVED, PAID, CANCELLED |
| ImportFileType | EXCEL, HWP, PDF |
| ImportStatus | PENDING, PARSING, COMPLETED, FAILED |
| InstitutionType | CENTRAL_GOV, LOCAL_GOV, PUBLIC_AGENCY, SCHOOL, MILITARY |
| DocumentType | CONTRACT, CERTIFICATE, OPERATION_LOG, ESTIMATE, RECEIPT |
| NotificationChannel | PUSH, SMS, EMAIL, IN_APP |
| NotificationStatus | PENDING, SENT, FAILED, CANCELLED |
| AuditAction | CREATE, UPDATE, DELETE, VIEW, EXPORT, APPROVE, REJECT |

## 4. 중요 제약 (운영 시 반드시 숙지)

- **정산 대상 관계**: `Settlement.driverId/guideId`는 **unique 제거됨(v0.2.1)** — 다건 허용. 정식 식별자는 `targetId/targetName + details JSON`. `targetId` 인덱스 존재.
  → 자동 정산은 이 필드를 **사용하지 않음**. 수동 정산도 target 기반으로 기록.
- `settlementNumber`, `entryNumber`, `contractNumber`, `plateNumber`, `licenseNumber`, `bizNumber`, `email`, `phone`, `employeeCode`, `houseSetting.key`, `push.endpoint` 등 unique.
- **JSON 문자열 컬럼**: seasonalPricing, options, items, route, specialConditions, issues, warnings, preferredRoutes, excludedRoutes, languages, specializations, coordinates 등은 Prisma `String` + JSON 문자열로 저장.
- 소프트 삭제: `deletedAt DateTime?` — 주요 마스터 전역 사용. 예외: `DocumentTemplate/DocumentField`(컬럼 없음, 하드 삭제 + 템플릿 삭제 시 필드 cascade).
- `RawImportRow.rawJson`은 원본 행 데이터(**절대 삭제 금지**).

## 5. AppSetting (설정/기능 토글)

키 목록은 `src/lib/settings.ts` `DEFAULT_SETTINGS`와 항상 동기화:

```
company.*        (name, registrationNumber, ceoName, phone, fax, email, address, businessType, businessItem, logoPath)
voice.defaultRate = 0.95
voice.autoAnnounce = true
dispatch.defaultRestHours = 8
holidays.list = []              (JSON: [{date, name}])
document.specPath / document.specName
features.semiAutoDispatch = true   ← 기본 유일 ON
features.runLog / vehicleExpiry / autoSettlement / excelImport / dashboardAlert / smsNotify = false
sms.gatewayUrl / sms.apiKey
douzone.endpointUrl / douzone.apiKey
email.gatewayUrl / email.apiKey / email.from
pwa.name / pwa.shortName / pwa.themeColor / pwa.backgroundColor / pwa.iconPath / pwa.iconUpdatedAt
rbac.overrides (= "{}", SA 전용 /api/rbac로만 변경)
```

> 설정 저장(PUT /api/settings, saveSettings)은 `DEFAULT_SETTINGS` 키 **whitelist**만 수용합니다.

## 6. 시드 데이터 요약 (`prisma/seed.mjs`)

- 사용자 8명(비밀번호 `admin1234`): admin, manager, sales, op, driver1, driver2, guide1
- 기사 2(경기/경인 지역, 면허 ~2030/2031), 가이드 1(한국어·중국어)
- 고객 4(관공서·학교·기업·개인), 상품 4, 차량 4(자차 신번호 3 + 외차), 배차 규칙 5
- 계약 1(C-2026-0001, 활성), 일정 2(s1 확정·배차 1건, s2 계획·배차 1건 PENDING)
- 시드가 이미 존재하면 **중복 실행 불가**(유일성). 초기화는 `npm run db:reset`(주의: 전체 삭제)

## 7. 스키마 변경 절차

```bash
# 1) schema.prisma 수정
# 2) 실행
npx prisma db push     # SQLite 직접 반영
npx prisma generate    # dev 서버 중지 후 (EPERM 방지)
# 3) 회귀: npx tsc --noEmit / 스모크
```

> `prisma/migrations/0_baseline` 기준선 생성됨(데이터 무손실 `migrate resolve` 방식). 이후 스키마 변경은 `npm run db:migrate`로 증분 마이그레이션.
>
> 추가 모델: `LoginAttempt`(로그인 실패 잠금), `AuditLog.prevHash/entryHash`(무결성 체인).