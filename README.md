# kbtour

경북 여행·버스 운송사 ERP. 전세버스 배차, 기사/가이드 운행일지, 차량 관리, 엑셀 일괄 등록, 정산 자동화를 지원합니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router) + React 19 + TypeScript
- **DB/ORM**: Prisma 6 + SQLite (`db/custom.db`)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **앱 패키징**: Tauri 2 (데스크톱/Android) — `doc/backend/tauri.md` 참고

## 시작하기

```bash
npm install
npm run db:push      # 스키마 반영
npm run db:seed      # 시드 데이터 (admin@example.com / admin1234)
npm run dev          # http://localhost:3000 (개발) / 운영: http://rustkorea.cloud:3400
```

## 주요 기능

- 반자동 배차: 추천 엔진 기반 기사·차량 매칭 (기능 토글: `semiAutoDispatch`)
- 운행일지: 기사 앱에서 운행 시작/종료 기록 (`runLog`)
- 자동 정산 초안: 운행 종료 시 정산 자동 생성 (`autoSettlement`)
- 차량 관리: 보험·검사 만료 알림 (`vehicleExpiry`)
- 엑셀 일괄 등록: 내보내기 파일 재업로드 (`excelImport`)
- SMS 자동 발송 / 대시보드 운영 알림 (`smsNotify`, `dashboardAlert`)

모든 기능은 설정 > 기능에서 켜고 끌 수 있습니다.

## 문서

- `doc/backend/`: prd, tdd, uiux, security, interface, api, program, architect, notice, risk, harness, database, agent, guide, install, tauri
- `README.md` 과거 Laravel 문서는 실제 구현과 다르며, 위 문서들이 현재 기준입니다.

## 라이선스

저작권 보유. 무단 사용/배포 금지.