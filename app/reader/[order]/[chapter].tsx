import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadChapterText, Translation, TRANSLATIONS } from '../../../lib/bibleText';
import { getDriver } from '../../../lib/db/database';
import { bookName, useLocale, useT } from '../../../lib/i18n';
import { useReadingStore } from '../../../lib/store/readingStore';
import { BIBLE_BOOKS } from '../../../src/data/bibleData';
import { getReadVerses, setVerseRead, VerseText } from '../../../src/db/readingRepo';

const FONT_SIZES = [16, 18, 21];

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ order: string; chapter: string }>();

  const t = useT();
  const locale = useLocale();
  const ch = (n: number) => (locale === 'en' ? `${n}` : `${n}장`);
  const { settings, userId, cycle, isRead, toggle, updateSettings } = useReadingStore();
  const [version, setVersion] = useState<Translation>(settings.translation === 'KJV' ? 'KJV' : 'KRV');
  const [bookOrder, setBookOrder] = useState(Number(params.order) || 1);
  const [chapter, setChapter] = useState(Number(params.chapter) || 1);
  const [verses, setVerses] = useState<VerseText[]>([]);
  const [readVerses, setReadVerses] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontIdx, setFontIdx] = useState(1);

  // 책/장 선택 모달
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBook, setPickerBook] = useState<number | null>(null);

  const book = BIBLE_BOOKS.find((b) => b.order === bookOrder);

  useEffect(() => {
    if (!book) return;
    let alive = true;
    setLoading(true);
    setError(null);
    loadChapterText(version, bookOrder, chapter)
      .then((v) => alive && setVerses(v))
      .catch((e) => alive && setError(e instanceof Error ? e.message : '오류'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [book, version, bookOrder, chapter]);

  useEffect(() => {
    setReadVerses(new Set(getReadVerses(getDriver(), userId, cycle, bookOrder, chapter)));
  }, [userId, cycle, bookOrder, chapter]);

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>책을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const verseCount = book.verses[chapter - 1] ?? verses.length;
  const fontSize = FONT_SIZES[fontIdx]!;

  const toggleVerse = (verse: number) => {
    const willRead = !readVerses.has(verse);
    setVerseRead(getDriver(), { userId, cycle, bookOrder, chapter, verse, read: willRead, now: new Date().toISOString() });
    const next = new Set(readVerses);
    if (willRead) next.add(verse);
    else next.delete(verse);
    setReadVerses(next);
    // 장 읽음 = 절 전부 읽음 (양방향 동기화)
    const allRead = next.size === verseCount;
    if (allRead !== isRead(bookOrder, chapter)) toggle(bookOrder, chapter);
  };

  const openPicker = () => {
    setPickerBook(bookOrder);
    setPickerOpen(true);
  };
  const pickChapter = (ch: number) => {
    if (pickerBook) setBookOrder(pickerBook);
    setChapter(ch);
    setPickerOpen(false);
  };

  const pickerBookObj = BIBLE_BOOKS.find((b) => b.order === pickerBook);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Pressable style={styles.titleBtn} onPress={openPicker} hitSlop={8}>
          <Text style={styles.title}>
            {bookName(book, locale)} {ch(chapter)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#8A8780" />
        </Pressable>
        <Pressable onPress={() => setFontIdx((i) => (i + 1) % FONT_SIZES.length)} hitSlop={10}>
          <Text style={styles.aa}>Aa</Text>
        </Pressable>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subtitle}>{t('reader.subtitle')}</Text>
        <View style={styles.transToggle}>
          {TRANSLATIONS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setVersion(t.id);
                updateSettings({ translation: t.id });
              }}
            >
              <Text style={[styles.transText, version === t.id && styles.transOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color="#B91C1C" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.error}>{error}{'\n'}인터넷 연결 후 다시 시도하세요.</Text>
        ) : (
          verses.map((v) => {
            const read = readVerses.has(v.verse);
            return (
              <View key={v.verse} style={styles.verseRow}>
                <Pressable onPress={() => toggleVerse(v.verse)} hitSlop={6} style={[styles.circle, read ? styles.circleOn : styles.circleOff]}>
                  <Text style={[styles.circleNum, read && styles.circleNumOn]}>{v.verse}</Text>
                </Pressable>
                <Text style={[styles.verseText, { fontSize, lineHeight: fontSize * 1.55 }]}>{v.text}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nav} disabled={chapter <= 1} onPress={() => setChapter((c) => Math.max(1, c - 1))}>
          <Text style={[styles.navText, chapter <= 1 && styles.navDisabled]}>‹ {ch(chapter - 1)}</Text>
        </Pressable>
        <Text style={styles.count}>{t('reader.versesRead', { read: readVerses.size, total: verseCount })}</Text>
        <Pressable style={styles.nav} disabled={chapter >= book.chapterCount} onPress={() => setChapter((c) => Math.min(book.chapterCount, c + 1))}>
          <Text style={[styles.navText, chapter >= book.chapterCount && styles.navDisabled]}>{ch(chapter + 1)} ›</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.pickerHead}>
            {pickerBook && pickerBook !== bookOrder ? (
              <Pressable onPress={() => setPickerBook(null)} hitSlop={10}>
                <Ionicons name="chevron-back" size={24} color="#222" />
              </Pressable>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={styles.pickerTitle}>
              {pickerBook && pickerBookObj ? `${bookName(pickerBookObj, locale)} · ${t('reader.chapterSelect')}` : t('reader.bookSelect')}
            </Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#222" />
            </Pressable>
          </View>

          {pickerBook == null ? (
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              {BIBLE_BOOKS.map((b) => (
                <Pressable key={b.order} style={styles.bookRow} onPress={() => setPickerBook(b.order)}>
                  <Text style={styles.bookName}>{bookName(b, locale)}</Text>
                  <Text style={styles.bookMeta}>{ch(b.chapterCount)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.chGrid}>
              {Array.from({ length: pickerBookObj?.chapterCount ?? 0 }, (_v, i) => i + 1).map((ch) => (
                <Pressable key={ch} style={styles.chCell} onPress={() => pickChapter(ch)}>
                  <Text style={styles.chText}>{ch}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  aa: { fontSize: 17, fontWeight: '700', color: '#8A8780' },
  subRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' },
  subtitle: { fontSize: 12, color: '#A8A59E' },
  transToggle: { flexDirection: 'row', gap: 14, marginTop: 8 },
  transText: { fontSize: 13, color: '#A8A59E', fontWeight: '600' },
  transOn: { color: '#B91C1C' },
  content: { padding: 20, paddingBottom: 30 },
  verseRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  circle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2 },
  circleOn: { backgroundColor: '#111' },
  circleOff: { borderWidth: 1.5, borderColor: '#CBC9C4' },
  circleNum: { fontSize: 12, fontWeight: '700', color: '#A8A59E' },
  circleNumOn: { color: '#FFF' },
  verseText: { flex: 1, color: '#222' },
  error: { marginTop: 40, textAlign: 'center', color: '#8A8780', fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  nav: { minWidth: 60 },
  navText: { fontSize: 14, color: '#222', fontWeight: '600' },
  navDisabled: { color: '#CBC9C4' },
  count: { fontSize: 13, color: '#8A8780' },
  missing: { padding: 24, fontSize: 16, color: '#8A8780' },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  bookRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F0EB' },
  bookName: { fontSize: 16, color: '#222' },
  bookMeta: { fontSize: 13, color: '#A8A59E' },
  chGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  chCell: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#E5E3DE', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  chText: { fontSize: 16, fontWeight: '600', color: '#222' },
});
