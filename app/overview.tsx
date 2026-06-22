import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChapterDot, DotMatrix } from '../components/DotMatrix';
import { bookName, useLocale, useT } from '../lib/i18n';
import { useReadingStore } from '../lib/store/readingStore';
import { BIBLE_BOOKS } from '../src/data/bibleData';
import { chapterSizeStep, computeChapterSizeThresholds } from '../src/domain/dotSize';
import { progressSummary } from '../src/domain/progress';
import { LAST_OT_ORDER, TOTAL_CHAPTERS } from '../src/types/bible';

const THRESHOLDS = computeChapterSizeThresholds(BIBLE_BOOKS);

export default function OverviewScreen() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { entries, cycle, isRead } = useReadingStore();
  const summary = progressSummary(entries, cycle);
  const pct = Math.round((summary.read / TOTAL_CHAPTERS) * 100);

  const renderBook = (book: (typeof BIBLE_BOOKS)[number]) => {
    const dots: ChapterDot[] = book.verses.map((vc, i) => ({
      chapter: i + 1,
      sizeStep: chapterSizeStep(vc, THRESHOLDS),
      fill: isRead(book.order, i + 1) ? '#111111' : null,
    }));
    return (
      <View key={book.order} style={styles.book}>
        <Pressable onPress={() => router.push(`/book/${book.order}`)} hitSlop={6}>
          <Text style={styles.bookName}>{bookName(book, locale)}</Text>
        </Pressable>
        <DotMatrix dots={dots} onToggle={() => router.push(`/book/${book.order}`)} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>{t('overview.title')}</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.progressWrap}>
        <Text style={styles.progressText}>
          {summary.read.toLocaleString()} / {TOTAL_CHAPTERS.toLocaleString()} · {pct}%
        </Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>{t('home.ot')}</Text>
        {BIBLE_BOOKS.filter((b) => b.order <= LAST_OT_ORDER).map(renderBook)}
        <Text style={styles.section}>{t('home.nt')}</Text>
        {BIBLE_BOOKS.filter((b) => b.order > LAST_OT_ORDER).map(renderBook)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  progressWrap: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  progressText: { fontSize: 13, color: '#8A8780', marginBottom: 6 },
  bar: { height: 4, borderRadius: 2, backgroundColor: '#E5E3DE', overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: '#B91C1C' },
  content: { padding: 20, paddingBottom: 48 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 16, marginBottom: 12 },
  book: { marginBottom: 14 },
  bookName: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 2 },
});
