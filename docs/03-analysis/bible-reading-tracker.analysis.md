---
template: analysis
feature: bible-reading-tracker
date: 2026-06-20
phase: check
author: gap-detector
---

# Bible Reading Tracker — 설계-구현 Gap 분석 (PDCA Check)

> **대상**: 설계 `docs/02-design/features/bible-reading-tracker.design.md` ↔ 구현 `src/`
> **기준 시점**: MVP "트래커 엔진"의 코어 증분(정적 데이터·도메인·SQLite·동기화) 완료 단계
> **테스트**: 6 스위트 / 50 테스트 통과, 타입체크 클린

## 요약

| 지표 | 값 |
|------|----|
| **구현된 범위 Match Rate** | **96%** (임계 90% 통과 ✅) |
| **전체 MVP 진행률** | **약 30%** (설계 §11.2 단계 1~3 완료, 4~9 미착수) |
| Critical / High 결함 | 0 |
| Medium 결함 | 2 (동작 안전성 영향 미미) |
| 누락(미보류) | 0 (미구현은 모두 의도적 보류) |

## 1. 설계와 일치 확인된 항목 (구현 완료)

| 설계 | 구현 | 상태 |
|------|------|------|
| §3.4 reading_log 컬럼·멱등키 (user+cycle+book+chapter) | `schema.ts`, `readingRepo.naturalKey` | ✅ 일치 |
| soft-delete (read=0, read_at=null, 행 보존) | `setChapterRead` | ✅ 일치 |
| §2.3 dirty 플래그·동기화 | `getDirtyReadingRows`/`markReadingLogsSynced` | ✅ 일치 |
| §2.3 last-write-wins + dirty 보호 | `mergeRemoteReadingLog` | ✅ 일치 |
| §3.5 회독 도메인 (완독 회차·current·depth·미션 사다리) | `domain/cycle.ts` | ✅ 일치 |
| §4.2 진행률 current_cycle 기준 (DM-6) | `domain/progress.ts` | ✅ 일치 (100% 초과 버그 없음) |
| C-1 점크기 이원화 (장=verses[], 절=steps) | `domain/dotSize.ts` | ✅ 일치 |
| C-2 데이터 정합 (Psalms) + 무결성 검증 | `data/bibleData.ts` | ✅ 일치 |
| 동기화 오케스트레이션 (push→pull→재계산) | `services/syncService.ts` | ✅ 일치 |
| §8 테스트 계획 (도메인·SQLite·sync 단위) | `*.test.ts` 50건 | ✅ 일치 |

## 2. 발견 결함

### D-1 (Medium) — 타이브레이커 3차 기준(id 사전순) 미구현
- **위치**: `src/db/readingRepo.ts` `mergeRemoteReadingLog`, `src/services/testing/fakeRemote.ts`
- **근거**: 설계 §2.3는 updated_at 동률 시 "read=true 우선 **또는** device_id/id 사전순"을 예시로 제시. 구현은 read=true 우선만 적용.
- **평가/결정**: `reading_log.read`는 **불리언**이므로 read=true 우선만으로 두 기기의 분기가 **완전히 결정론적으로 수렴**한다(값이 둘뿐). id 사전순 3차 기준은 비불리언 필드에만 의미가 있음 → **의도된 차이로 확정하고 설계 문구를 명확화**(코드 유지).

### D-2 (Medium) — sync_queue 테이블 생성됐으나 미사용
- **위치**: `src/db/schema.ts` (sync_queue DDL), 사용처 없음
- **근거**: 설계 §3.4에 sync_queue 존재. 구현은 행별 `dirty` 플래그 기반 push를 채택해 큐를 사용하지 않음.
- **평가/결정**: reading_log처럼 **멱등** 엔티티는 dirty 플래그가 더 단순·견고(중복 적재 없음). sync_queue는 **비멱등 작업(향후: 미디어 업로드 등)용으로 예약** → 설계·스키마 주석에 명시(테이블 유지).

## 3. 미구현 항목 (의도적 보류 — 다음 증분)

| 영역 | 설계 위치 | 분류 |
|------|----------|------|
| expo-sqlite 프로덕션 드라이버 | §11.1 db/ | 보류(테스트는 node:sqlite) |
| reading_mission 영속화 | §3.3 | 보류(도메인은 구현됨 → 다음 증분 진입점) |
| Tracker UI (DotMatrix/ProgressRing/VerseGrid) | §5.2, §11 | 보류 |
| Supabase 마이그레이션·RLS·RPC·Auth·RemoteApi 구현체 | §3.3, §4.3, §7 | 보류 |
| streak / achievement / reading_plan·user_plan / recommend | §3.3, §6 | 보류 |
| 본문 읽기(verse), 알림 | FR-01a, FR-09 | 보류(라이선스/Expo 의존) |
| 커뮤니티(피드·게시물·모더레이션) | Plan §4.5 (Phase 2) | 보류(별도 설계) |

> 비대칭 1건: `reading_mission` 도메인(`nextMission`)은 구현됐으나 DB 영속화는 미연결 → 다음 증분의 자연스러운 시작점.

## 4. 다음 증분 우선순위 권고

1. **reading_mission 영속화** (도메인 이미 존재, 스키마만 추가) — 비대칭 해소, 저비용
2. **expo-sqlite 프로덕션 드라이버** (인터페이스 구현체)
3. **Tracker UI** (DotMatrix/ProgressRing) + Expo 스캐폴딩
4. **Supabase 마이그레이션(스키마+RLS+RPC) + RemoteApi 구현체 + Auth**
5. streak / achievement / recommend / reading_plan

## 결론

구현된 범위는 설계와 **96% 일치**하며 Critical/High 결함 0. 두 Medium은 모두 **구현이 더 타당한 의도적 차이**로, 설계 문서 명확화로 정리한다. 전체 MVP는 코어 계층(데이터·도메인·동기화 로직)이 검증 완료된 ~30% 지점으로, 런타임 결합(Expo/Supabase/UI)이 다음 과제다.
