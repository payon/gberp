# Security — 보안 설계서

> 버전: v0.2.0 · 갱신일: 2026-09-17

## 1. 인증 (Authentication)

- **방식**: NextAuth v4 Credentials + JWT (서버 세션 없음, 무상태)
- **비밀번호**: bcrypt(10 rounds) 해시 저장 (`users.passwordHash`)
- **세션 수명**: 12시간 (`maxAge`), 쿠키는 `next-auth.session-token`
- **로그인 가드**:
  - 미로그인 API → 401 (`middleware.ts`가 `/api` 요청에 토큰 검증)
  - 미로그인 페이지 → `/login?callbackUrl=…` 리다이렉트
  - 로그인 사용자가 `/login` 재방문 → `/dashboard`
- **무차별 공격 방어**: 계정당 15분 창에 실패 8회 시 `isLocked` (인메모리 Map, 단일 인스턴스 가정)
- **타이밍 공격 완화**: 존재 여부와 무관하게 150~300ms 지연(`sleep`)

## 2. 인가 (Authorization, RBAC)

- 역할: SUPER_ADMIN / ADMIN / SALES / OPERATOR / DRIVER / GUIDE
- `hasRole(role, allowed)`:
  - SUPER_ADMIN은 무조건 허용
  - 그 외는 `allowed` 배열에 포함된 경우만 통과
- 적용 지점 3중:
  1. `middleware.ts` → 모듈(페이지) 접근 차단
  2. 각 API 라우트 → 역할 체크 (예: 배차 추천은 SUPER_ADMIN/ADMIN/OPERATOR/SALES)
  3. 리소스 CRUD → `ResourceDef.roles` (예: clients는 SA/ADMIN/SALES)
- **주의**: SUPER_ADMIN 우회는 `hasRole`만 신뢰하므로 역할 값은 서버(JWT 토큰)에서만 참조, 클라이언트 제출값은 사용하지 않습니다.

## 3. 기능 토글 보안

- 기능 상태는 `GET /api/features`로 공개하되 **민감값(API 키, 게이트웨이 URL) 제외**
- 각 기능 API는 자체적으로 `featureEnabled` 확인 후 OFF면 409 (UI 숨김에 의존하지 않음 = 서버 강제)

## 4. 데이터 보호

- **소프트 삭제**: 모든 마스터 모델 `deletedAt` 사용 — 조회 시 `where: deletedAt: null` 강제
- **감사 로그**: CREATE/UPDATE/DELETE/EXPORT 시 `audit_logs`에 사용자·액션·old/new JSON·IP·UA 기록
- **입력 검증**: 필수값(validateRequired), 타입 파싱(parseValue), JSON 필드는 파싱 실패 시 null 처리
- **에러 메시지**: Prisma P2002/P2003/P2025를 한글 사용자 메시지로 변환(내부 스택 노출 금지)

## 5. 엑셀/파일 보안

- **수식 주입 방지**: `textCell()` — 셀 값이 `=`, `+`, `-`, `@`로 시작하면 `'` 접두 추가
- **파일명 안전 처리**: `safeFileName()` — 허용 문자 외 `_` 치환, 80자 제한
- **응답 헤더**: `Content-Type: application/vnd…spreadsheetml.sheet`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`
- 업로드(로고/규격서): 허용 확장자 및 최대 20MB, 저장 경로 제한

## 6. 네트워크/환경

- `NEXTAUTH_SECRET`·`NEXTAUTH_URL`·`VAPID_*`는 `.env` 관리 (`.gitignore`에 포함 여부 확인)
- SMS API 키는 설정 DB(AppSetting)에 저장되지만 `/api/features`엔 노출하지 않음 → **게이트웨이 URL/API키 조회는 관리자 전용 `/api/settings`로 제한**
- 배포 시 Caddyfile로 HTTPS 강제(리버스 프록시), 신뢰할 수 없는 호스트는 `allowedDevHosts` 설정
- 실서버 배포 전: `NEXTAUTH_SECRET`을 운영용 랜덤값으로 교체

## 7. 알림/푸시

- 웹 푸시: VAPID 키쌍(gen-vapid 스크립트), 구독 정보를 `push_subscriptions`에 저장, 발송 시 사용자 소유 확인
- SMS: fire-and-forget fetch(실패해도 큐에 남김), 전화번호는 대상 프로필 기반(사용자 입력 무시)

## 8. 점검 체크리스트 (배포 전)

- [ ] `NEXTAUTH_SECRET` 교체
- [ ] Caddy/프록시 TLS 적용
- [ ] 로그인 실패 잠금이 단일 인스턴스 전제 — 다중 인스턴스 시 Redis 등 공유 저장소로 교체 검토
- [ ] 감사 로그 무결성(읽기 전용 DB/append-only) 검토
- [ ] 엑셀 업로드 시트 수/행 수 상한 확인(파일 크기 제한)
- [ ] 백업: `db/custom.db` 주기적 스냅샷