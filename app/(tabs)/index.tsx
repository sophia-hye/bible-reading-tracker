import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookProgressBar } from '../../components/BookProgressBar';
import { ProgressRing } from '../../components/ProgressRing';
import { useLocale, useT } from '../../lib/i18n';
import { useReadingStore } from '../../lib/store/readingStore';
import { BIBLE_BOOKS } from '../../src/data/bibleData';
import { recommendNext } from '../../src/domain/recommend';
import { progressSummary } from '../../src/domain/progress';
import { currentStreak } from '../../src/domain/streak';
import { defaultMissionTarget } from '../../src/domain/cycle';
import { LAST_OT_ORDER, TOTAL_CHAPTERS } from '../../src/types/bible';

const OT_TOTAL = BIBLE_BOOKS.filter((b) => b.order <= LAST_OT_ORDER).reduce((s, b) => s + b.chapterCount, 0);
const NT_TOTAL = TOTAL_CHAPTERS - OT_TOTAL;
const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekDates(today: string): string[] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun
  const sinceMon = (dow + 6) % 7;
  const monday = addDays(today, -sinceMon);
  return Array.from({ length: 7 }, (_v, i) => addDays(monday, i));
}
function formatDate(locale: 'ko' | 'en'): string {
  const d = new Date();
  if (locale === 'en') {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { ready, cycle, entries, isRead, readDates, settings } = useReadingStore();

  const missionTarget = settings.missionTarget ?? defaultMissionTarget(cycle);
  const summary = progressSummary(entries, cycle);
  const rec = recommendNext(BIBLE_BOOKS, isRead, 3);
  const today = utcToday();
  const streak = currentStreak(readDates, today);
  const readSet = new Set(readDates);
  const week = weekDates(today);
  const weekdays = locale === 'en' ? WEEKDAYS_EN : WEEKDAYS_KO;

  const recLabel = rec
    ? locale === 'en'
      ? `${rec.bookNameEn} ${rec.startChapter}${rec.endChapter > rec.startChapter ? `–${rec.endChapter}` : ''}`
      : `${rec.bookNameKo} ${rec.startChapter}${rec.endChapter > rec.startChapter ? `–${rec.endChapter}` : ''}장`
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.today}>{t('home.today')}</Text>
          <Text style={styles.date}>{formatDate(locale)}</Text>
        </View>

        <Pressable style={styles.ringWrap} onPress={() => router.push('/overview')}>
          <ProgressRing percent={ready ? summary.read / TOTAL_CHAPTERS : 0} read={summary.read} total={TOTAL_CHAPTERS} />
          <Text style={styles.ringHint}>{t('home.viewAll')}</Text>
        </Pressable>

        <View style={styles.bars}>
          <View style={styles.barCol}>
            <View style={styles.barHead}>
              <Text style={styles.barLabel}>{t('home.ot')}</Text>
              <Text style={styles.barPct}>{Math.round((summary.otRead / OT_TOTAL) * 100)}%</Text>
            </View>
            <BookProgressBar percent={summary.otRead / OT_TOTAL} />
          </View>
          <View style={styles.barCol}>
            <View style={styles.barHead}>
              <Text style={styles.barLabel}>{t('home.nt')}</Text>
              <Text style={styles.barPct}>{Math.round((summary.ntRead / NT_TOTAL) * 100)}%</Text>
            </View>
            <BookProgressBar percent={summary.ntRead / NT_TOTAL} />
          </View>
        </View>

        <View style={styles.streakRow}>
          <Text style={styles.streakText}>{t('home.dayStreak', { n: streak })}</Text>
          <Text style={styles.streakHint}>{t('home.keepGoing')}</Text>
        </View>

        <Pressable style={styles.missionRow} onPress={() => router.push('/mission')}>
          <Text style={styles.missionLabel}>{t('home.nextMission')}</Text>
          <Text style={styles.missionValue}>
            {missionTarget != null ? t('home.missionGoal', { n: missionTarget }) : t('home.setGoal')} ›
          </Text>
        </Pressable>

        {/* 오늘의 읽기 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('home.todaysReading')}</Text>
          {recLabel ? (
            <>
              <Text style={styles.cardTitle}>{recLabel}</Text>
              <Text style={styles.cardSub}>{t('home.readingMeta', { n: rec!.count, min: rec!.count * 4 })}</Text>
              <Pressable
                style={styles.cardBtn}
                onPress={() => router.push(`/reader/${rec!.bookOrder}/${rec!.startChapter}`)}
              >
                <Text style={styles.cardBtnText}>{t('home.readNow')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>
                {cycle - 1 > 0 ? t('home.roundDone', { n: cycle - 1 }) : t('home.allDone')}
              </Text>
              <Pressable style={styles.cardBtn} onPress={() => router.push('/tracker')}>
                <Text style={styles.cardBtnText}>{t('home.openTracker')}</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* 이번 주 */}
        <Text style={styles.section}>{t('home.thisWeek')}</Text>
        <View style={styles.week}>
          {week.map((d, i) => {
            const filled = readSet.has(d);
            const isToday = d === today;
            return (
              <View key={d} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayDot,
                    filled && styles.dayDotFilled,
                    isToday && !filled && styles.dayDotToday,
                  ]}
                />
                <Text style={styles.dayLabel}>{weekdays[i]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  today: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase' },
  date: { fontSize: 13, color: '#8A8780' },
  ringWrap: { alignItems: 'center', marginVertical: 16 },
  ringHint: { fontSize: 12, color: '#A8A59E', marginTop: 8 },
  bars: { flexDirection: 'row', gap: 16, marginTop: 4 },
  barCol: { flex: 1 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: '#8A8780' },
  barPct: { fontSize: 12, color: '#444', fontWeight: '600' },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  streakText: { fontSize: 16, fontWeight: '700', color: '#111' },
  streakHint: { fontSize: 13, color: '#A8A59E' },
  missionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  missionLabel: { fontSize: 14, color: '#8A8780' },
  missionValue: { fontSize: 15, fontWeight: '700', color: '#B91C1C' },
  card: { backgroundColor: '#1A1A1A', borderRadius: 18, padding: 22, marginTop: 18 },
  cardLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: '#9A968E', textTransform: 'uppercase' },
  cardTitle: { fontSize: 26, fontWeight: '700', color: '#FFF', marginTop: 10 },
  cardSub: { fontSize: 14, color: '#B9B5AD', marginTop: 8 },
  cardBtn: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderRadius: 24, paddingHorizontal: 22, paddingVertical: 11, marginTop: 18 },
  cardBtnText: { fontSize: 15, fontWeight: '700', color: '#111' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 28, marginBottom: 14 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 8 },
  dayDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#D8D5CE', backgroundColor: 'transparent' },
  dayDotFilled: { backgroundColor: '#111', borderColor: '#111' },
  dayDotToday: { borderColor: '#111' },
  dayLabel: { fontSize: 12, color: '#A8A59E' },
});
