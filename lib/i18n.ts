// 간단한 i18n — settings.locale(ko/en)에 따라 문자열 반환.

import { BibleBook } from '../src/types/bible';
import { Locale } from './settings';
import { useReadingStore } from './store/readingStore';

type Dict = Record<string, string>;

const KO: Dict = {
  // tabs
  'tab.home': '홈',
  'tab.tracker': '트래커',
  'tab.community': '커뮤니티',
  'tab.more': '더보기',
  // home
  'home.today': '오늘',
  'home.cycleInProgress': '{n}회독 진행 중',
  'home.viewAll': '전체 보기 ›',
  'home.ot': '구약',
  'home.nt': '신약',
  'home.dayStreak': '{n}일 연속',
  'home.keepGoing': '계속 이어가요',
  'home.nextMission': '다음 미션',
  'home.missionGoal': '{n}독 완료',
  'home.setGoal': '목표 설정',
  'home.todaysReading': '오늘의 읽기',
  'home.readingMeta': '{n}장 · 약 {min}분',
  'home.readNow': '지금 읽기',
  'home.roundDone': '{n}독 완료',
  'home.allDone': '통독 완료',
  'home.openTracker': '트래커 열기',
  'home.thisWeek': '이번 주',
  'home.chaptersUnit': '장',
  // tracker
  'tracker.title': '트래커',
  'tracker.sub': '{n}회독 · 장을 누르면 절 단위로 체크',
  // stats
  'stats.title': '통계',
  'stats.basis': '{n}회독 기준',
  'stats.progress': '진행',
  'stats.cycleGroup': '회독',
  'stats.overall': '전체 진행률',
  'stats.readChapters': '읽은 장',
  'stats.completedBooks': '완독한 책',
  'stats.completions': '완독 횟수',
  'stats.currentCycle': '현재 회독',
  'stats.nextMission': '다음 미션',
  // more
  'more.title': '더보기',
  'more.stats': '통계',
  'more.mission': '회독 목표',
  'more.badges': '성취 배지',
  'more.share': '진행 공유',
  'more.notifications': '알림',
  'more.language': '언어',
  'more.sync': '동기화',
  'more.version': '버전',
  'more.reconcile': '잘못 체크된 장 정리',
  'more.replayOnboarding': '온보딩 다시 보기',
  'more.login': '로그인 / 회원가입',
  'more.logout': '로그아웃',
  'more.syncNow': '지금 동기화',
  'more.syncing': '동기화 중…',
  'more.localOnly': '로컬 전용',
  'more.cloudConnected': '클라우드 연결됨',
  'more.loginNeeded': '로그인 필요',
  // reader / verse
  'reader.subtitle': '동그라미를 탭하면 읽음으로 표시되고 트래커에 반영됩니다',
  'reader.versesRead': '{read} / {total} 절',
  'reader.bookSelect': '책 선택',
  'reader.chapterSelect': '장 선택',
  'verse.tracker': '절 트래커 · {read} / {total} 장 읽음',
  'verse.markChapter': '이 장 전체 읽음으로 표시',
  'verse.chapterDone': '이 장 읽음 완료',
  'verse.hint': '절을 눌러 개별 체크 — 모든 절을 읽으면 트래커의 그 장도 채워집니다.',
  // overview
  'overview.title': '성경 전체',
  // common
  'common.korean': '한국어',
  'common.english': 'English',
  'unit.chapter': '장',
};

const EN: Dict = {
  'tab.home': 'Home',
  'tab.tracker': 'Tracker',
  'tab.community': 'Community',
  'tab.more': 'More',
  'home.today': 'TODAY',
  'home.cycleInProgress': 'Read-through {n} in progress',
  'home.viewAll': 'View all ›',
  'home.ot': 'OLD',
  'home.nt': 'NEW',
  'home.dayStreak': '{n}-day streak',
  'home.keepGoing': 'keep it going',
  'home.nextMission': 'Next mission',
  'home.missionGoal': 'Finish {n} read-throughs',
  'home.setGoal': 'Set a goal',
  'home.todaysReading': "Today's reading",
  'home.readingMeta': '{n} chapters · about {min} min',
  'home.readNow': 'Read now',
  'home.roundDone': '{n} read-throughs done',
  'home.allDone': 'Bible completed',
  'home.openTracker': 'Open tracker',
  'home.thisWeek': 'THIS WEEK',
  'home.chaptersUnit': 'ch',
  'tracker.title': 'Tracker',
  'tracker.sub': 'Read-through {n} · tap a chapter for verses',
  'stats.title': 'Stats',
  'stats.basis': 'Read-through {n}',
  'stats.progress': 'Progress',
  'stats.cycleGroup': 'Read-throughs',
  'stats.overall': 'Overall progress',
  'stats.readChapters': 'Chapters read',
  'stats.completedBooks': 'Books finished',
  'stats.completions': 'Completions',
  'stats.currentCycle': 'Current read-through',
  'stats.nextMission': 'Next mission',
  'more.title': 'More',
  'more.stats': 'Stats',
  'more.mission': 'Reading goal',
  'more.badges': 'Badges',
  'more.share': 'Share progress',
  'more.notifications': 'Notifications',
  'more.language': 'Language',
  'more.sync': 'Sync',
  'more.version': 'Version',
  'more.reconcile': 'Fix mischecked chapters',
  'more.replayOnboarding': 'Replay onboarding',
  'more.login': 'Sign in / Sign up',
  'more.logout': 'Sign out',
  'more.syncNow': 'Sync now',
  'more.syncing': 'Syncing…',
  'more.localOnly': 'Local only',
  'more.cloudConnected': 'Cloud connected',
  'more.loginNeeded': 'Sign in required',
  'reader.subtitle': 'Tap a circle to mark the verse read — it reflects in your tracker',
  'reader.versesRead': '{read} / {total} verses',
  'reader.bookSelect': 'Select book',
  'reader.chapterSelect': 'Select chapter',
  'verse.tracker': 'Verse tracker · {read} / {total} chapters',
  'verse.markChapter': 'Mark whole chapter read',
  'verse.chapterDone': 'Chapter completed',
  'verse.hint': 'Tap verses to check — read them all and the chapter fills in your tracker.',
  'overview.title': 'Whole Bible',
  'common.korean': '한국어',
  'common.english': 'English',
  'unit.chapter': 'ch',
};

const TABLES: Record<Locale, Dict> = { ko: KO, en: EN };

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? `{${k}}`));
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const table = TABLES[locale] ?? KO;
  return interpolate(table[key] ?? KO[key] ?? key, vars);
}

/** 컴포넌트에서 사용하는 t 함수 (locale 변경 시 자동 재렌더) */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const locale = useReadingStore((s) => s.settings.locale);
  return (key, vars) => translate(locale, key, vars);
}

export function useLocale(): Locale {
  return useReadingStore((s) => s.settings.locale);
}

/** locale에 맞는 성경 책 이름 */
export function bookName(book: BibleBook, locale: Locale): string {
  return locale === 'en' ? book.nameEn : book.nameKo;
}
