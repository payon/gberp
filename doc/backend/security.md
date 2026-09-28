# Security — 보안 설계서

> 버전: v0.2.1 · 갱신일: 2026-09-28

## 1. 인증 (Authentication)

- **방식**: NextAuth v4 Credentials + JWT (서버 세션 없음, 무상태)
- **비밀번호**: bcrypt(12 rounds, `SECURITY_POLICY.auth.bcryptRounds`) 해시 저장 (`users.passwordHash`), 신규 계정 8자 최소 길이 서버 강제
- **세션 수명**: 12시간 (`maxAge`), 쿠키는 `next-auth.session-token`
- **로그인 가드**:
  - 미로그인 API → 401 (`middleware.ts`가 `/api` 요청에 토큰 검증)
  - 미로그인 페이지 → `/login?callbackUrl=…` 리다이렉트
  - 로그인 사용자가 `/login` 재방문 → `/dashboard`
- **무차별 공격 방어**: 계정당 15분 창에 실패 8회 시 잠금 (DB 기반 `login_attempts` — 다중 인스턴스 대응, 중앙 정책)
- **타이밍 공격 완화**: 존재 여부와 무관하게 150~300ms 지연(`sleep`)

## 2. 인가 상세 (v0.2.2)

| 화면 | 허용 역할 | 비고 |
|---|---|---|
| `/driver**` | DRIVER (+SA/ADMIN 미리보기) | GUIDE 교차 접근 차단. layout 2차 리다이렉트 |
| `/guide**` | GUIDE (+SA/ADMIN 미리보기) | DRIVER 교차 접근 차단 |
| `/dashboard/users` | SA, ADMIN | 메뉴 권한 탭 내 변경은 SA만 |
| 기사 하단 메뉴 | 운행/알림/음성안내 (`DRIVER_APP_MENU`) | `src/lib/app-menus.ts` |
| 가이드 하단 메뉴 | 투어/알림/안내설정 (`GUIDE_APP_MENU`) | 기사 메뉴와 분리 정의 |

- 역할: SUPER_ADMIN / ADMIN / SALES / OPERATOR / DRIVER / GUIDE
- `hasRole(role, allowed)`:
  - SUPER_ADMIN은 무조건 허용
  - 그 외는 `allowed` 배열에 포함된 경우만 통과
- 적용 지점 4중:
  1. `middleware.ts` → 모듈(페이지) 접근 차단. 기사/가이드 앱은 교차 접근 금지(`/driver`↔`/guide` 분리, 미리보기는 SA/ADMIN만)
  2. 각 API 라우트 → 역할 체크 (예: 배차 추천은 SUPER_ADMIN/ADMIN/OPERATOR/SALES)
  3. 리소스 CRUD → `ResourceDef.roles` + 메뉴 오버라이드(`canAccessWithOverrides`, 거부 시 403)
  4. 관리자 메뉴 렌더 → `menuForRoleWithOverrides` (사이드바), 기사/가이드 하단 메뉴 → `appMenuForRole` (역할별 분리)
- **메뉴 권한 매트릭스** (v0.2.2): 최고관리자 전용 `PUT /api/rbac`로 역할별 메뉴 차단(`rbac.overrides` JSON, false만 저장).
  ADMIN은 조회만 가능(권한 상승 차단). SUPER_ADMIN은 항상 전체 허용. 차단은 사이드바+API 동시 적용
- **주의**: SUPER_ADMIN 우회는 `hasRole`만 신뢰하므로 역할 값은 서버(JWT 토큰)에서만 참조, 클라이언트 제출값은 사용하지 않습니다.

## 3. 기능 토글 보안

- 기능 상태는 `GET /api/features`로 공개하되 **민감값(API 키, 게이트웨이 URL) 제외**
- 각 기능 API는 자체적으로 `featureEnabled` 확인 후 OFF면 409 (UI 숨김에 의존하지 않음 = 서버 강제)

## 4. 데이터 보호

- **소프트 삭제**: 모든 마스터 모델 `deletedAt` 사용 — 조회 시 `where: deletedAt: null` 강제. 차량/기사/가이드는 진행중 배차 참조 시 삭제 409 차단
- **감사 로그**: CREATE/UPDATE/DELETE/EXPORT 시 `audit_logs`에 사용자·액션·old/new JSON(민감값 `[REDACTED]` 마스킹)·IP·UA 기록 + sha256 해시 체인(`prevHash/entryHash`), 무결성 검증 `GET /api/audit-logs/verify`(SA/ADMIN, 최대 5000건)
- **입력 검증**: 필수값(validateRequired, 생성 시 createOnly 포함), 타입 파싱(parseValue), 전화/이메일 형식 검증, JSON 필드는 파싱 실패 시 null 처리. 비밀번호 8자 최소
- **에러 메시지**: Prisma P2002/P2003/P2025를 한글 사용자 메시지로 변환(내부 스택 노출 금지)

## 5. 엑셀/파일 보안

- **수식 주입 방지**: `textCell()` — 셀 값이 `=`, `+`, `-`, `@`로 시작하면 `'` 접두 추가
- **파일명 안전 처리**: `safeFileName()` — 허용 문자 외 `_` 치환, 80자 제한. 규격서 업로드는 `..`/NUL 차단 + `basename` 고정
- **응답 헤더**: `Content-Type: application/vnd…spreadsheetml.sheet`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`
- 업로드(로고/규격서): 허용 확장자 및 상한(로고 5MB·규격서/원본 20MB·일괄등록 10MB/2000행, `SECURITY_POLICY.upload`), 저장 경로 제한. 로고는 sharp 리사이즈+메타 검증

## 6. 네트워크/환경

- `NEXTAUTH_SECRET`·`NEXTAUTH_URL`·`VAPID_*`는 `.env` 관리 (`.gitignore`의 `.env*`로 git 제외됨)
- SMS/이메일/더존 API 키는 설정 DB(AppSetting)에 저장되지만 `/api/features`엔 노출하지 않음 → **게이트웨이 URL/API키 조회는 관리자 전용 `/api/settings`로 제한**
- 배포 시 Caddyfile로 HTTPS 강제(리버스 프록시), 신뢰할 수 없는 호스트는 `allowedDevHosts` 설정
- 실서버 배포 전: `NEXTAUTH_SECRET`을 운영용 랜덤값으로 교체, 시드 비밀번호 `SEED_PASSWORD`로 주입 후 기본 `admin1234` 계정 비밀번호 변경

## 7. 알림/푸시

- 웹 푸시: VAPID 키쌍(gen-vapid 스크립트), 구독 정보를 `push_subscriptions`에 저장, 발송 시 사용자 소유 확인
- SMS: fire-and-forget fetch(실패해도 큐에 남김), 전화번호는 대상 프로필 기반(사용자 입력 무시)

## 8. 점검 체크리스트 (배포 전)

- [ ] `NEXTAUTH_SECRET` 교체
- [ ] Caddy/프록시 TLS 적용
- [x] 로그인 실패 잠금 DB 기반으로 교체 완료 (`login_attempts`, 중앙 정책)
- [x] 감사 로그 무결성 해시 체인 + 검증 API + 민감값 마스킹 구현
- [x] 엑셀 업로드 상한 적용 (일괄 10MB/2000행, 원본 20MB, 첫 시트만)
- [x] `next.config.ts` strict 전환 (`ignoreBuildErrors:false`, `reactStrictMode:true`)
- [ ] 백업: `npm run backup` 일일 스케줄 등록 (30일 로테이션 포함)
- [ ] 백업: `db/custom.db` 주기적 스냅샷