// 앱 설정 (온보딩 선택값 등) — AsyncStorage에 로컬 저장.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Locale = 'ko' | 'en';

export interface AppSettings {
  onboardingDone: boolean;
  locale: Locale;
  translation: string; // 'KRV' | 'KJV'
  planId: string; // 'year-1' | 'days-90' | 'nt-90' | 'psalms-30' | 'custom'
  order: string; // 'canonical' | 'nt-first' | 'genre'
  reminderOn: boolean;
  reminderTime: string; // 'HH:MM'
  reminderDays: number[]; // 0(월)..6(일)
  missionTarget: number | null; // null = 자동(사다리 추천)
  verseCacheVersion: number; // 본문 캐시 무효화용
  // 직접 설정(custom) 통독: 읽을 범위(책 order)와 기간(일)
  customStartOrder: number; // 1..66
  customEndOrder: number; // 1..66
  customDays: number;
}

const KEY = 'brt_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingDone: false,
  locale: 'ko',
  translation: 'KRV',
  planId: 'year-1',
  order: 'canonical',
  reminderOn: true,
  reminderTime: '21:00',
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  missionTarget: null,
  verseCacheVersion: 0,
  customStartOrder: 1,
  customEndOrder: 66,
  customDays: 90,
};

/** 현재 본문 정리 로직 버전 — 올리면 기존 캐시가 1회 무효화됨 */
export const VERSE_CACHE_VERSION = 1;

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// ── 시간 헬퍼 (reminderTime은 'HH:MM' 24시간 형식) ──

/** 'HH:MM' → Date (오늘 날짜의 해당 시각) */
export function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 21, m ?? 0, 0, 0);
  return d;
}

/** Date → 'HH:MM' */
export function dateToHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 'HH:MM' → '오전/오후 h:mm' */
export function formatKoTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hour = h ?? 21;
  const min = m ?? 0;
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${ampm} ${h12}:${String(min).padStart(2, '0')}`;
}
