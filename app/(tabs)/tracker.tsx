import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChapterDot, DotMatrix } from '../../components/DotMatrix';
import { bookName, useLocale, useT } from '../../lib/i18n';
import { useReadingStore } from '../../lib/store/readingStore';
import { BIBLE_BOOKS } from '../../src/data/bibleData';
import { chapterSizeStep, computeChapterSizeThresholds } from '../../src/domain/dotSize';

const THRESHOLDS = computeChapterSizeThresholds(BIBLE_BOOKS);
const GENRES = BIBLE_BOOKS.reduce<string[]>((acc, b) => {
  if (!acc.includes(b.genre)) acc.push(b.genre);
  return acc;
}, []);

export default function TrackerScreen() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { cycle, isRead } = useReadingStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('tracker.title')}</Text>
        <Text style={styles.sub}>{t('tracker.sub', { n: cycle })}</Text>

        {GENRES.map((genre) => {
          const books = BIBLE_BOOKS.filter((b) => b.genre === genre);
          const total = books.reduce((s, b) => s + b.chapterCount, 0);
          const read = books.reduce(
            (s, b) => s + b.verses.reduce((n, _v, i) => (isRead(b.order, i + 1) ? n + 1 : n), 0),
            0,
          );
          return (
            <View key={genre} style={styles.genre}>
              <View style={styles.genreHead}>
                <Text style={styles.genreTitle}>{genre}</Text>
                <Text style={styles.genreCount}>
                  {read} / {total}
                </Text>
              </View>

              {books.map((book) => {
                const dots: ChapterDot[] = book.verses.map((vc, i) => ({
                  chapter: i + 1,
                  sizeStep: chapterSizeStep(vc, THRESHOLDS),
                  fill: isRead(book.order, i + 1) ? '#111111' : null,
                }));
                const firstUnread = book.verses.findIndex((_v, i) => !isRead(book.order, i + 1)) + 1 || 1;
                return (
                  <View key={book.order} style={styles.book}>
                    <Pressable onPress={() => router.push(`/book/${book.order}/${firstUnread}`)} hitSlop={6}>
                      <Text style={styles.bookName}>{bookName(book, locale)} ›</Text>
                    </Pressable>
                    <DotMatrix dots={dots} onToggle={(ch) => router.push(`/book/${book.order}/${ch}`)} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 30, fontWeight: '700', color: '#111' },
  sub: { fontSize: 14, color: '#8A8780', marginTop: 2, marginBottom: 18 },
  genre: { marginBottom: 26 },
  genreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  genreTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase' },
  genreCount: { fontSize: 12, color: '#A8A59E' },
  book: { marginTop: 12 },
  bookName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
});
