# Interface — 외부 연동 인터페이스 설계서

> 버전: v0.2.0 · 갱신일: 2026-09-17

## 1. 연동 개요

| 연동 | 상태 | 핵심 파일 |
|---|---|---|
| SMS 게이트웨이 | 구현(기본 OFF) | `src/lib/notify.ts`, `settings sms.*` |
| 웹 푸시(Web Push) | 구현 | `src/lib/push.ts`, `src/lib/push-client.ts`, `src/app/api/push/*` |
| TTS(음성 안내) | 구현 | `src/lib/tts.ts`, `src/lib/speech.ts` |
| 엑셀 파일 | 구현 | `xlsx`, `src/lib/xlsx.ts`, `/api/import`, `/api/exports` |
| 더존(회계 연동) | 준비(구조만) | `AccountingEntry.dzExportReady/Status`, `AccountingSlip.dzSlipNumber` |
| 규격서 업로드 | 구현 | `/api/upload/spec`, `/api/upload/logo` |

## 2. SMS 게이트웨이 연동

- **설정 키**: `sms.gatewayUrl`, `sms.apiKey` (설정 > 기능 탭에서 관리, whitelist 저장)
- **동작 흐름**:
  1. 배차 생성(`handleCreate`, model=`dispatch`) → `notifyDispatchCreated(created)` 호출
  2. `smsNotify` OFF면 즉시 반환(불필요한 비용 발생 안 함)
  3. 기사/가이드 폰번호 수집 → `notification_queue`에 `channel=SMS, status=PENDING` 기록
  4. `gatewayUrl`이 있으면 **fire-and-forget fetch**:
     ```
     gatewayUrl = gatewayUrl
       .replace("{phone}", encodeURIComponent(phone))
       .replace("{message}", encodeURIComponent(message))
       .replace("{apiKey}", encodeURIComponent(apiKey))
     ```
- **실패 처리**: 네트워크 오류 무시(큐에 PENDING 남음 → 운영 콘솔에서 재시도 대상 확인)
- **기본 메시지**: `[배차 안내] M/D HH:mm 출발 배차가 배정되었습니다. 차량/노선은 앱에서 확인해주세요.`

## 3. 웹 푸시

- VAPID 키 생성: `npm run vapid` → `scripts/gen-vapid.mjs`
- 구독 등록: PushSubscription(endpoint/p256dh/auth)을 `push_subscriptions`에 저장
- 발송: 서버에서 `web-push.sendNotification()`, 실패 시 삭제 처리
- 클라이언트: Service Worker(`/api/push` 관련), 기사앱에서 새 배차 수신 시 `showNotification`

## 4. TTS (브라우저 SpeechSynthesis)

- `src/lib/speech.ts`: 배차 정보를 자연어 문장으로 생성(`buildDriverSpeech`)
- `src/lib/tts.ts`: `primeVoices()`(음성 로드 보장) → `speakQueued(texts, {rate})` 큐 재생, `stopSpeaking()`
- 기본 속도: `voice.defaultRate`(0.5~1.5 clamp, 기본 0.95), 기사앱 개별 오버라이드(localStorage)

## 5. 엑셀 내보내기/일괄 등록

- **내보내기** `GET /api/exports/[resource]`:
  - 헤더 = `ResourceDef.listColumns[].label` (한글)
  - 본문 = serialize된 각 행(`textCell` 안전 처리)
  - 감사 로그(EXPORT) 기록, 파일명 `{resource}-{YYYY-MM-DD}.xlsx`
- **일괄 등록** `POST /api/import/[resource]`:
  - multipart `file` 필드 (.xlsx/.xls), 첫 시트 사용
  - `sheet_to_json(ws, {defval:"", raw:true})` → 첫 행의 객체 키를 헤더로 매핑
    - `f.label === h || f.key === h || h.endsWith("(" + f.key + ")")`
  - 행별: buildData → validateRequired → transformInput → beforeCreate → create → audit → (dispatch면) SMS
  - 실패 행사 `{row, error}` 수집, 전부 실패면 400 + 상세
- **템플릿 = 내보내기 파일을 그대로 사용** (기능 탭 안내 문구)

## 6. 더존(Douzone) 연동 준비

- 현재는 **데이터 모델 준비 상태**:
  - `AccountingEntry.dzExportReady/dzExportedAt/dzExportStatus`
  - `AccountingSlip.dzSlipNumber/dzExportedAt`
  - 계정코드·부계정코드 필드 보유
- 향후 작업: 더존 CSV/API 포맷 매퍼, 전송 잡(Job), 전송결과 수신 웹훅
- 분개번호 규칙: `AE-YYYYMMDD-NNN` (beforeCreate 자동)

## 7. Slack/Email 등 확장 방향

- NotificationQueue(`channel=EMAIL` enum 존재)에 적재하면 이메일 발송 어댑터만 추가하면 확장 가능
- 알림 큐를 공통 채널로, 각 채널 어댑터를 plug-in 형태로 설계

## 8. 기타 파일 업로드

| 엔드포인트 | 용도 | 제약 |
|---|---|---|
| `POST /api/upload/logo` | 사이트 로고 | image/*, 리사이즈 |
| `DELETE /api/upload/logo` | 로고 삭제 | |
| `POST /api/upload/spec` | 샘플 규격서 | pdf/xls/xlsx/doc/docx/hwp/hwpx/png/jpg, ≤20MB |
| `DELETE /api/upload/spec` | 규격서 삭제 | |