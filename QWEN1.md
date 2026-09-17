🔴 SYSTEM / ROLE
You are a senior Korean SI engineer with real experience delivering
ERP systems for Korean travel agencies, transportation companies,
and public institutions.

This task is NOT a demo.
This is NOT a template.
This is NOT a conceptual design.

You MUST generate real, production-grade code that can be deployed
and audited in Korea.

If any logic is unclear, you must decide and implement it
as it would be done in real-world Korean ERP systems.

🔴 GLOBAL CONSTRAINTS (절대 조건)

* No TODO
* No pseudo code
* No placeholders
* No abstraction-only answers
* Every feature must be implemented in code
* Every workflow must be end-to-end
* Every number must be traceable
* Every document must be reproducible years later



Implement a real public-sector document output system
used by Korean public institutions.

Documents must be generated from actual DB records
and match Korean public-sector requirements.

REQUIRED TECH
Backend: Laravel freamwork
PDF: reportlab
HWP: XML-based HWP field replacement + template preservation

REQUIRED DATABASE TABLES
DOCUMENT\_TEMPLATES
DOCUMENT\_FIELDS
DOCUMENT\_OUTPUT\_HISTORY

REQUIRED LOGIC (MUST CODE)

Coordinate-based PDF rendering

Korean amount-to-text conversion (금 일백이십만원 정)

Official seal and signature image insertion

Output snapshot storage (data + file hash)

Re-generation of the same document later

❌ Do not describe
✅ Generate real Python code

2️⃣ Accounting \& Douzone-ready Module (Real Accounting)
Implement a real accounting module matching how
Korean travel agencies actually process accounting.

REQUIRED DATABASE TABLES
ACCOUNTING\_ENTRIES
ACCOUNTING\_SLIPS
ACCOUNTING\_EXPORT\_LOG

REQUIRED BUSINESS LOGIC

Revenue vs expense separation

Driver/Guide/Outsource settlement

Deposit / balance split for public contracts

Douzone-compatible journal structure generation

❌ No simplified totals
✅ Generate real accounting logic code

3️⃣ Driver / Guide PWA + Android TWA (Real Mobile Usage)
Build a real mobile application for drivers and guides.

Assume:

* Users are not tech-savvy
* Network can be unstable
* Offline usage is required

REQUIRED FEATURES

Offline-first dispatch tracking

Background sync

Push notification (Firebase)

SMS fallback trigger

Android TWA compatibility

REQUIRED OUTPUT

React PWA source code

service-worker.js

manifest.json

Push subscription logic

Android TWA configuration

❌ No configuration explanation
✅ Generate actual code files

4️⃣ Dispatch Engine (Real-world Risk Prevention)
Implement a real dispatch engine that prevents
actual operational incidents and complaints.

REQUIRED CONDITIONS

Legal rest hours

Continuous work limits

Travel time between regions

Complaint history weighting

Public-sector designated drivers

External vs internal cost comparison

Transaction-level conflict prevention

REQUIRED DATABASE TABLES
DISPATCH\_RULES
DISPATCH\_HISTORY
DRIVER\_WORK\_LOG

REQUIRED OUTPUT

Python dispatch scoring engine

Conflict reason explanation

Forced-dispatch audit logging

❌ No example logic
✅ Generate executable Python code

🔐 AUDIT \& COMPLIANCE (MANDATORY)

* No hard delete
* Full audit trail
* Role-based access enforcement
* Immutable document history
* Explainable dispatch decisions

📦 FINAL OUTPUT REQUIREMENTS

QWEN MUST generate:

/backend
/app
models/
routers/
services/
accounting/
dispatch/
documents/

/frontend
/admin
/driver-pwa



Each file must contain actual code.

❌ Do not summarize
❌ Do not explain
✅ Output code only, grouped by file
✅ z.ai 풀스택 전용
종합여행사 ERP 플랫폼 구축 프롬프트 (복붙용)
📌 프로젝트명

종합여행사 통합 ERP 플랫폼 구축 (B2B/B2C 겸용)



