# Risk — 리스크 및 위험 관리

> 버전: v0.2.1 · 갱신일: 2026-09-28

## 1. 리스크 레지스터

| ID | 리스크 | 영향 | 확률 | 대응 |
|---|---|---|---|---|
| R1 | 데이터베이스 손상/삭제 | 업무 중단 | 낮음 | 매일 `db/custom.db` 스냅샷, 배포 스크립트에 백업 태스크 |
| R2 | 실서버 시크릿 노출(.env) | 계정 탈취 | 중 | NEXTAUTH_SECRET 교체, .env git 제외, 키 순환 절차 |
| R3 | 브루트포스 로그인 | 계정 탈취 | 중 | 계정당 8회/15분 잠금(DB 기반 `login_attempts` — 다중 인스턴스 대응 완료, 중앙 정책 `security-policy.ts`) |
| R4 | SMS 게이트웨이 비용 폭주 | 비용 | 중 | `smsNotify` 기본 OFF, 기능 개폐로 즉시 차단, 큐만 기록, 전화번호 형식 검증(`isValidPhone`), 타임아웃 15초 |
| R5 | 기능 토글 실수(운영 중 OFF) | 배차/정산 데이터 불일치 | 중 | 저장 시 변경 감지 알림(추후), 회귀 스모크로 고정 |
| R6 | 반자동 추천 오배차 | 운행 차질 | 중 | 추천은 "확정 아님" PENDING 생성, 운영자 확인 후 CONFIRMED |
| R7 | 중복 정산 생성 | 회계 오류 | 낮음 | details.contains(dispatchId) 중복 가드 + `nextDailyNumber` 재시도 번호 생성 + settlementNumber unique |
| R8 | 기사 시간 충돌 누락 | 이중 배차 | 낮음 | 기사/차량 모두 interval overlap 강제 검사(생성/수정/추천 커밋 3경로) + 삭제 시 진행중 배차 참조 차단(409) |
| R9 | 엑셀 업로드 오염(수식/거대 파일) | 보안/성능 | 중 | textCell 방어, 크기 제한, sign 시트 위험 유의 |
| R10 | 더존 연동 데이터 포맷 불일치 | 회계 재검증 부담 | 중(미구현) | dz 필드 구조만 준비, 연동 전 샘플 매핑 확정 |
| R11 | 로그인 잠금이 인메모리 | 재시작 시 잠금 초기화 | 낮음 | 해소됨 — DB 기반(`login_attempts`)으로 교체 완료 |
| R12 | next-intl/다국어 | 미사용 모듈 부하 | 낮음 | 한글 단일 언어 운영 확정 |
| R13 | TypeScript 오류 무시 빌드 | 타입 버그 잠복 | 중 | `next.config.ts` `ignoreBuildErrors:false + reactStrictMode:true`로 전환 완료, `.github/workflows/ci.yml`에 `lint + tsc --noEmit` 게이트 구현 완료 |
| R14 | 데이트 포맷 로케일 오류 | 5시/오후 표기 오류 | 낮음 | 일관된 formatYmd/date-fns 사용, 시간 표기는 ko-KR |
| R15 | Tauri/빌드 폐쇄형 배포 누락 | 데스크톱 운영 불가 | 중 | standalone 빌드 검증, start.mjs 기동 테스트 |

## 2. 로그인 보안 리스크 상세

- 잠금은 **DB 기반(`login_attempts`)**: 서버 재시작 후에도 유지, 다중 인스턴스 대응. 임계값/윈도우는 `src/lib/security-policy.ts` 중앙 관리(8회/15분)
- 다중 인스턴스/로드밸런서 배포 시에도 공유 DB이므로 추가 Redis 불필요(단, 고부하 시 TTL 인덱스 검토)
- 비밀번호: bcrypt 12 rounds(`SECURITY_POLICY.auth.bcryptRounds`), 8자 최소 길이 서버 강제. 시드 비밀번호는 `SEED_PASSWORD` 환경변수로 주입

## 3. 데이터 보호 리스크 상세

- 모든 삭제는 soft delete — 실수 삭제 시 복구 가능하나 `deletedAt` 누락 조회 버그에 주의(회귀 테스트로 검증). 차량/기사/가이드는 진행중 배차 참조 시 409로 삭제 차단
- 감사 로그는 민감값 마스킹 후 기록(`redactSensitiveDeep`: password/passwordHash/apiKey/secret/token → `[REDACTED]`), sha256 해시 체인(`prevHash/entryHash`), 무결성 검증 `GET /api/audit-logs/verify`(SA/ADMIN)

## 4. 운영 중 기능 개폐에 따른 파급 (체크리스트)

| 전환 | 전 | 후 | 점검 |
|---|---|---|---|
| runLog ON | 종료가 즉시 | 종료 시 운행일지 필수(400) | 기사 교육, 미기록 방지 |
| autoSettlement OFF→ON | 기존 COMPLETED 배차 자동 정산 안됨 | 새 종료 시 초안 생성 | 과거 배차 수동 정산 필요 |
| vehicleExpiry ON | 만료 미표시 | 목록/알림 표시 | 과거 만료 데이터 정리 |
| excelImport ON | 내보내기만 | 업로드 가능 | 템플릿 안내 |
| dashboardAlert ON | 알림 없음 | 알림 위젯 노출 | 심각도 라벨 확인 |
| smsNotify ON | 큐 없음 | 큐 + 게이트웨이 호출 | URL/요금 확인 |

## 5. 장애 대응 시나리오

| 증상 | 추정 원인 | 조치 |
|---|---|---|
| 모든 API 401 | 쿠키/시크릿 불일치 | NEXTAUTH_SECRET 일치·재시작 |
| `/api/dispatch-recommend` 409 | 기능 OFF / 배차 있는 일정 | 설정 확인 / 다른 일정 |
| 정산 안 만들어짐 | autoSettlement OFF / 이미 생성됨 | 설정·details 확인 |
| 엑셀 등록 "필수 입력" 400 | 헤더 불일치 | 내보내기 파일 그대로 사용(헤더 라벨 일치) |
| SMS 안 감 | smsNotify OFF / gatewayUrl 미설정 | 기능 탭 확인 |

## 6. 신규 기능 도입 시 추가 리스크 검토

- 새 외부 연동(더존·DM·지자체 메신저): 인증 키 관리, 실패 재시도, 개인정보 보호
- 정산 금액 자동 확정: 수작업 검증 단계(CALCULATED→APPROVED) 유지
- 실시간 위치/모바일: 기사 단말 배터리·오프라인 → 큐 기반 동기화 검토