import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useReadingStore } from '../lib/store/readingStore';
import { progressSummary } from '../src/domain/progress';
import { currentStreak } from '../src/domain/streak';
import { TOTAL_CHAPTERS } from '../src/types/bible';

function Ring({ percent }: { percent: number }) {
  const size = 150;
  const sw = 12;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(Math.max(percent, 0), 1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#3A3A3A" strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#B91C1C" strokeWidth={sw} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={styles.ringPct}>{Math.round(percent * 100)}%</Text>
    </View>
  );
}

export default function ShareScreen() {
  const router = useRouter();
  const { entries, cycle, readDates } = useReadingStore();
  const summary = progressSummary(entries, cycle);
  const streak = currentStreak(readDates, new Date().toISOString().slice(0, 10));
  const pct = Math.round((summary.read / TOTAL_CHAPTERS) * 100);

  const onShare = () =>
    Share.share({
      message: `성경 통독 ${cycle}회독 ${pct}% (${summary.read}/${TOTAL_CHAPTERS}장) · ${streak}일 연속\n한 절씩, 끝까지. — Bible Reading Tracker`,
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>진행 공유</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#222" />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardKicker}>나의 통독 여정</Text>
          <Ring percent={summary.read / TOTAL_CHAPTERS} />
          <Text style={styles.cardStat}>
            {summary.read.toLocaleString()} / {TOTAL_CHAPTERS.toLocaleString()}장
          </Text>
          <Text style={styles.cardSub}>
            {cycle}회독 · {streak}일 연속
          </Text>
          <Text style={styles.cardQuote}>“한 절씩, 끝까지”</Text>
          <Text style={styles.cardBrand}>THE BIBLE READING TRACKER</Text>
        </View>

        <Pressable style={styles.primary} onPress={onShare}>
          <Ionicons name="share-outline" size={18} color="#FFF" />
          <Text style={styles.primaryText}>공유하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#1A1A1A', borderRadius: 22, padding: 28, alignItems: 'center' },
  cardKicker: { fontSize: 11, letterSpacing: 1.5, color: '#9A968E', textTransform: 'uppercase', marginBottom: 18 },
  ringPct: { position: 'absolute', fontSize: 30, fontWeight: '700', color: '#FFF' },
  cardStat: { fontSize: 15, color: '#E8E5DE', marginTop: 18 },
  cardSub: { fontSize: 13, color: '#9A968E', marginTop: 4 },
  cardQuote: { fontSize: 16, fontStyle: 'italic', color: '#E8E5DE', marginTop: 22 },
  cardBrand: { fontSize: 10, letterSpacing: 1.5, color: '#6B6862', marginTop: 22 },
  primary: { flexDirection: 'row', gap: 8, backgroundColor: '#B91C1C', borderRadius: 28, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