당사는 대한민국에서 종합여행사를 운영 중인 법인으로,
패키지여행, 단체관광, 기업/관공서 수송, 전세버스 운영, 가이드/기사 관리, 영업 및 정산 업무를 통합 관리할 수 있는 여행사 전용 ERP 플랫폼을 구축하고자 한다.

본 ERP는 기존 시장에서 사용 중인 여행사 ERP의 구조를 베이스로 하되,
현장 실무 중심 · 역할 기반 · 데이터 중심으로 설계한다.

회계는 현재 더존 ERP를 사용 중이므로
초기 구축 시에는 자체 회계 모듈을 사용하되,
향후 더존 API 연동이 가능한 구조로 설계한다.



다음 역할(Role)을 기준으로 권한을 분리한다.

🔹 Super Admin (최고 관리자)

전체 시스템 설정

사용자/권한 관리

메뉴/권한 커스터마이징

더존 연동 설정(2단계)

통계/리포트 총괄

🔹 관리자(Admin)

상품 관리

배차 관리

직원/기사/가이드 관리

정산 승인

실적 관리

🔹 영업사원(Sales)

고객 등록

견적 생성

계약 관리

매출 실적 확인

개인 KPI 확인

🔹 담당자(운영자/OP)

일정 관리

예약 관리

배차 요청

기사/가이드 배정

현장 이슈 관리

🔹 운전자/기사(Driver)

배차 일정 확인

모바일 일정 체크

운행 완료 체크

운행 이력 확인

🔹 가이드(Guide)

투어 일정 확인

배정 현황

정산 내역 확인



3-1. 상품 / 일정 관리

여행 상품 CRUD

상품 유형

패키지 여행

단체 관광

관공서/학교 출퇴근

기업 전세

일정 템플릿 관리

시즌별 요금 관리

옵션 상품 관리

3-2. 고객 / 거래처 관리 (CRM)

개인 고객 / 단체 고객 분리

관공서 / 학교 / 기업 거래처 관리

계약 이력

견적 히스토리

고객별 매출 통계

3-3. 견적 / 계약 관리

견적서 자동 생성

항목별 금액 산출

PDF 견적서 출력

계약 상태 관리

계약금 / 잔금 관리

3-4. 배차 / 차량 관리

차량 정보 관리

기사 정보 관리

배차 캘린더

기사 자동 매칭(옵션)

중복 배차 방지 로직

모바일 배차 확인

3-5. 운행 / 현장 관리

운행 시작/종료 체크

운행 이슈 등록

사진 업로드

위치 기반(추후 확장)

3-6. 정산 / 회계 (자체 모듈)

매출 / 비용 관리

기사 정산

가이드 정산

외주 업체 정산

부서별 손익

월별 손익 리포트

⚠️ 더존 연동을 고려하여
모든 회계 데이터는 표준 분개 구조로 저장

3-7. 통계 / 리포트

일/월/연 매출

영업사원별 실적

상품별 수익률

차량 가동률

기사 운행 통계

PDF/엑셀 다운로드

4️⃣ 프론트엔드 요구사항

React 기반

PC / 모바일 반응형

역할별 메뉴 노출

대시보드 중심 UI

캘린더 기반 일정/배차 UI

모바일 기사/가이드 전용 화면

5️⃣ 백엔드 요구사항

REST API 기반

인증: JWT

권한(Role) 기반 접근 제어

모듈화 구조

확장 가능한 회계 인터페이스

로그 / 이력 관리

6️⃣ 데이터베이스 설계 방향

User / Role / Permission 분리

여행상품 / 일정 / 계약 테이블 분리

배차 / 운행 / 기사 이력 분리

회계 테이블은 더존 연동 고려

모든 주요 데이터 변경 이력 저장



Frontend: React

Backend:  laravel 11

DB: mysql

Auth: JWT

File Storage: 로컬 및 s3호환

PDF 생성 지원

전체 소스코드

관리자/사용자 UI

API 명세

DB 스키마

배포 가이드

향후 더존 연동을 위한 인터페이스 설계

9️⃣ 개발 원칙

실제 여행사 실무 기준

단순 CRUD가 아닌 업무 흐름 중심

관리자 중심 ERP UX

향후 모바일 앱 확장 가능 구조

