import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../lib/i18n';
import { useReadingStore } from '../lib/store/readingStore';
import { BIBLE_BOOKS } from '../src/data/bibleData';
import { defaultMissionTarget } from '../src/domain/cycle';
import { bookProgress, progressSummary } from '../src/domain/progress';

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const t = useT();
  const { entries, cycle, completed, settings } = useReadingStore();
  const summary = progressSummary(entries, cycle);
  const missionTarget = settings.missionTarget ?? defaultMissionTarget(cycle);

  const completedBooks = BIBLE_BOOKS.filter((b) => {
    const bp = bookProgress(entries, cycle, b.order, b.chapterCount);
    return bp.total > 0 && bp.read === bp.total;
  }).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>{t('stats.basis', { n: cycle })}</Text>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('stats.progress')}</Text>
          <StatRow label={t('stats.overall')} value={`${Math.round(summary.percent * 100)}%`} />
          <StatRow label={t('stats.readChapters')} value={`${summary.read} / ${summary.total}`} />
          <StatRow label={t('home.ot')} value={`${summary.otRead}`} />
          <StatRow label={t('home.nt')} value={`${summary.ntRead}`} />
          <StatRow label={t('stats.completedBooks')} value={`${completedBooks} / 66`} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('stats.cycleGroup')}</Text>
          <StatRow label={t('stats.completions')} value={`${completed}`} />
          <StatRow label={t('stats.currentCycle')} value={`${cycle}`} />
          <StatRow label={t('stats.nextMission')} value={missionTarget != null ? `${missionTarget}` : t('home.setGoal')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  content: { padding: 20, paddingBottom: 40 },
  sub: { fontSize: 14, color: '#8A8780', marginTop: 2, marginBottom: 16 },
  group: { backgroundColor: '#FFF', borderRadius: 14, padding: 6, marginBottom: 16, borderWidth: 1, borderColor: '#EFEDE7' },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#8A8780', letterSpacing: 1, textTransform: 'uppercase', padding: 12, paddingBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F2F0EB' },
  label: { fontSize: 15, color: '#444' },
  value: { fontSize: 15, fontWeight: '600', color: '#111' },
});
