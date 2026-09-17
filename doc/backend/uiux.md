# UI/UX — 화면 구성 및 사용자 경험

> 버전: v0.2.0 · 갱신일: 2026-09-17
> Next.js App Router + Tailwind v4 + shadcn/ui(라디시 계열) 기준. 화면은 한글입니다.

## 1. 접근 구조

```
"/"                 → 역할 선택 (로그인 후 대시보드로 리다이렉트)
/login              → 로그인
/dashboard/*        → 관리자 업무 화면 (역할별 메뉴 필터링)
/driver             → 기사 전용 앱
/guide              → 가이드 전용 앱 (기사와 동일 구조)
/offline            → PWA 오프라인 페이지
```

## 2. 레이아웃

- 사이드바 네비게이션은 `src/lib/permissions.ts`의 `MENU`를 역할(hasRole)로 필터링해 렌더링합니다.
- 메뉴 그룹: 업무 / 운영 / 정산·회계 / 시스템
- `middleware.ts`가 페이지 요청을 가로채 미로그인 시 `/login?callbackUrl=…`, 권한 없으면 `/dashboard`로 리다이렉트합니다.

### 메뉴 (역할별)
| 메뉴 | 경로 | 허용 역할 |
|---|---|---|
| 대시보드 | /dashboard | 전체 |
| 고객/거래처 | /dashboard/clients | SA, ADMIN, SALES |
| 상품 관리 | /dashboard/products | SA, ADMIN, SALES, OP |
| 일정 관리 | /dashboard/schedules | SA, ADMIN, SALES, OP |
| 견적/계약 | /dashboard/contracts | SA, ADMIN, SALES, OP |
| 배차 관리 | /dashboard/dispatches | SA, ADMIN, OP, SALES |
| 차량 관리 | /dashboard/vehicles | SA, ADMIN, OP |
| 기사 관리 | /dashboard/drivers | SA, ADMIN, OP |
| 가이드 관리 | /dashboard/guides | SA, ADMIN, OP |
| 회계 관리 | /dashboard/accounting | SA, ADMIN |
| 정산 관리 | /dashboard/settlements | SA, ADMIN |
| 통계/리포트 | /dashboard/reports | SA, ADMIN, SALES |
| 알림 전파 | /dashboard/notifications | SA, ADMIN, OP, SALES |
| 업체 설정 | /dashboard/settings | SA, ADMIN |
| 감사 로그 | /dashboard/audit-logs | SA, ADMIN |
| 사용자/권한 | /dashboard/users | SA, ADMIN |

## 3. 공통 UI 패턴

- **리소스 목록 화면**: 검색(`searchKeys`), 상태 배지(`statusVariant`→ success/info/warning/destructive/secondary), 행 단위 상세 다이얼로그, 삭제는 `window.confirm`
- **폼**: 다이얼로그 내 라벨+입력, `required`은 필수 표시, 시각적 힌트(`help`/`placeholder`), `datetime`/`date` 기본 공급자
- **Select**: 네이티브만 사용 (`onChange={(e)=>…}`), 옵션은 `optionsRoute`로 `/api/<route>?all=1`에서 `{value,label}` 로딩
- **배지 변형**: default/secondary/destructive/outline/success/warning/info/muted
- **정차(stops)**: 출발→정차→도착 경로를 순서 있는 리스트로 입력/표시

## 4. 대시보드 (/dashboard)

- 역할별 카드(통계)가 다릅니다:
  - 관리자: 오늘 배차 / 이달 매출 / 진행중 계약 / 정산 대기
  - 운영자·영업: 오늘 배차 / 미확정 배차 / 운행중 / 계약 대기
  - 기타: 오늘 운행 / 운행중
- 최근 배차(8건)·최근 계약(8건)·고객 유형 분포
- **운영 알림 위젯**(`dashboardAlert` OFF 시 숨김): severity별 색상(danger 빨강/warn 노랑/info 파랑), 링크 이동

## 5. 배차 관리 (/dashboard/dispatches)

- 월 필터(`?month=YYYY-MM`), 목록, 상세(경고 목록·정차·특이조건 표시)
- **반자동 배차 버튼**(`semiAutoDispatch` ON일 때만):
  1. 배차 없는 일정 선택(드롭다운)
  2. "추천 받기" → 기사/차량 후보 카드(점수+사유)
  3. 조합 선택 → "이 조합으로 등록" → 생성 후 목록/달력/통계 재검증(invalidate)

## 6. 기사 앱 (/driver)

- 상단: 인사말, 오늘/전체 배차 수, 새로고침
- 음성 안내 카드: "전체 음성 안내 듣기"(오늘 배차 큐 재생) / "음성 중지"
- 자동 음성 안내 스위치 (localStorage 개별 저장, 새 배차 발견 시 안내 + 웹푸시)
- 오늘 배차 카드: 출발/도착, 정차(번호 목록), 경고(주황), 차량·인원·가이드, TTS(구간 읽기), 상세
- 운행 시작/종료 버튼, 종료 시 실제시간 표시
- **runLog ON** 시 종료 버튼 → **운행일지 다이얼로그**(종료 주행거리, 특이사항/이슈, 메모) → 종료 확정
- 휴일 배너(설정의 휴일 목록), 1분 자동 폴링

## 7. 설정 화면 (/dashboard/settings)

- 탭: 업체 정보 / 알림·음성 / 배차 규칙 / 휴일 / 문서 / **기능**
- 기능 탭: FEATURE_DEFS 스위치(라벨+설명), SMS 게이트웨이 URL·API키 입력(플레이스홀더 설명)
- 저장 시 즉시 반영(PUT /api/settings → revalidate)

## 8. UX 원칙

- 대부분 상호작용은 시트/다이얼로그로 즉시 반영(잔상 없음)
- 오류는 토스트(sonner), 필수 누락은 서버 검증 메시지 그대로 표시
- 반응형: 모바일에서 사이드바 축소, 카드형 목록, 큰 버튼(기사앱은 터치 최적화)
- 데스크톱(Tauri)와 브라우저 동일 화면, PWA 설치 대응