import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingStore } from '../lib/store/readingStore';
import { TOTAL_CHAPTERS } from '../src/types/bible';

function koDate(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// Start 화면에서 떨어진 글자가 "산처럼 쌓인" 모습 (Figma 06 Completed)
interface Glyph { ch: string; x: number; y: number; size: number; rot: number; op: number; red: boolean }

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMountain(): Glyph[] {
  const rnd = mulberry32(72074);
  const pool = 'abcdefghilmnoprstuvwyABEHILORST';
  const out: Glyph[] = [];
  for (let i = 0; i < 80; i++) {
    const t = Math.sqrt(rnd()); // 아래(t→1)로 갈수록 밀도 ↑
    const half = 0.04 + t * 0.46; // 봉우리(좁음) → 바닥(넓음)
    const x = 50 + (rnd() * 2 - 1) * half * 100;
    out.push({
      ch: pool[Math.floor(rnd() * pool.length)]!,
      x,
      y: t * 100,
      size: 9 + rnd() * 10,
      rot: (rnd() * 2 - 1) * 70,
      op: 0.3 + rnd() * 0.6,
      red: rnd() < 0.1,
    });
  }
  return out;
}

const MOUNTAIN = buildMountain();

export default function CompletedScreen() {
  const router = useRouter();
  const completed = useReadingStore((s) => s.completed);
  const round = completed > 0 ? completed : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text style={styles.kicker}>성경 통독 · {round}독 완료</Text>
        <Text style={styles.title}>수고하셨습니다.</Text>
      </View>

      <View style={styles.artBox}>
        {MOUNTAIN.map((g, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left: `${g.x}%`,
              top: `${g.y}%`,
              fontSize: g.size,
              opacity: g.op,
              color: g.red ? '#B91C1C' : '#1A1A1A',
              transform: [{ rotate: `${g.rot}deg` }],
            }}
          >
            {g.ch}
          </Text>
        ))}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.quote}>
          “내가 선한 싸움을 싸우고{'\n'}나의 달려갈 길을 마치고{'\n'}믿음을 지켰으니”
        </Text>
        <Text style={styles.ref}>디모데후서 4:7</Text>
        <Text style={styles.meta}>
          {koDate()} 완료 · {TOTAL_CHAPTERS.toLocaleString()}장 · {round}독째
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.primary}
          onPress={() => Alert.alert('곧 제공', '완독 공유 카드는 다음 업데이트에서 제공됩니다.')}
        >
          <Text style={styles.primaryText}>완독 공유하기</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.ghost}>다시 시작</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  top: { alignItems: 'center', paddingTop: 24 },
  kicker: { fontSize: 12, letterSpacing: 1.5, color: '#9A968E', textTransform: 'uppercase' },
  title: { fontSize: 36, fontWeight: '700', color: '#111', marginTop: 10 },
  artBox: { flex: 1, alignSelf: 'stretch', marginHorizontal: 20, marginVertical: 8, position: 'relative' },
  bottom: { alignItems: 'center', paddingHorizontal: 28 },
  quote: { fontSize: 18, fontStyle: 'italic', color: '#333', textAlign: 'center', lineHeight: 29 },
  ref: { fontSize: 12, letterSpacing: 1, color: '#B91C1C', marginTop: 12 },
  meta: { fontSize: 13, color: '#8A8780', marginTop: 22, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 12, alignItems: 'center' },
  primary: { backgroundColor: '#B91C1C', borderRadius: 28, paddingVertical: 16, alignItems: 'center', alignSelf: 'stretch' },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ghost: { color: '#8A8780', fontSize: 14, marginTop: 4 },
});
