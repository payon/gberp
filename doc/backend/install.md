# Install — 설치 및 배포 가이드

> 버전: v0.3.0 · 갱신일: 2026-09-28
> 대상: 운영 서버에서 Docker Compose(PostgreSQL + Next.js standalone)로 운영. 운영 URL: `http://rustkorea.cloud:3400`.

## 0. Docker Compose 빠른 시작 (권장)

```bash
# 1) 환경변수 (.env, .env.example 참조)
#   NEXTAUTH_SECRET=<openssl rand -base64 32>
#   POSTGRES_PASSWORD=<강력한 비밀번호>
#   SEED_PASSWORD=<초기 관리자 비밀번호>
#   NEXTAUTH_URL=http://rustkorea.cloud:3400

# 2) 기동 (db 생성 → 스키마 반영 → 시드 → 앱)
docker compose up -d --build

# 3) 확인
curl http://localhost:3400/api/health          # {"ok":true,"db":"up"}
# 로그인: http://rustkorea.cloud:3400/login
```

- 첫 기동 시 `db push` + `SEED_ON_BOOT=true`면 시드가 자동 적재됩니다 (사용자가 있으면 스킵).
- 재기동: `docker compose up -d`, 로그: `docker compose logs -f app`, 중지: `docker compose down` (DB 볼륨 유지), 완전 초기화: `docker compose down -v`.

## 1. 요구 사양

| 항목 | 최소 | 권장 |
|---|---|---|
| OS | Linux (Docker 지원) | Ubuntu 22.04 |
| Docker | 24+ (compose v2 포함) | 최신 |
| 디스크 | 2GB | 10GB+ (이미지·DB·업로드) |
| DB | PostgreSQL 16 (compose `db` 서비스, 볼륨 `pgdata`) | 동일 + 정기 `pg_dump` |

## 1. 요구 사양

| 항목 | 최소 | 권장 |
|---|---|---|
| OS | Windows 10/Server 2019+, Linux | Windows Server 2022 / Ubuntu 22.04 |
| Node.js | 20+ | 22 LTS |
| 패키지 관리자 | npm | npm (또는 bun) |
| 디스크 | 1GB | 5GB+ (배차·업로드·로그) |
| DB | SQLite(내장) | SQLite(파일) / 필요 시 Postgres |

## 2. 로컬 개발 설치 (PostgreSQL)

```bash
# 1) 의존성
npm install   # 또는 bun install

# 2) DB 기동 (도커의 db 서비스만)
docker compose up -d db

# 3) 환경변수 (.env)
#   DATABASE_URL=postgresql://gberp:<비밀번호>@localhost:5432/gberp
#   NEXTAUTH_SECRET=<랜덤 32자 이상>
#   NEXTAUTH_URL=http://localhost:3000
#   SEED_PASSWORD=<시드용 초기 비밀번호>
#   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (웹푸시용, npm run vapid)

# 4) DB + 시드
npm run db:push
npm run db:seed

# 5) 개발 서버
npm run dev          # http://localhost:3000 (개발) / 운영: http://rustkorea.cloud:3400
```

## 3. 프로덕션 빌드·배포 (Docker)

```bash
# 1) 정적 검사
npm run lint
./node_modules/.bin/tsc --noEmit

# 2) 빌드·기동 (standalone 이미지)
docker compose up -d --build

# 3) DB 반영: 컨테이너 기동 시 entrypoint가 자동 수행
#    - `prisma db push` (스키마 동기화)
#    - `SEED_ON_BOOT=true`면 시드 (기존 데이터 있으면 스킵)

# 4) 확인
curl http://rustkorea.cloud:3400/api/health   # {"ok":true,"db":"up"}
Invoke-WebRequest http://rustkorea.cloud:3400/login -UseBasicParsing  # 200
```

> 구 방식(Windows 직접 기동/nssm)은 폐기. `scripts/start.mjs`는 컨테이너 entrypoint가 호출합니다.

## 4. 리버스 프록시 (Caddy, TLS — 선택)

프로젝트 루트 `Caddyfile` 예시를 참고 (`rustkorea.cloud` → 3400):

```
rustkorea.cloud {
    reverse_proxy 127.0.0.1:3400
    ...
}
```

- 기본 배포는 compose의 3400 직접 노출(`http://rustkorea.cloud:3400`)이며, 80/443 전면을 붙일 때만 Caddy를 사용합니다.
- **권장**: HTTPS 적용(전세버스 운행 데이터·개인정보 보호)

## 5. 데스크톱(Tauri) 패키징

```bash
npm run tauri dev      # 개발
npm run tauri build    # 전용 Windows 인스톨러(.msi/.exe) 생성
```

- `src-tauri/`가 standalone 서버를 로컬에서 띄우고 웹뷰로 표시
- 오프라인/PWA와 병행 가능

## 6. PWA/오프라인

- `/manifest.webmanifest`, `/sw.js`, `/offline` 경로 등록(공개 경로)
- 브라우저에서 "앱 설치" 가능, 푸시 수신 시 `.well-known`/vapid 설정 필요

## 7. 백업 설정 (PostgreSQL)

```bash
# 권장: pg_dump 일일 백업
docker compose exec db pg_dump -U gberp gberp | gzip > backup/gberp-$(date +%Y%m%d).sql.gz

# 업로드 폴더 별도 백업
tar czf backup/uploads-$(date +%Y%m%d).tgz public/uploads
```

- 보관 30일 로테이션 권장. 구 SQLite 파일 백업(`db/custom.db` 복사) 방식은 폐기.

## 8. 업그레이드 절차

```bash
git pull
docker compose up -d --build     # 이미지 재빌드 + entrypoint가 db push 자동 수행
npm run lint && ./node_modules/.bin/tsc --noEmit        # 회귀 검사
```

## 9. 환경변수 요약

| 변수 | 필수 | 설명 |
|---|---|---|
| DATABASE_URL | Y | `postgresql://gberp:<비번>@db:5432/gberp` (운영) / `@localhost:5432` (개발) |
| NEXTAUTH_SECRET | Y | JWT 서명용(운영용 랜덤값, `openssl rand -base64 32`) |
| NEXTAUTH_URL | Y | http://rustkorea.cloud:3400 (운영) 또는 http://localhost:3000 (개발) |
| POSTGRES_USER/PASSWORD/DB | Y | compose `db` 서비스 계정 (기본 gberp) |
| SEED_ON_BOOT | N | `true`면 첫 기동 시 시드 자동 적재 |
| SEED_PASSWORD / SEED_BCRYPT_ROUNDS | N | 시드 초기 비밀번호/라운드(기본 admin1234/12, 운영 주입 권장) |
| VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT | 푸시 시 | `npm run vapid` 생성 |

## 10. 설치 후 검증 (체크리스트)

- [ ] 로그인(각 역할 계정) 동작
- [ ] `/api/features` 응답(기본 semiAutoDispatch=true)
- [ ] 설정 > 기능 토글 저장 후 즉시 반영
- [ ] 배차 생성 경고(휴일/휴게) 표시
- [ ] 엑셀 내보내기→일괄 등록 왕복
- [ ] 기사앱 운행 시작/종료, (ON 시) 운행일지·정산 자동 생성
- [ ] 대시보드 운영 알림 표시
- [ ] HTTPS 접속, 백업 정상화