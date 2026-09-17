# Notice — 알림 시스템 설계서

> 버전: v0.2.0 · 갱신일: 2026-09-17

## 1. 개요

- 중앙 큐: **NotificationQueue** (`notification_queue` 테이블) — 모든 채널(PUSH/SMS/EMAIL/IN_APP)의 공통 적재 구조
- 채널 어댑터는 등록 방식으로 확장(현재 SMS·PUSH 구현, EMAIL은 미구현)

## 2. 데이터 모델

| 필드 | 타입 | 설명 |
|---|---|---|
| targetType | String | driver / guide / staff |
| targetId | String | User ID |
| targetPhone / targetEmail | String? | 대상 연락처 |
| channel | NotificationChannel | PUSH/SMS/EMAIL/IN_APP |
| title, message | String | 제목/본문 |
| data | String(JSON)? | 보조 데이터(dispatchId 등) |
| scheduledAt | DateTime? | 예약 발송 |
| sentAt | DateTime? | 실제 발송 시각 |
| status | PENDING/SENT/FAILED/CANCELLED | 처리 상태 |
| errorMessage, retryCount | String?, Int | 실패 원인/재시도 횟수 |

## 3. SMS 발송 프로세스

```
배차 생성 (POST /api/dispatches)
  └─ crud.handleCreate → def.model==="dispatch"
       └─ notifyDispatchCreated(created)
            ├─ smsNotify OFF → return
            ├─ 기사/가이드 프로필 → phone 수집
            ├─ NotificationQueue.create(channel=SMS, PENDING)
            └─ gatewayUrl 존재 시
                 GET {url}{phone}{message}{apiKey} (fire-and-forget)
```

### 플레이스홀더
| 토큰 | 대체값 |
|---|---|
| `{phone}` | encodeURIComponent(phone) |
| `{message}` | encodeURIComponent(기본 문구) |
| `{apiKey}` | encodeURIComponent(설정 API 키) |

### 중요 규칙
- 기능 OFF면 DB에도 기록하지 않음(비용·노이즈 방지)
- 게이트웨이 실패는 무시 → 큐 PENDING 유지(운영자가 웹훅/재시도 처리)
- 알림 기록 실패도 무시(배차 생성은 항상 성공 — 알림은 부가 기능)

## 4. 웹 푸시 프로세스

- 클라이언트: 서비스워커에서 VAPID 공개키 get, 구독 생성 → `POST /api/push/subscribe`
- 저장: `push_subscriptions` (endpoint unique, 사용자별 index)
- 발송: `POST /api/push/send` 등에서 `web-push.sendNotification(endpoint, payload)`
- 실패 사유(404/410 등) 시 구독 삭제
- 기사앱: 새 배차 수신 시 `showNotification("새 배차 안내", …)`

## 5. 음성 안내(TTS)

- 목적: 운전 중 핸즈프리 안내
- 동작:
  - `buildDriverSpeech`가 배차를 자연어 문장으로 생성(일정·출발·도착·정차·차량·가이드·특이조건)
  - 음성 프라임(pointerdown로 잠금 해제) → `speakQueued` 큐 재생(중복 발화 방지)
  - 자동 모드: 1분 폴링에서 새 CONFIRMED/IN_PROGRESS 배차를 발견하면 안내 + 푸시
- 설정: `voice.defaultRate`(기본 0.95), `voice.autoAnnounce`(기본 true)
- 개별 조정: 기사 기기 localStorage

## 6. 대시보드 운영 알림 (in-app)

`ops-alerts` — dashboardAlert ON일 때만:
| 항목 | severity | 조건 |
|---|---|---|
| 정산 대기 N건 | warn | settlement.status=PENDING |
| 차량 보험/검사 만료됨 | danger | 만료일 < now |
| 차량 보험/검사 30일 임박 | warn | 만료일 ≤ now+30d |
| 기사 면허 만료됨 | danger | licenseExpiry < now |
| 기사 면허 30일 임박 | warn | licenseExpiry ≤ now+30d |
| 오늘 배차 현황 | info | 항상(오늘 건수/운행중) |

## 7. 메시지 규격 예시

```
SMS   : [배차 안내] 9/25 07:30 출발 배차가 배정되었습니다. 차량/노선은 앱에서 확인해주세요.
PUSH  : title="새 배차 안내" body="{고객} · {상품} · {시각} 출발"
TTS   : "오늘 오전 7시 30분 경기도의회를 출발해 경기도 교육연수원에 도착하는 출퇴근 셔틀 배차입니다. 차량은 경기12가3456, 45인승 대형버스입니다…"
```

## 8. 향후 확장

- EMAIL 어댑터: 큐 적재 기반 그대로 SMTP 전송 모듈만 추가
- 재시도 워커: `status=FAILED/PENDING && retryCount<3` 스캔 → 재발송
- 예약 발송: `scheduledAt` 스케줄러(기존 필드 보유)
- 읽음 확인(IN_APP): 알림함 UI 연동