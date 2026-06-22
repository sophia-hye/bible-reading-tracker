// Shared reading state (Zustand) — one source of truth across all tabs.
// Wraps the tested core repo/domain. Supports guest('local') + Supabase auth/sync.

import { create } from 'zustand';
import { BIBLE_BOOKS } from '../../src/data/bibleData';
import { BadgeInput, earnedBadges } from '../../src/domain/achievements';
import { chapterKey } from '../../src/domain/chapterKey';
import { completedCycles, depthByChapter } from '../../src/domain/cycle';
import { currentStreak } from '../../src/domain/streak';
import { LAST_OT_ORDER } from '../../src/types/bible';
import {
  clearVerseCache,
  countVerseReads,
  getCycleState,
  getReadDates,
  getReadingEntries,
  reassignUser,
  setChapterRead,
  upsertCycleState,
} from '../../src/db/readingRepo';
import { sync as runSync } from '../../src/services/syncService';
import { ReadingLogEntry } from '../../src/types/bible';
import {
  getUserEmail,
  getUserId,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
} from '../auth';
import { getDriver } from '../db/database';
import { createSupabaseRemote } from '../remote/supabaseRemote';
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, VERSE_CACHE_VERSION } from '../settings';
import { isSupabaseConfigured } from '../supabase';

const GUEST = 'local';
const remote = isSupabaseConfigured ? createSupabaseRemote() : null;
const now = () => new Date().toISOString();

interface ReadingStore {
  ready: boolean;
  userId: string;
  email: string | null;
  syncing: boolean;
  cycle: number;
  completed: number;
  entries: ReadingLogEntry[];
  readKeys: Set<string>;
  depth: Map<string, number>;
  maxDepth: number;
  readDates: string[];
  settings: AppSettings;
  justCompleted: boolean;
  badges: Set<string>;
  newBadge: string | null;
  init: () => Promise<void>;
  clearCompleted: () => void;
  clearBadge: () => void;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setMission: (target: number | null) => Promise<void>;
  /** 절을 다 안 읽었는데 체크된 장을 안읽음으로 되돌림. 되돌린 장 수 반환 */
  reconcileChapters: () => number;
  isRead: (bookOrder: number, chapter: number) => boolean;
  depthOf: (bookOrder: number, chapter: number) => number;
  toggle: (bookOrder: number, chapter: number) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sync: () => Promise<void>;
}

function readKeysForCycle(entries: ReadingLogEntry[], cycle: number): Set<string> {
  return new Set(
    entries.filter((e) => e.cycle === cycle && e.read).map((e) => chapterKey(e.bookOrder, e.chapter)),
  );
}

function maxOf(depth: Map<string, number>): number {
  let m = 0;
  for (const v of depth.values()) if (v > m) m = v;
  return m;
}

const OT_TOTAL = BIBLE_BOOKS.filter((b) => b.order <= LAST_OT_ORDER).reduce((s, b) => s + b.chapterCount, 0);
const NT_TOTAL = BIBLE_BOOKS.reduce((s, b) => s + b.chapterCount, 0) - OT_TOTAL;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 현재 상태로부터 획득 배지 집합 계산 */
function computeBadges(readKeys: Set<string>, completed: number, streak: number): Set<string> {
  let completedBooks = 0;
  let otRead = 0;
  let ntRead = 0;
  let pent = 0;
  let gos = 0;
  for (const b of BIBLE_BOOKS) {
    let cnt = 0;
    for (let ch = 1; ch <= b.chapterCount; ch++) if (readKeys.has(chapterKey(b.order, ch))) cnt += 1;
    if (cnt === b.chapterCount) {
      completedBooks += 1;
      if (b.order <= 5) pent += 1;
      if (b.order >= 40 && b.order <= 43) gos += 1;
    }
    if (b.order <= LAST_OT_ORDER) otRead += cnt;
    else ntRead += cnt;
  }
  const input: BadgeInput = {
    readCount: readKeys.size,
    streak,
    completedBooks,
    pentateuchDone: pent === 5,
    gospelsDone: gos === 4,
    otDone: otRead === OT_TOTAL,
    ntDone: ntRead === NT_TOTAL,
    completedCycles: completed,
  };
  return earnedBadges(input);
}

/** 특정 사용자의 로컬 데이터를 읽어 파생 상태 계산 */
function loadFor(userId: string) {
  const driver = getDriver();
  const entries = getReadingEntries(driver, userId);
  const cycle = getCycleState(driver, userId).currentCycle;
  const completed = completedCycles(entries);
  const depth = depthByChapter(entries);
  const readKeys = readKeysForCycle(entries, cycle);
  const readDates = getReadDates(driver, userId);
  const streak = currentStreak(readDates, todayISO());
  return {
    userId,
    entries,
    cycle,
    completed,
    readKeys,
    depth,
    maxDepth: maxOf(depth),
    readDates,
    badges: computeBadges(readKeys, completed, streak),
  };
}

