import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChapterDot, DotMatrix } from '../../../components/DotMatrix';
import { getDriver } from '../../../lib/db/database';
import { bookName, useLocale, useT } from '../../../lib/i18n';
import { useReadingStore } from '../../../lib/store/readingStore';
import { BIBLE_BOOKS, getVerseStepsString } from '../../../src/data/bibleData';
import { getReadVerses, setVerseRead } from '../../../src/db/readingRepo';
import { verseSizeSteps } from '../../../src/domain/dotSize';

export default function VerseGridScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ order: string; chapter: string }>();
  const bookOrder = Number(params.order);
  const book = BIBLE_BOOKS.find((b) => b.order === bookOrder);

  const t = useT();
  const locale = useLocale();
  const ch = (n: number) => (locale === 'en' ? `${n}` : `${n}장`);
  const cycle = useReadingStore((s) => s.cycle);
  const userId = useReadingStore((s) => s.userId);
  const isRead = useReadingStore((s) => s.isRead);
  const toggleChapter = useReadingStore((s) => s.toggle);

  const [chapter, setChapter] = useState(Number(params.chapter) || 1);
  const [readVerses, setReadVerses] = useState<Set<number>>(new Set());

  const valid = book && chapter >= 1 && chapter <= book.chapterCount;

  useEffect(() => {
    if (!valid) return;
    setReadVerses(new Set(getReadVerses(getDriver(), userId, cycle, bookOrder, chapter)));
  }, [valid, userId, bookOrder, chapter, cycle]);

  if (!book || !valid) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>장을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const verseCount = book.verses[chapter - 1]!;
  const steps = verseSizeSteps(getVerseStepsString(book.order), book.verses, chapter);
  const chapterRead = isRead(bookOrder, chapter);

  const syncChapter = (allRead: boolean) => {
    // 장 읽음 = 절 전부 읽음. 다르면 맞춤(양방향).
    if (allRead !== isRead(bookOrder, chapter)) toggleChapter(bookOrder, chapter);
  };

  const toggleVerse = (verse: number) => {
    const willRead = !readVerses.has(verse);
    setVerseRead(getDriver(), { userId, cycle, bookOrder, chapter, verse, read: willRead, now: new Date().toISOString() });
    const next = new Set(readVerses);
    if (willRead) next.add(verse);
    else next.delete(verse);
    setReadVerses(next);
    syncChapter(next.size === verseCount);
  };

  const markAllVerses = () => {
    const target = !chapterRead; // 토글: 전체 읽음 ↔ 전체 해제
    const now = new Date().toISOString();
    const driver = getDriver();
    for (let v = 1; v <= verseCount; v++) {
      setVerseRead(driver, { userId, cycle, bookOrder, chapter, verse: v, read: target, now });
    }
    setReadVerses(target ? new Set(Array.from({ length: verseCount }, (_v, i) => i + 1)) : new Set());
    syncChapter(target);
  };

  const dots: ChapterDot[] = Array.from({ length: verseCount }, (_v, i) => ({
    chapter: i + 1, // 절 번호
    sizeStep: steps[i] ?? 0,
    fill: readVerses.has(i + 1) ? '#111111' : null,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>
          {bookName(book, locale)} {ch(chapter)}
        </Text>
        <Pressable onPress={() => router.push(`/reader/${bookOrder}/${chapter}`)} hitSlop={10}>
          <Ionicons name="book-outline" size={22} color="#B91C1C" />
        </Pressable>
      </View>
      <Text style={styles.count}>{t('verse.tracker', { read: readVerses.size, total: verseCount })}</Text>

      <Pressable
        style={[styles.chapterBtn, chapterRead && styles.chapterBtnOn]}
        onPress={markAllVerses}
      >
        <Ionicons name={chapterRead ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={chapterRead ? '#FFF' : '#B91C1C'} />
        <Text style={[styles.chapterBtnText, chapterRead && styles.chapterBtnTextOn]}>
          {chapterRead ? t('verse.chapterDone') : t('verse.markChapter')}
        </Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <DotMatrix dots={dots} onToggle={toggleVerse} />
        <Text style={styles.hint}>{t('verse.hint')}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nav} disabled={chapter <= 1} onPress={() => setChapter((c) => Math.max(1, c - 1))}>
          <Text style={[styles.navText, chapter <= 1 && styles.navDisabled]}>‹ {ch(chapter - 1)}</Text>
        </Pressable>
        <Text style={styles.navCenter}>
          {ch(chapter)} / {book.chapterCount}
        </Text>
        <Pressable style={styles.nav} disabled={chapter >= book.chapterCount} onPress={() => setChapter((c) => Math.min(book.chapterCount, c + 1))}>
          <Text style={[styles.navText, chapter >= book.chapterCount && styles.navDisabled]}>{ch(chapter + 1)} ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  count: { textAlign: 'center', fontSize: 13, color: '#8A8780', marginTop: 2, marginBottom: 10 },
  chapterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#B91C1C' },
  chapterBtnOn: { backgroundColor: '#B91C1C' },
  chapterBtnText: { fontSize: 14, fontWeight: '600', color: '#B91C1C' },
  chapterBtnTextOn: { color: '#FFF' },
  content: { padding: 20 },
  hint: { fontSize: 12, color: '#A8A59E', marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  nav: { minWidth: 60 },
  navText: { fontSize: 14, color: '#222', fontWeight: '600' },
  navDisabled: { color: '#CBC9C4' },
  navCenter: { fontSize: 13, color: '#8A8780' },
  missing: { padding: 24, fontSize: 16, color: '#8A8780' },
});
