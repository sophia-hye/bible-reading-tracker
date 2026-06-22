import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SAMPLE = [
  { name: '제임스', ch: 1240 },
  { name: '은혜', ch: 1100 },
  { name: '소피아 (나)', ch: 980, me: true },
  { name: '다윗', ch: 890 },
  { name: '한나', ch: 720 },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<'group' | 'public'>('group');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>리더보드</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewBanner}>
          <Ionicons name="eye-outline" size={14} color="#8A8780" />
          <Text style={styles.previewText}>미리보기 — 실제 연결은 곧 제공</Text>
        </View>

        <View style={styles.toggle}>
          <Pressable style={[styles.seg, scope === 'group' && styles.segOn]} onPress={() => setScope('group')}>
            <Text style={[styles.segText, scope === 'group' && styles.segTextOn]}>그룹</Text>
          </Pressable>
          <Pressable style={[styles.seg, scope === 'public' && styles.segOn]} onPress={() => setScope('public')}>
            <Text style={[styles.segText, scope === 'public' && styles.segTextOn]}>전체 공개</Text>
          </Pressable>
        </View>

        <Text style={styles.caption}>이번 달 읽은 장</Text>

        {SAMPLE.map((m, i) => (
          <View key={m.name} style={[styles.row, m.me && styles.rowMe]}>
            <Text style={[styles.rank, m.me && styles.rankMe]}>{i + 1}</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{m.name.slice(0, 1)}</Text>
            </View>
            <Text style={[styles.name, m.me && styles.nameMe]}>{m.name}</Text>
            <Text style={[styles.ch, m.me && styles.nameMe]}>{m.ch.toLocaleString()} ch</Text>
          </View>
        ))}

        <Text style={styles.note}>경쟁이 아니라 격려를 위해 비교해요. 설정에서 언제든 비공개로 바꿀 수 있어요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  content: { padding: 20, paddingBottom: 40 },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0EEE8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 16 },
  previewText: { fontSize: 12, color: '#8A8780' },
  toggle: { flexDirection: 'row', backgroundColor: '#EEECE6', borderRadius: 10, padding: 3 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: '#111' },
  segText: { fontSize: 13, fontWeight: '600', color: '#8A8780' },
  segTextOn: { color: '#FFF' },
  caption: { fontSize: 12, color: '#A8A59E', marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  rowMe: { backgroundColor: '#FBEEEE', borderRadius: 12, paddingHorizontal: 10, borderTopWidth: 0, marginVertical: 2 },
  rank: { width: 18, fontSize: 14, color: '#8A8780', fontWeight: '700' },
  rankMe: { color: '#B91C1C' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  name: { flex: 1, fontSize: 15, color: '#222' },
  nameMe: { color: '#B91C1C', fontWeight: '700' },
  ch: { fontSize: 14, color: '#444', fontWeight: '600' },
  note: { fontSize: 12, color: '#A8A59E', marginTop: 20, lineHeight: 18 },
});
