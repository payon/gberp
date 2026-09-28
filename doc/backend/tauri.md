# Tauri — 데스크톱/Android 앱 패키징 가이드

> 버전: v0.2.1 · 갱신일: 2026-09-28
> 대상: TWA 대신 Tauri 기반으로 운영 앱(기사/가이드/관리자용)을 만들고, Android Studio로 빌드·배포하는 방법.

## 1. 현재 상태 진단 (2026-09-23 확인)

| 항목 | 상태 | 내용 |
|---|---|---|
| `src-tauri/` | ✅ 있음 | Tauri **v2** (`tauri = "2"`), `identifier: com.globe.travelerp` |
| `src-tauri/src/main.rs` | ✅ 있음 | 데스크톱/모바일 공통 진입점(`travelerp_lib::run()`) |
| `@tauri-apps/cli` | ✅ 있음 | `2.11.4` 설치됨 (`npm run tauri` 동작, 누락 아님) |
| `src-tauri/gen/android` | ✅ 있음 | `tauri android init` 완료, Gradle 프로젝트 생성됨 |
| Rust/Cargo | ✅ 있음 | Windows host + Android 4-ABI 타겟, 툴체인 D: 이전 완료 |
| Android SDK/NDK | ✅ 있음 | NDK 26 + arm64 `.so` 크로스컴파일 성공 |
| `tauri.conf.json` | ✅ 적용 | `beforeBuildCommand: "npm run build"`, `frontendDist: "../public"`(원격 URL 로드 전 임시값), `bundle.android.minSdkVersion: 24` |
| 데스크톱 원격 URL | ⚠️ 미적용 | 운영 배포 시 `app.windows[0].url=http://rustkorea.cloud:3400` 설정 필요(미설정 시 정적 public만 표시) |
| Windows 빌드 주의 | ⚠️ | `gen/android` 내 `BuildTask.kt`는 Windows node 경로 버그(#9536) 대응 패치 적용 상태 — `tauri android init` 재실행 시 패치 유실되므로 재적용 필요 |

구조 요지:
- `beforeDevCommand: "npm run dev"` · `devUrl: "http://localhost:3000"` → **개발 중엔 Next 서버를 webview가 그대로 로드**
- `frontendDist: "../out"` → 정적 산출물 폴더 (아직 없음)
- `app.windows`: 420×800(모바일 형태) 메인 윈도우, `csp: null`

## 2. 사전 요구사항 설치

### 2.1 Rust (이미 설치됨)
```bash
rustc --version        # v1.98.1 확인됨
```

### 2.2 Android 타겟 추가 (필수)
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```
> 웬만하면 `x86_64`(에뮬레이터) + `aarch64`(실기기)만 있어도 동작하지만, Play/APK 배포는 4개 모두 권장.

### 2.3 Android Studio (아직 없음 — 설치)
1. https://developer.android.com/studio → Windows 설치
2. 첫 실행 시 SDK Manager에서:
   - **Android SDK** (platform 34+, default로 설치됨)
   - **NDK and Side-by-Side** → NDK 26 이상
   - **Command-line Tools** (필수)
   - SDK Location을 기록 (기본: `%LOCALAPPDATA%\Android\Sdk`)
3. 환경변수:
```powershell
# 사용자 환경변수
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"   # AS 내장 JDK 17+
```
4. 확인: `java -version` (17 이상), `echo $env:ANDROID_HOME`

### 2.4 tauri CLI 설치 (이미 설치됨 — 확인만)
```bash
npm ls @tauri-apps/cli   # 2.x 확인
npm run tauri -- --version
```
설치 후: `npm run tauri -- --version` 확인. (`package.json`의 `"tauri": "tauri"` 스크립트가 동작하게 됩니다.)

## 3. 운영 모델 결정 (가장 중요)

이 ERP는 **Next.js 풀스택**(API 라우트 + Prisma + NextAuth)이라 **정적 export(`next export`)로는 동작하지 않습니다**.
→ 모바일에서 Node 서버를 돌릴 수 없으므로 두 가지 전략 중 선택:

| 전략 | 데스크톱 | Android/iOS | 설명 |
|---|---|---|---|
| A: **원격 서버 로드 (권장)** | 가능 | **가능** | webview가 배포 서버 HTTPS 주소를 로드(구버전 TWA와 동일 UX, Tauri 제어). 자체 API/백엔드 불필요 |
| B: 로컬 standalone 서버 | 가능 | 불가 | `node scripts/start.mjs`로 3000을 띄우고 webview가 localhost 로드. 데스크톱 오프라인용 |

**모바일 앱은 A로 갑니다.** 앱은 "서버의 웹앱을 화면에 띄우는 셸"이 되고, 로그인/배차/정산은 모두 서버가 처리합니다.

## 4. `tauri.conf.json` 수정안

```jsonc
{
  "productName": "종합여행사 ERP",
  "version": "0.1.0",
  "identifier": "com.globe.travelerp",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3000",          // 개발용(섹션 7 참고: Android에선 10.0.2.2 등으로 변경)
    "beforeBuildCommand": "npm run build",       // 필요 시 데스크톱 빌드 파이프라인
    "frontendDist": "../public"                  // schema 필수. 실제 로드는 window.url 기준
  },
  "app": {
    "windows": [{
      "title": "종합여행사 ERP",
      "url": "http://rustkorea.cloud:3400",  // ★ 배포용 실제 서버 URL (모바일/데스크톱 공통)
      "width": 420, "height": 800,
      "minWidth": 360, "minHeight": 640,
      "center": true, "resizable": true
    }],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "android": { "minSdkVersion": 24 }
  }
}
```

- `url`에 절대 URL을 주면 Tauri는 프로덕션에서 그 주소를 로드합니다. 개발 중에는 **`devUrl`이 우선**됩니다.
- `frontendDist`는 "폴더가 존재해야 한다"는 제약이 있어 임시로 `public`(이미 존재)을 가리키게 하거나, 가벼운 `static/`(로딩 안내 index.html)을 만들어 지정하세요. 원격 URL을 로드하므로 이 파일들이 실제 화면에 뜨진 않습니다.
- Android에서 `http://`(비보안) 서버를 로드하려면 **cleartext 허용**이 필요합니다. 운영은 **HTTPS 강제** 권장.

