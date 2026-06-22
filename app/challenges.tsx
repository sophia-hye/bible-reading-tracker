import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const JOINABLE = [
  { name: '365일 통독', detail: '1년 · 하루 약 3~4장' },
  { name: '신약 90일', detail: '90일 · 하루 약 3장' },
  { name: '시편·잠언 한 달', detail: '30일 · 하루 약 5장' },
];

export default function ChallengesScreen() {
  const router = useRouter();
  const soon = () => Alert.alert('곧 제공', '챌린지 참여는 다음 업데이트에서 제공됩니다.');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>챌린지</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewBanner}>
          <Ionicons name="eye-outline" size={14} color="#8A8780" />
          <Text style={styles.previewText}>미리보기 — 실제 연결은 곧 제공</Text>
        </View>

        <Text style={styles.section}>진행 중</Text>
        <View style={styles.active}>
          <Text style={styles.activeKicker}>90일 통독 · 청년부</Text>
          <Text style={styles.activeTitle}>45일째 / 90일</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: '52%' }]} />
          </View>
          <Text style={styles.activeMeta}>620 / 1,189장 · 하루 약 13장</Text>
        </View>

        <Text style={styles.section}>챌린지 참여</Text>
        {JOINABLE.map((c) => (
          <View key={c.name} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowSub}>{c.detail}</Text>
            </View>
            <Pressable style={styles.join} onPress={soon}>
              <Text style={styles.joinText}>참여</Text>
            </Pressable>
          </View>
        ))}
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
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  active: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18 },
  activeKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#9A968E', textTransform: 'uppercase' },
  activeTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginTop: 8 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#3A3A3A', marginTop: 12, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: '#B91C1C' },
  activeMeta: { fontSize: 12, color: '#B9B5AD', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', padding: 16, marginBottom: 10 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowSub: { fontSize: 13, color: '#8A8780', marginTop: 2 },
  join: { borderWidth: 1.5, borderColor: '#222', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  joinText: { fontSize: 14, fontWeight: '600', color: '#222' },
});
