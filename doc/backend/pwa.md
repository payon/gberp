# PWA — 앱 아이콘 및 설치형 웹앱 관리

> 버전: v0.2.2 · 갱신일: 2026-09-28
> 관리자(설정 > 앱 아이콘)에서 원본 이미지 1장으로 데스크탑·모바일·태블릿 설치 아이콘을 자동 생성하고,
> 매니페스트·테마색·TWA 설정을 함께 관리하는 방법입니다.

## 1. 개요

| 항목 | 내용 |
|---|---|
| 관리 화면 | 설정 > 앱 아이콘 탭 (SA, ADMIN) |
| 업로드 API | `POST /api/upload/app-icon` (multipart `file`, image/*, ≤5MB, 512×512 이상 정사각형) |
| 생성 모듈 | `src/lib/app-icons.ts` `generateAppIcons` (sharp) |
| 매니페스트 | `src/app/manifest.ts` 동적 생성 (`/manifest.webmanifest`) |
| 메타/뷰포트 | `src/app/layout.tsx` `generateMetadata/generateViewport` (설정 반영) |

## 2. 생성 세트 (`public/icons/`)

| 파일 | 용도 |
|---|---|
| `app-72.png` … `app-512.png` (72/96/128/144/152/192/384/512) | 매니페스트 기본 아이콘 (기기별 자동 선택) |
| `app-maskable-512.png` | Android 적응형 아이콘 (안전영역 80% + 패딩) |
| `apple-touch-icon.png` (180) | iOS 홈화면 |
| `favicon-32.png` | 브라우저 탭 |
| `pwa.iconPath` = `/icons/app-512.png` | 대표 경로 (설정 저장, `pwa.iconUpdatedAt`과 함께) |

> 기존 `icon-192/512.png`, `icon-maskable-512.png`는 최초 업로드 전까지의 폴백으로 유지됩니다.

## 3. 설정 키 (`AppSetting`)

```
pwa.name / pwa.shortName       (매니페스트 name/short_name, 미설정 시 회사명 기반)
pwa.themeColor                 (기본 #0a0a0a — 매니페스트 theme_color + 뷰포트 + TWA)
pwa.backgroundColor            (기본 #ffffff — 스플래시 배경)
pwa.iconPath / pwa.iconUpdatedAt
```

## 4. TWA(Android) 연동

1. `twa/twa-manifest.json`의 `iconUrl`을 `https://도메인/icons/app-512.png`로 지정
2. `themeColor/navigationColor`에 `pwa.themeColor` 값을 복사
3. Play Console 서명 지문을 `fingerprints[]`에 등록
4. 서버 `/.well-known/assetlinks.json`에 동일 지문 게시 (TWA 주소창 제거 조건)
5. `maskable` 아이콘은 런처 적응형 아이콘으로 자동 사용

## 5. 검증 체크리스트

- [ ] 아이콘 업로드 후 사이즈 미리보기 8종 표시
- [ ] 기기별 프리뷰(모바일/태블릿/데스크탑)에 테마색·앱명 반영
- [ ] `/manifest.webmanifest`에 8+1 아이콘 + 설정 색상 포함
- [ ] 브라우저 "앱 설치" 프롬프트 노출 (`sw.js` + HTTPS + 192/512 아이콘 조건 충족)
- [ ] TWA 빌드 시 512 아이콘 해상도 확인