## 5. Android 프로젝트 생성

```bash
# 아이콘 생성 (Android/iOS/데스크톱 전 규격) — 원본 PNG(1024×1024) 필요
npm run tauri -- icon ./path/to/app-icon.png

# Android 프로젝트 뼈대 생성 → src-tauri/gen/android 생성됨
npm run tauri -- android init
```

- 생성 후 `src-tauri/gen/android/`에 Gradle 프로젝트가 생깁니다.
- `identifier`: 나중에 바꾸면 Android 패키지명(`com.globe.travelerp`)이 바뀌므로 **이 시점에 확정**하는 것을 권장합니다.
- AndroidManifest에 `INTERNET` 권한이 기본 포함됩니다(원격 서버 접근 필요). 원격 로드 방식을 쓰면 기본값 그대로 두면 됩니다.

## 6. Android Studio 연동

### 6.1 프로젝트 열기
1. Android Studio 실행 → **Open** → `src-tauri/gen/android/project` 선택
2. 첫 Gradle 동기화가 오래 걸립니다(의존성 다운로드). 완료될 때까지 대기
3. 필요 시 **SDK 버전 맞추기**: openSDK/platform/ NDK 버전이 안 맞으면 `File > Project Structure > SDK Location` 조정

### 6.2 기기 준비 (둘 중 택1)
- **에뮬레이터**: Device Manager → Create Device(예: Pixel 6, 이미지 API 34) → 부팅
- **실기기**: 개발자 옵션 → USB 디버깅 켜기 → USB 연결 → `adb devices` 확인

### 6.3 실행
- Android Studio Run ▶ (디버그) → 에뮬레이터/실기기에서 APK 설치·실행
- CLI로도 실행 가능:
```bash
npm run tauri -- android dev       # 개발(디버그 실행)
npm run tauri -- android build --apk    # 릴리스 APK
```

### 6.4 디버깅
```bash
adb logcat -s WebView,AndroidRuntime   # 크래시·webview 로그 필터
adb reverse tcp:3000 tcp:3000          # 실기기에서 PC dev 서버 접근 (localhost:3000 허용 시)
```

## 7. 개발 중 서버 주소 (Android)

개발은 PC의 Next dev 서버(`localhost:3000`)가 필요합니다.

| 대상 | webview에서 접근할 주소 | 방법 |
|---|---|---|
| 에뮬레이터 | `http://10.0.2.2:3000` | `devUrl`을 `http://10.0.2.2:3000` 으로 지정 |
| 실기기(USB) | `http://localhost:3000` | `adb reverse tcp:3000 tcp:3000` 후 `devUrl` 유지 |
| 실기기(LAN) | `http://192.168.x.x:3000` | Next를 `0.0.0.0`으로 실행 + 방화벽 허용 |

