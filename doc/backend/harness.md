# Harness — 운영 체크리스트 & 모니터링

> 버전: v0.2.1 · 갱신일: 2026-09-28
> 서버에 운영 배포 후 반복 수행할 운영 작업(런북)입니다.

## 1. 일일 점검 (~5분)

- [ ] 서버 동작: 대시보드 접속 / `/api/health`(있으면) 200 확인
- [ ] 오늘 배차가 정상 반영되는지 (대시보드·기사앱)
- [ ] 정산 대기 건수가 비정상 누적되지 않는지 (ops-alerts 정산 대기)
- [ ] SMS 발송 큐(PENDING 누적) 확인 — `notification_queue.status=PENDING` 건수
- [ ] 감사 로그에 비정상 액션(대량 DELETE/EXPORT) 없는지

## 2. 주간 점검

- [ ] 차량 보험·검사 만료 임박(30일) 목록 점검 → 갱신/정비
- [ ] 기사 면허 만료 임박 목록 점검
- [ ] 백업 확인: 최근 `pg_dump` 존재·복원 테스트 1회
- [ ] 디스크 여유(로고/규격서 업로드 폴더, `.next`)
- [ ] 로그(dev/프록시 액세스 로그)에서 4xx/5xx 이상 패턴

## 3. 월간 점검

- [ ] 정산 프로세스(총액 산정·승인·지급) 회고 — 자동 초안 정확도
- [ ] 계약/매출/배차 통계와 회계 분개 대사
- [ ] 더존 연동(활성화 시) 전송 결과 대사
- [ ] 접근 권한(RBAC) 재검토 — 퇴사자/부서 이동 반영
- [ ] 시크릿 순환(NEXTAUTH_SECRET, VAPID, SMS API 키) 검토

## 4. 백업 절차 (PostgreSQL)

```bash
# 일일 백업 (cron 권장)
docker compose exec -T db pg_dump -U gberp gberp | gzip > backup/gberp-$(date +%Y%m%d).sql.gz
tar czf backup/uploads-$(date +%Y%m%d).tgz public/uploads
# 보관: 30일 로테이션 (find backup -mtime +30 -delete)
```

- SQLite 파일 복사 방식은 폐기. DB 복원: `gunzip -c backup/xxx.sql.gz | docker compose exec -T db psql -U gberp gberp`.

## 5. 배포 절차 (서버, Docker)

```bash
# 1) 사전 확인
git status                       # 커밋 상태
npm run lint
./node_modules/.bin/tsc --noEmit

# 2) 빌드·기동
docker compose up -d --build     # entrypoint가 db push 자동 수행

# 3) 확인
curl http://rustkorea.cloud:3400/api/health
```

## 6. 모니터링 포인트 (SQL/실행 예시)

프로덕션 콘솔 또는 `node -e`(temp .mjs)로 조회:

```sql
-- 정산 대기
SELECT status, count(*) FROM settlements GROUP BY status;

-- SMS 미발송
SELECT count(*) FROM notification_queue WHERE channel='SMS' AND status='PENDING';

-- 오늘 배차 현황 (PostgreSQL)
SELECT status, count(*) FROM dispatches
WHERE scheduledStart::date = CURRENT_DATE AND "deletedAt" IS NULL GROUP BY status;

-- 감사 로그 최근
SELECT "userName", action, "tableName", "createdAt" FROM audit_logs ORDER BY "createdAt" DESC LIMIT 50;
```

## 7. 인시던트 대응 루틴 (SEV 정의)

| SEV | 정의 | 대응 |
|---|---|---|
| SEV-1 | 전체 서비스 장애(로그인 불가, DB 손상) | 즉시 재시작 + 백업 복원, 긴급 공지 |
| SEV-2 | 주요 기능 장애(배차/정산 오류) | 기능 토글로 우회(excelImport 등 OFF), 핫픽스 |
| SEV-3 | 부분 장애(담당 모듈) | 퇴근 후 수정, 다음 배포 반영 |
| SEV-4 | 경미(표시 오류, 지연) | 정기 배포에 포함 |

## 8. 기능 토글 응급 차단

- SMS 비용 폭주 → 설정 > 기능에서 `smsNotify` OFF (즉시 반영)
- 엑셀 등록 버그 → `excelImport` OFF
- 알림 노이즈 → `dashboardAlert` OFF
- 반자동 추천 오류 → `semiAutoDispatch` OFF (수동 배차로 전환)

> 모든 병렬은 `npm run dev` 이전에 문제가 없어야 하며, 핫픽스 후기 tsc/lint 재검증을 생활화합니다.