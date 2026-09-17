# Install — 설치 및 배포 가이드

> 버전: v0.2.0 · 갱신일: 2026-09-17
> 대상: Windows 서버(또는 로컬)에서 프로덕션 운영. Next.js standalone + Caddy 리버스 프록시 구조.

## 1. 요구 사양

| 항목 | 최소 | 권장 |
|---|---|---|
| OS | Windows 10/Server 2019+, Linux | Windows Server 2022 / Ubuntu 22.04 |
| Node.js | 20+ | 22 LTS |
| 패키지 관리자 | npm | npm (또는 bun) |
| 디스크 | 1GB | 5GB+ (배차·업로드·로그) |
| DB | SQLite(내장) | SQLite(파일) / 필요 시 Postgres |

## 2. 로컬 개발 설치

```bash
# 1) 의존성
npm install

# 2) 환경변수 (.env)
#   DATABASE_URL=file:../db/custom.db
#   NEXTAUTH_SECRET=<랜덤 32자 이상>
#   NEXTAUTH_URL=http://localhost:3000
#   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (웹푸시용, npm run vapid)

# 3) DB + 시드
npm run db:push
npm run db:seed

# 4) 개발 서버
npm run dev          # http://localhost:3000
# 로그인: admin@example.com / admin1234
```

## 3. 프로덕션 빌드·배포 (Windows)

```bash
# 1) 정적 검사
npm run lint
npx tsc --noEmit

# 2) 빌드 (standalone 산출물 .next/standalone)
npm run build

# 3) DB 반영 (스키마 변경 시만, 서버 중지 후)
npx prisma db push
npx prisma generate

# 4) 기동 (standalone 서버)
node scripts/start.mjs        # 기본 포트 3000, 프로덕션 NODE_ENV 자동

# 5) 확인
Invoke-WebRequest http://localhost:3000/login -UseBasicParsing  # 200
```

> `.next/standalone`만 복사해 가는 배포(파일 루트 아래 static만 별도 카피)도 가능합니다.
> 자세한 파일 구성: `output: "standalone"`가 `next start`와 달리 실행 이미지를 만들며 `scripts/start.mjs`가 이를 기동합니다.

### Windows 자동 시작 (서비스)
1. `nssm install GBERP "C:\Program Files\nodejs\node.exe" "D:\develop\gberp\scripts\start.mjs"` (예)
2. 작업 디렉터리: `D:\develop\gberp`
3. 시작 유형: 자동

## 4. 리버스 프록시 (Caddy, TLS)

프로젝트 루트 `Caddyfile` 예시를 참고:

```
yourdomain.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options nosniff
    }
}
```

- 도메인 없이(IP) 운영 시: `https://<server-ip>` 또는 HTTP로 배포
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

## 7. 백업 설정

```powershell
# 일일 백업 (예약: Windows 작업 스케줄러)
Copy-Item D:\develop\gberp\db\custom.db "D:\backup\custom-$(Get-Date -Format yyyyMMdd).db" -Force
```

- 보관 30일 로테이션 권장, 업로드 폴더(로고·규격서)도 포함

## 8. 업그레이드 절차

```bash
git pull
npm install
npx prisma db push --force-reset?      # 스키마 변경 시에만, 데이터 주의
npm run build
node scripts/start.mjs                  # 재시작
npm run lint && npx tsc --noEmit        # 회귀 검사
```

## 9. 환경변수 요약

| 변수 | 필수 | 설명 |
|---|---|---|
| DATABASE_URL | Y | `file:../db/custom.db` |
| NEXTAUTH_SECRET | Y | JWT 서명용(운영용 랜덤값) |
| NEXTAUTH_URL | Y | 배포 도메인 또는 localhost:3000 |
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