Next dev를 외부에서 접근:
```powershell
# 별도 터미널
npx next dev -H 0.0.0.0 -p 3000
```
> 열어두는 동안 `npm run dev`(tauri beforeDevCommand)와 충돌하지 않도록 한쪽만 사용.

## 8. 릴리스 빌드 & 서명 (Android)

### 8.1 사전: Android 디버그 vs 릴리스
- 디버그 APK: 기본 생성(디버그 keystore 서명) — 개발/사내 테스트용
- **릴리스 APK**: 서명 없이는 설치가 안 됩니다(Play에서도 요구).

### 8.2 keystore 만들기 (1회)
```powershell
keytool -genkeypair -v -keystore "D:\keys\travelerp-release.jks" `
  -keyalg RSA -keysize 2048 -validity 9125 -alias travelerp
```

### 8.3 Android Studio에서 서명
1. `Build > Generate Signed App Bundle / APK…` → APK 선택
2. Keystore 경로/별칭/비번 입력 → 릴리스 APK 생성
3. CLI 방식 원하면 `src-tauri/gen/android/project/app/build.gradle.kts`의
   `signingConfigs/release`에 storeFile 등 지정 후 `npm run tauri android build -- --apk`

> 키 분실 시 업데이트 불가(앱 재설치 유도). **백업 필수.** 자동화 시 `tauri.conf.json`의 bundle.android.signingConfigs 설정도 사용 가능(시크릿 관리 주의).

## 9. 데스크톱(Tauri) 빌드

```bash
npm run tauri -- build          # Windows .msi/.exe (targets: all)
```
- 데스크톱은 운영 모델 B(로컬 standalone 서버)를 쓰려면 `window.url = "http://127.0.0.1:3000"`으로 바꾼 뒤
  `node scripts/start.mjs`를 함께 실행하는 배치/서비스가 필요합니다.
- 동일 소스로 macOS/iOS 빌드가 가능하나 **iOS는 macOS + Xcode 필수**입니다.

## 10. 배포 (Android)

1. AAB 생성: `Build > Generate Signed App Bundle` → `travelerp-release.aab`
2. **Maybe 구글 플레이**: Play Console > 앱 > 릴리스 > 앱 번들 업로드
   - 사내 전용이면: 붙여넣기 없는 **사내 배포**(APK 설치 허용 설정) 또는 MDM 사용
3. 기사/가이드 단말에는 APK 직접 전달도 가능(출처 알 수 없는 앱 허용 안내)

## 11. FAQ / 함정

| 문제 | 원인/해결 |
|---|---|
| `npm run tauri` 실행 안 됨 | `@tauri-apps/cli` 미설치 → `npm i -D @tauri-apps/cli@^2` |
| `android init`이 오류 | ANDROID_HOME/JDK 없음 → 2.3절 확인 |
| webview가 빈 화면 | 배포 서버 반드시 HTTPS, `devUrl` 주소가 device에서 접근 불가한지 확인 |
| 로그는 뜨는데 검은 화면 | `frontendDist` 폴더 미존재 → 존재하는 폴더로 지정(섹션 4) |
| 실기기 빌드가 느림 | 첫 NDK/Rust 컴파일은 수 분~수십 분 소요(정상). 증분 후 빨라짐 |
| PWA/푸시 | Tauri webview(WebView/WebKit)에서 서비스워커·푸시는 제약이 있음 → 기사 알림은 폴링(+로컬 notification)이 안정적 |
| 로그인 세션이 디바이스마다 다름 | NextAuth 쿠키는 WebView 저장소 기준 — 기기별 재로그인(정상) |
| 업데이트 배포 | AAB 갱신 시 `versionCode` 증가 필수(Android Studio에서 자동 관리, 값 수동 확인) |
| 한글 앱 이름 | `productName`은 APK 내부명. 런처 라벨은 `android` manifest `label`로 따로 관리 가능 |

## 12. 진행 체크리스트

- [ ] `npm i -D @tauri-apps/cli@^2`
- [ ] Rust android 타겟 추가(`rustup target add …`)
- [ ] Android Studio + SDK/NDK/JDK 설치, `ANDROID_HOME`,`JAVA_HOME` 설정
- [ ] `tauri.conf.json` 수정(운영 URL·frontendDist·minSdk)
- [ ] `npm run tauri -- icon`으로 아이콘 생성
- [ ] `npm run tauri -- android init`
- [ ] Android Studio에서 `src-tauri/gen/android/project` 열고 실기기/에뮬 실행
- [ ] 운영 서버(HTTPS) 로드 확인 → 릴리스 서명 → APK/AAB 배포