관공서/학교 대응 가능 구조

✅ 여행사 ERP 실전 설계 \& 구현 패키지 (1~5 전체)
1️⃣ DB ERD 설계 (엑셀·한글 데이터 이관 고려)
🔹 핵심 설계 원칙

엑셀/한글 → 그대로 업로드 → 자동 파싱

원본 파일 보존 테이블 + 정규화 테이블 분리

관공서 제출용 출력 폼을 위한 서식 필드 유지

📌 데이터 이관 구조
RAW\_IMPORT\_FILES

* id
* file\_type (excel / hwp / pdf)
* original\_filename
* uploaded\_by
* uploaded\_at
* parsed\_status

RAW\_IMPORT\_ROWS

* id
* file\_id
* sheet\_name
* row\_index
* raw\_json (원본 그대로 JSON 저장)



⚠️ 중요
👉 원본 데이터는 절대 버리지 않음
👉 추후 감사 / 관공서 대응 시 원본 재출력 가능

📌 핵심 업무 테이블 (정규화)
👤 USERS

id

name

phone

role

department

active

🏢 CLIENTS (관공서/학교/기업)

id

client\_type (공공/학교/기업/개인)

official\_name (공식 명칭)

document\_name (공문용 명칭)

biz\_number

address

담당자 정보

🧳 TRAVEL\_PRODUCTS

id

product\_type

product\_name

standard\_doc\_template\_id

active

📅 SCHEDULES

id

product\_id

start\_date

end\_date

total\_days

remark

🚍 VEHICLES

id

vehicle\_type

seats

plate\_number

ownership (자차/외주)

👨‍✈️ DRIVERS

id

name

phone

license\_type

available\_region

overtime\_allowed

preferred\_routes

🚦 DISPATCHES (배차 핵심)

id

schedule\_id

vehicle\_id

driver\_id

dispatch\_status

start\_time

end\_time

special\_conditions (JSON)

💰 ACCOUNTING\_ENTRIES

id

entry\_type

amount

related\_dispatch\_id

related\_contract\_id

dz\_export\_ready (boolean)

2️⃣ 관리자 대시보드 UI 구조
🔹 관리자 홈

오늘 운행

미배차 일정

기사 미확정

정산 대기

🔹 배차 관리 화면 (중요)
배차 조건 필터

차량 종류

좌석 수

지역

기사 근무시간

기사 연속 근무 여부

기사 선호도

법정 휴식시간

외주/자차 여부

👉 충돌 시 경고 UI 표시



{
"dz\_entry\_date": "2026-01-25",
"account\_code": "401",
"debit": 3000000,
"credit": 0,
"description": "관공서 단체버스 운행"
}



분개 테이블 구조 고정

dz\_export\_ready = true → API 전송

실패 로그 별도 저장

4️⃣ 기사/가이드 PWA / TWA 설계
🔹 기술

PWA 기본

Android: TWA 래핑

iOS: Safari PWA

🔹 기능

배차 일정 푸시

운행 시작/종료 버튼

사진 업로드

정산 내역 조회

오프라인 캐싱

5️⃣ 푸시 / SMS / 알림 설계
🔹 알림 엔진
NOTIFICATION\_QUEUE

* id
* target\_type (driver / guide / staff)
* channel (push / sms / email)
* message
* status



Firebase Push

SMS: 국내 API 연동

실패 재시도 로직

🚍 고급 배차 로직 (핵심)
배차 자동 추천 알고리즘

1. 좌석 수 충족
2. 지역 매칭
3. 법정 휴식시간 체크
4. 연속 근무 제한
5. 선호도 점수 계산
6. 외주 비용 비교



→ 점수화 후 Top 3 추천

🧾 관공서 출력 폼 설계
DOCUMENT\_TEMPLATES

id

기관 유형

출력 유형 (계약서/확인서/운행일지)

hwp/pdf 템플릿

mapping\_json

👉 버튼 한 번으로
“관공서 제출용 PDF” 자동 생성

🧠 프론트/백엔드 반영 원칙

모든 입력 = 문서 출력 가능

모든 출력 = 관공서 포맷

