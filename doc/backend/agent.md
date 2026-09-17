# Agent — AI 에이전트용 개발 가이드 (Agent Notes)

> 버전: v0.2.0 · 갱신일: 2026-09-17
> 이 프로젝트를 편집하는 AI 에이전트/어시스턴트가 반드시 지켜야 할 컨벤션과 함정 목록입니다. `agent.md`는 동료 개발자에게도 유용합니다.

## 1. 필수 명령

```bash
npm run lint          # ESLint (올리기 전 반드시)
npx tsc --noEmit      # 타입 검사 (빌드가 ignore를 켜므로 별도 강제)
npm run dev           # 개발 서버 (포트 3000)
npm run build         # 배포(standalone) — node scripts/start.mjs로 기동
npm run db:push       # 스키마 반영
npm run db:seed       # 시드 (기존 데이터 있으면 스킵)
npm run vapid         # VAPID 키 생성
```

## 2. 편집 원칙

1. **기능 추가는 리소스/피처 라우트 패턴을 따른다**:
   - 새 CRUD 리소스 → `src/lib/resources.ts`에 `ResourceDef` 추가(모델·필드·목록·권한·serialize). 별도 API를 만들지 않는다.
   - 새 토글 기능 → `src/lib/features.ts`(FeatureKey + FEATURE_DEFS) + `src/lib/settings.ts`(DEFAULT_SETTINGS 기본값) + 라우트에서 `featureEnabled` 검증(409).
2. **비즈니스 로직은 `lib/*`에**, 라우트는 얇게(`handleCreate(req, resource)` 호출 등).
3. **라벨/에러 문구는 한글**, 코드 식별자는 영문. UI에서 enum은 라벨 맵(`*_LABELS`) 사용.
4. 클라이언트 Select는 **네이티브**만(`@radix-ui/react-select` 금지). `optionsRoute`는 `/api/{r}?all=1`.
5. 배지 변형: 성공/정보/경고/위험/보조 → success/info/warning/destructive/secondary 전용.
6. 다이얼로그 대신 확인이 필요하면 `window.confirm` 사용.
7. 라우트 항의 `params`는 `Promise` — `const { id } = await ctx.params`.
8. JSON 컬럼은 문자열 저장/`JSON.parse` 안전 처리(실패 시 null/[]).
9. **주석 최소화**: 불필요한 설명 주석 금지, 필요한 않을 정도로만. (프로젝트 코드는 한국어 주석 소수)

## 3. 알려진 함정 (과거 실패 저장소)

| # | 함정 | 해결 |
|---|---|---|
| 1 | `prisma generate` EPERM (DLL 잠김) | 3000 포트 node 프로세스 종료 후 generate |
| 2 | 취약한 쿠키 파싱 정규식 | `split(/,(?=\s*[^;]+=[^;]+;)/)` 후 `;` 기준 두 번째 분리 |
| 3 | `Settlement.driverId/guideId` @unique | 자동 정산은 두 필드 미설정(대신 details/targetId) |
| 4 | `sheet_to_json` 결과가 객체 배열 | `Object.keys(sheet[0])`로 헤더 매핑 (예: import route) |
| 5 | 추천 테스트 일정 부족 | 배차 없는 일정을 사전 생성(시드 2건 모두 배차됨) |
| 6 | PowerShell에서 `node -e`의 `$` 인터폴레이션 | temp `.mjs` 파일 작성 후 실행 |
| 7 | 번호 자동생성(P2002 충돌) | 카운트 기반 `S-YYYYMMDD-NNN`·`AE-…`·`C-…`, 동시성 낮은 단일 인스턴스 허용 |
| 8 | Settings whitelist | `DEFAULT_SETTINGS` 키 외 무시 — 새 설정 키 추가 시 **여기**에도 추가 필수 |
| 9 | 기능 OFF 유효성은 서버에서 | 클라이언트 숨김에 의존 금지, 항상 409 |

## 4. 코드 흐름 참조 (읽기 순서)

```
1. src/lib/settings.ts      — 설정의 근원(키 목록)
2. src/lib/features.ts      — 기능 키·토글
3. src/lib/resources.ts     — 모든 리소스 정의(백본)
4. src/lib/crud.ts          — 범용 CRUD·검증·에러 변환
5. src/lib/recommend.ts     — 배차 추천 알고리즘
6. src/app/api/*            — 각 기능 라우트 (얇음)
7. src/middleware.ts        — 인증/RBAC 게이트
```

## 5. 데이터 규칙 체크리스트

- 소프트 삭제: `deletedAt` + 쿼리에 `deletedAt: null` 항상
- 배차 생성/수정 시 시간 충돌 검사(같은 기사, CANCELLED/FAILED 제외)
- 자동 정산 중복 방지: `details.contains(dispatchId)`
- createOnly 필드(비밀번호 등)는 수정 시 무시
- 감사 로그: CREATE/UPDATE/DELETE/EXPORT 모두 기록

## 6. 문서 위치

```
doc/backend/
├─ prd.md · tdd.md · uiux.md · security.md · interface.md · api.md
├─ program.md · architect.md · notice.md · risk.md · harness.md
├─ database.md · agent.md · guide.md · install.md
```

- 새 기능 작성 시 관련 문서를 함께 갱신(특히 api.md, database.md, risk.md).