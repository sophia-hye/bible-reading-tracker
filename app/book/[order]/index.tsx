import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChapterDot, DotMatrix } from '../../../components/DotMatrix';
import { bookName, useLocale } from '../../../lib/i18n';
import { useReadingStore } from '../../../lib/store/readingStore';
import { BIBLE_BOOKS } from '../../../src/data/bibleData';
import { depthToInkStep } from '../../../src/domain/cycle';
import { chapterSizeStep, computeChapterSizeThresholds } from '../../../src/domain/dotSize';

const THRESHOLDS = computeChapterSizeThresholds(BIBLE_BOOKS);
// 잉크 농도 램프: index = inkStep(0..4). 0 = 미독(null), 1→4 = 옅은→짙은 잉크
const INK: (string | null)[] = [null, '#B7B3AB', '#857F76', '#4F4B45', '#111111'];

type Mode = 'current' | 'cumulative';

export default function BookDetailScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order: string }>();
  const bookOrder = Number(order);
  const book = BIBLE_BOOKS.find((b) => b.order === bookOrder);
  const { isRead, depthOf, maxDepth } = useReadingStore();
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>('current');

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>책을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const readCount = book.verses.reduce((n, _v, i) => (isRead(book.order, i + 1) ? n + 1 : n), 0);

  const dots: ChapterDot[] = book.verses.map((verseCount, i) => {
    const chapter = i + 1;
    const sizeStep = chapterSizeStep(verseCount, THRESHOLDS);
    let fill: string | null;
    if (mode === 'current') {
      fill = isRead(book.order, chapter) ? '#111111' : null;
    } else {
      const step = depthToInkStep(depthOf(book.order, chapter), maxDepth, 4);
      fill = INK[step] ?? null;
    }
    return { chapter, sizeStep, fill };
  });

  const onDotPress = (chapter: number) => {
    // 장을 누르면 그 장의 절 트래커(절 그리드)로 진입
    router.push(`/book/${book.order}/${chapter}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>{bookName(book, locale)}</Text>
        <Pressable
          onPress={() => {
            const firstUnread = book.verses.findIndex((_v, i) => !isRead(book.order, i + 1)) + 1;
            router.push(`/reader/${book.order}/${firstUnread || 1}`);
          }}
          hitSlop={10}
        >
          <Ionicons name="book-outline" size={22} color="#B91C1C" />
        </Pressable>
      </View>
      <Text style={styles.count}>
        절 트래커 · {readCount} / {book.chapterCount} 장 읽음
      </Text>

      <View style={styles.toggle}>
        <Pressable style={[styles.segment, mode === 'current' && styles.segmentOn]} onPress={() => setMode('current')}>
          <Text style={[styles.segmentText, mode === 'current' && styles.segmentTextOn]}>현재 회독</Text>
        </Pressable>
        <Pressable
          style={[styles.segment, mode === 'cumulative' && styles.segmentOn]}
          onPress={() => setMode('cumulative')}
        >
          <Text style={[styles.segmentText, mode === 'cumulative' && styles.segmentTextOn]}>전체 누적</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <DotMatrix title={`${book.nameEn} · ${book.chapterCount}장`} dots={dots} onToggle={onDotPress} />

        {mode === 'cumulative' && (
          <View style={styles.legend}>
            <Text style={styles.legendLabel}>적게 읽음</Text>
            {INK.slice(1).map((c, i) => (
              <View key={i} style={[styles.legendDot, { backgroundColor: c as string }]} />
            ))}
            <Text style={styles.legendLabel}>여러 번</Text>
          </View>
        )}

        <Text style={styles.hint}>장을 누르면 그 장의 절을 체크할 수 있어요. 점 크기는 장 길이(절 수)입니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  count: { textAlign: 'center', fontSize: 13, color: '#8A8780', marginTop: 2, marginBottom: 10 },
  toggle: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#EEECE6', borderRadius: 10, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentOn: { backgroundColor: '#FFFFFF' },
  segmentText: { fontSize: 13, color: '#8A8780', fontWeight: '600' },
  segmentTextOn: { color: '#111' },
  verseToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 12 },
  verseToggleText: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },
  content: { padding: 20 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  legendLabel: { fontSize: 11, color: '#A8A59E' },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  hint: { fontSize: 12, color: '#A8A59E', marginTop: 12 },
  missing: { padding: 24, fontSize: 16, color: '#8A8780' },
});