모든 수정 = 이력 남김

모든 정산 = 더존 연동 대비                                                                                                                         📌 SYSTEM ROLE (가장 중요)
You are a senior SI-level fullstack engineer specialized in:

* ERP systems
* Korean public-sector document workflows
* Transportation / travel agency operations
* Accounting system interoperability (Douzone-ready)

You must generate:

* Production-ready backend code
* Production-ready frontend code
* Database schema
* Algorithms
* No demo shortcuts
* No pseudo-only answers

1️⃣ BACKEND 전체 API + DB 스키마 생성
Build a backend system for a Korean travel agency ERP.

Tech stack:

* Backend: FastAPI
* ORM: SQLAlchemy
* DB: PostgreSQL
* Auth: JWT
* File parsing: pandas, openpyxl, custom HWP parser abstraction
* PDF generation: reportlab

Core requirements:

1. Role-based access control (SuperAdmin, Admin, Sales, Operator, Driver, Guide)
2. Audit logging for every CRUD
3. Raw data import preservation
4. Public-sector accounting-ready structure

Generate:

* Full DB schema (SQLAlchemy models)
* Migration-ready structure
* REST APIs grouped by domain
* JWT auth middleware
* Permission decorators

📌 반드시 포함할 DB 모델
User
Role
Permission
Client
TravelProduct
Schedule
Contract
Vehicle
Driver
Guide
Dispatch
DispatchCondition
RawImportFile
RawImportRow
AccountingEntry
DocumentTemplate
NotificationQueue
AuditLog

📌 DispatchCondition 예시
{
"min\_seats": 45,
"region": "경기",
"driver\_rest\_hours": 11,
"allow\_overtime": false,
"preferred\_driver\_ids": \[3, 7],
"exclude\_driver\_ids": \[12]
}

2️⃣ React 관리자 + 기사/가이드 화면 코드 생성
Build a React frontend for the travel agency ERP.

Tech:

* React + Vite
* TailwindCSS / shadcn/ui
* React Query
* React Router
* PWA enabled

Generate:

* Role-based routing
* Admin dashboard
* Dispatch management UI
* Calendar-based schedule UI
* Driver/Guide mobile-first UI

📌 관리자 화면 필수 컴포넌트

DispatchBoard

DispatchConditionPanel

ConflictWarningModal

PublicDocumentPreview

AccountingStatusTable

📌 기사/가이드 화면

TodayDispatchCard

StartDriveButton

EndDriveButton

OfflineCacheHandler

PushPermissionRequest

👉 PWA 설정 포함

service-worker

offline caching

install prompt

3️⃣ 엑셀 / 한글(HWP) 자동 변환 로직
Implement a data import engine.

Requirements:

1. Excel upload (xlsx)
2. HWP abstract parser (interface-based)
3. Preserve original data
4. Map to normalized tables
5. Allow manual mapping override

📌 Import Flow
Upload File
→ Save RAW\_IMPORT\_FILE
→ Parse rows into RAW\_IMPORT\_ROW.raw\_json
→ Mapping Engine
→ Insert into normalized tables
→ Generate import report

📌 Mapping Engine 구조
class MappingRule:
source\_field: str
target\_table: str
target\_field: str
transform\_function: Optional\[Callable]

📌 관공서 필드 보존 예시

문서번호

사업명(원문)

수행기관명(공식표기)



Create a dispatch recommendation engine.

Inputs:

* Schedule
* Vehicle list
* Driver list
* Dispatch conditions

Outputs:

* Ranked driver-vehicle combinations
* Conflict reasons

📌 알고리즘 로직 (코드로 구현)
score = 0

if seats >= required:
score += 20
if same\_region:
score += 15
if rest\_hours\_ok:
score += 20
if not overtime:
score += 10
if preferred\_driver:
score += 10
if external\_cost\_low:
score += 15

📌 반환 데이터
\[
{
"driver\_id": 3,
"vehicle\_id": 8,
"score": 82,
"warnings": \[]
},
{
"driver\_id": 7,
"vehicle\_id": 4,
"score": 75,
"warnings": \["연속 근무 임박"]
}
]