export const useReadingStore = create<ReadingStore>((set, get) => ({
  ready: false,
  userId: GUEST,
  email: null,
  syncing: false,
  cycle: 1,
  completed: 0,
  entries: [],
  readKeys: new Set<string>(),
  depth: new Map<string, number>(),
  maxDepth: 0,
  readDates: [],
  settings: DEFAULT_SETTINGS,
  justCompleted: false,
  badges: new Set<string>(),
  newBadge: null,

  clearCompleted: () => set({ justCompleted: false }),
  clearBadge: () => set({ newBadge: null }),

  init: async () => {
    let settings = await loadSettings();
    // 본문 정리 로직이 바뀌면 기존(잘못된) 캐시 1회 무효화
    if ((settings.verseCacheVersion ?? 0) < VERSE_CACHE_VERSION) {
      clearVerseCache(getDriver());
      settings = await saveSettings({ verseCacheVersion: VERSE_CACHE_VERSION });
    }
    let userId = GUEST;
    let email: string | null = null;
    if (remote) {
      const uid = await getUserId();
      if (uid) {
        userId = uid;
        email = await getUserEmail();
      }
    }
    set({ ready: true, settings, email, ...loadFor(userId) });
    if (remote && userId !== GUEST) await get().sync();
    // 불변식 강제: 장 읽음 = 그 장의 절을 모두 읽음. 절이 덜 찬 장은 안읽음 처리.
    get().reconcileChapters();
  },

  updateSettings: async (patch) => {
    const settings = await saveSettings(patch);
    set({ settings });
  },

  setMission: async (target) => {
    await get().updateSettings({ missionTarget: target });
  },

  reconcileChapters: () => {
    const driver = getDriver();
    const { userId, cycle } = get();
    const readChapters = getReadingEntries(driver, userId).filter((e) => e.cycle === cycle && e.read);
    let cleared = 0;
    for (const e of readChapters) {
      const book = BIBLE_BOOKS.find((b) => b.order === e.bookOrder);
      if (!book) continue;
      const total = book.verses[e.chapter - 1] ?? 0;
      const vcount = countVerseReads(driver, userId, cycle, e.bookOrder, e.chapter);
      if (vcount < total) {
        setChapterRead(driver, { userId, cycle, bookOrder: e.bookOrder, chapter: e.chapter, read: false, now: now() });
        cleared += 1;
      }
    }
    set(loadFor(userId));
    return cleared;
  },

  isRead: (bookOrder, chapter) => get().readKeys.has(chapterKey(bookOrder, chapter)),
  depthOf: (bookOrder, chapter) => get().depth.get(chapterKey(bookOrder, chapter)) ?? 0,

  toggle: (bookOrder, chapter) => {
    const driver = getDriver();
    const { cycle, readKeys, userId, completed: prevCompleted, badges: prevBadges } = get();
    const willRead = !readKeys.has(chapterKey(bookOrder, chapter));
    setChapterRead(driver, { userId, cycle, bookOrder, chapter, read: willRead, now: now() });

    const entries = getReadingEntries(driver, userId);
    const completed = completedCycles(entries);
    if (completed >= cycle) {
      upsertCycleState(driver, userId, { currentCycle: completed + 1, completedCycles: completed }, now());
    }
    const next = loadFor(userId);
    // 새로 획득한 배지 감지 (모달 트리거)
    const fresh = [...next.badges].find((k) => !prevBadges.has(k)) ?? null;
    set({ ...next, justCompleted: completed > prevCompleted, newBadge: fresh });
    // 온라인이면 백그라운드 동기화 (실패해도 무시 — 오프라인 우선)
    if (remote && userId !== GUEST) void get().sync();
  },

  sync: async () => {
    const { userId } = get();
    if (!remote || userId === GUEST) return;
    set({ syncing: true });
    try {
      await runSync(getDriver(), remote, userId, now());
    } catch {
      // 오프라인/네트워크 오류는 무시 (로컬 우선)
    }
    set({ syncing: false, ...loadFor(get().userId) });
  },

  signIn: async (email, password) => {
    await authSignIn(email, password);
    const uid = await getUserId();
    if (!uid) throw new Error('로그인 세션을 가져오지 못했습니다.');
    reassignUser(getDriver(), GUEST, uid);
    set({ email: await getUserEmail(), ...loadFor(uid) });
    await get().sync();
  },

  signUp: async (email, password) => {
    await authSignUp(email, password);
    const uid = await getUserId();
    if (!uid) {
      // 이메일 확인이 필요한 설정인 경우 세션이 없음
      throw new Error('확인 메일을 보냈습니다. 메일 인증 후 로그인해 주세요.');
    }
    reassignUser(getDriver(), GUEST, uid);
    set({ email: await getUserEmail(), ...loadFor(uid) });
    await get().sync();
  },

  signOut: async () => {
    await authSignOut();
    set({ email: null, ...loadFor(GUEST) });
  },
}));
