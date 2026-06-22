import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingStore } from '../lib/store/readingStore';
import { defaultMissionTarget, MISSION_LADDER } from '../src/domain/cycle';

export default function MissionScreen() {
  const router = useRouter();
  const { cycle, completed, settings, setMission } = useReadingStore();
  const auto = defaultMissionTarget(cycle);
  const current = settings.missionTarget;

  const options = MISSION_LADDER.filter((v) => v > completed);

  const choose = async (target: number | null) => {
    await setMission(target);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#222" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>회독 목표 설정</Text>
        <Text style={styles.sub}>평생 통독 여정의 다음 목표를 정하세요. 언제든 바꿀 수 있어요.</Text>

        <Pressable style={[styles.row, current === null && styles.rowOn]} onPress={() => choose(null)}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>자동 (추천)</Text>
            <Text style={styles.rowSub}>{auto != null ? `현재 추천: ${auto}독` : '사다리 완료'}</Text>
          </View>
          {current === null && <Ionicons name="checkmark-circle" size={22} color="#B91C1C" />}
        </Pressable>

        {options.map((v) => (
          <Pressable key={v} style={[styles.row, current === v && styles.rowOn]} onPress={() => choose(v)}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{v}독 완료</Text>
              <Text style={styles.rowSub}>성경을 {v}번 통독하기</Text>
            </View>
            {current === v && <Ionicons name="checkmark-circle" size={22} color="#B91C1C" />}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { paddingHorizontal: 16, paddingTop: 4 },
  content: { padding: 24, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  sub: { fontSize: 14, color: '#8A8780', marginTop: 6, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#EFEDE7', padding: 16, marginBottom: 10 },
  rowOn: { borderColor: '#111' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowSub: { fontSize: 13, color: '#8A8780', marginTop: 2 },
});
