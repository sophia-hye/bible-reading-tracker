# Bible Reading Tracker

커뮤니티-first 교회 SNS(인스타그램형 피드 + QT 나눔) + 성경 통독 트래커 엔진.
React Native (Expo) · TypeScript · 오프라인 우선(SQLite) · Supabase(예정).

## 빠른 실행 (폰에서 보기)

```bash
npm install            # 의존성 설치 (최초 1회)
npx expo start         # 개발 서버 시작 → 터미널/브라우저에 QR 표시
```

1. 폰에 **Expo Go** 앱 설치 (App Store / Google Play)
2. `npx expo start` 실행 후 나오는 **QR 코드 스캔**
   - iPhone: 기본 카메라 앱으로 스캔 → Expo Go로 열기
   - Android: Expo Go 앱 안에서 스캔
3. 폰과 컴퓨터가 **같은 Wi-Fi**에 있어야 함 (안 되면 `npx expo start --tunnel`)

> 현재 화면: **Tracker** — 전체 진행률 링 + The Gospels(마태~요한) 점 매트릭스.
> 점을 누르면 읽음 표시가 **로컬 SQLite에 저장**됩니다(오프라인 동작).

## 정식 설치 / 배포 (앱스토어 전)

네이티브 앱이라 Vercel/GitHub Pages가 아닌 **EAS Build**를 씁니다.

```bash
npm i -g eas-cli && eas login
eas build --profile preview --platform android   # APK → 폰에 직접 설치
eas build --profile preview --platform ios        # TestFlight (Apple Developer $99/년 필요)
```

| 대상 | 방법 |
|------|------|
| Android 실기기 | EAS Build APK 직접 설치 (계정 불필요, 무료) |
| iOS 실기기 | TestFlight (Apple Developer Program $99/년) |
| 백엔드 | Supabase 관리형 (마이그레이션만 적용, 별도 배포 없음) |

## 개발 스크립트

```bash
npm test           # 코어 로직 단위 테스트 (Jest, 50+)
npm run typecheck  # 코어(src) 타입체크
npm run typecheck:app  # Expo 앱 타입체크
npx expo export -p android  # 번들 빌드 검증(디바이스 없이)
```

## Supabase 연결 (선택 — 로그인·기기 간 동기화)

키를 넣기 전엔 앱이 **오프라인 전용**으로 동작합니다. 연결하려면:

1. [supabase.com](https://supabase.com)에서 **무료 프로젝트 생성**
2. **SQL Editor**에 `supabase/migrations/0001_init.sql` 붙여넣고 실행 (스키마 + RLS + RPC)
3. **Project Settings → API**에서 URL·anon key 복사 → 프로젝트 루트에 `.env` 생성 (`.env.example` 참고):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. `npx expo start -c` (캐시 비우고 재시작) → 더보기 탭의 "동기화"가 **클라우드 연결됨**으로 표시

> 연동 코드: `lib/supabase.ts`(클라이언트) · `lib/remote/supabaseRemote.ts`(RemoteApi) · `lib/auth.ts`(인증).
> 동기화 로직 자체(`src/services/syncService.ts`)는 백엔드 비종속이라 가짜 서버로 테스트 완료.

## 구조

```
src/         순수 코어 (RN 비종속, 테스트로 검증) — data·domain·db·services
lib/         expo-sqlite 드라이버 · zustand 스토어 · supabase 클라이언트/remote/auth
components/  ProgressRing · DotMatrix · BookProgressBar (react-native-svg)
app/         Expo Router 화면 — (tabs) 홈·트래커·통계·더보기, book/[order] 상세·절그리드
supabase/    migrations (스키마 + RLS + RPC)
docs/        PDCA 문서 (01-plan · 02-design · 03-analysis)
```