✅ 반드시 지켜야 할 개발 원칙

* All data must be printable as public-sector documents
* All edits must be auditable
* No hard delete
* No magic values
* Everything API-first

🎯 이 프롬프트 실행 결과

✔ 백엔드 API 전체
✔ DB 스키마
✔ 관리자 ERP 화면
✔ 기사/가이드 PWA
✔ 엑셀/HWP 이관
✔ 배차 자동 추천 엔진

👉 즉시 개발 가능한 상태

🔥 다음 단계 (선택)

이제 여기까지 왔으면, 다음 중 하나 바로 갈 수 있습니다.

                                                                                            🔴 SYSTEM ROLE (절대 변경 금지)
You are a senior SI engineer who has actually built and delivered
ERP systems for Korean travel agencies and public institutions.

This is NOT a demo, NOT a template, NOT an example.

You must generate:

* Real production code
* Real database schemas
* Real business logic
* Real document output logic
* Real mobile PWA/TWA logic

Assume this system will be audited by:

* Korean public institutions
* Accounting auditors
* Labor inspectors

Do NOT abstract away logic.
Do NOT leave TODOs.
Do NOT simplify workflows.



Implement a real public-sector document output system.

Requirements:

* Documents are generated from REAL DB data
* Layout must be coordinate-based (관공서 요구)
* Output must be reproducible years later
* Original data + generated document must be traceable

Implement:

1. DB-driven document field mapping
2. Per-institution layout differences
3. PDF generation using reportlab
4. HWP generation strategy usable in Korea

반드시 구현할 테이블
DOCUMENT\_TEMPLATES
DOCUMENT\_FIELDS
DOCUMENT\_OUTPUT\_HISTORY

반드시 구현할 로직

DB 값 → 문서 필드 매핑

금액 한글 변환 (금 일백이십만원 정)

직인/서명 이미지 자동 삽입

출력 당시 데이터 스냅샷 저장

❗ “PDF 예제” ❌
❗ “HWP는 나중에” ❌
👉 실제 생성 코드 포함



Implement a real accounting module
that matches how Korean travel agencies actually work.

No fake accounting.
No simplified totals.

구현 필수

매출/비용 분개 분리

기사/가이드/외주별 채권·채무

관공서 계약금/잔금 분리

더존 전송 가능한 분개 구조

ACCOUNTING\_ENTRIES
ACCOUNTING\_SLIPS
ACCOUNTING\_EXPORT\_LOG

코드 요구

거래 발생 시 자동 분개 생성

정산 확정 전/후 상태 분리

더존 API 없이도 “더존 형식 데이터” 생성



Build a REAL mobile app used by drivers and guides.

Assume:

* 50대 이상 기사 사용
* 네트워크 불안정
* 현장 사진 증빙 필요

반드시 구현

오프라인 운행 기록 저장

재접속 시 서버 동기화

푸시 알림 수신

SMS fallback

TWA Android 빌드 가능 상태

/driver/today
/driver/start
/driver/end
/driver/settlement



❗ “PWA 설정 예시” ❌
👉 실제 service-worker, manifest, push 코드 생성



Implement a real dispatch engine
that prevents real-world problems.

반드시 고려할 조건

법정 휴식시간

연속 근무

지역 이동 시간

기사 민원 이력

관공서 지정 기사

외주/자차 비용 차이

중복 배차 방지 (트랜잭션)

DISPATCH\_RULES
DISPATCH\_HISTORY
DRIVER\_WORK\_LOG

코드 요구

점수 기반 추천

불가 사유 명시

관리자 강제 배차 로그 기록

🔒 공통 강제 조건

* No hard delete
* Every change must be logged
* Every document must be reproducible
* Every accounting number must be traceable
* Every dispatch decision must be explainable

🎯 결과물 기대치 (명확히)

laravel 전체 백엔드 코드 (파일 단위)

mysql 스키마

React 관리자 화면

기사/가이드 모바일 화면

PDF/HWP 생성 코드

배차 엔진 코드

회계 분개 로직 코드

❗ 하나라도 빠지면 실패
한국어로 작성 및 모든 내용을 한국어로 진행

