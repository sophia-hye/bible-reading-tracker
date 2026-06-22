import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingStore } from '../lib/store/readingStore';
import { BADGES } from '../src/domain/achievements';

export default function BadgesScreen() {
  const router = useRouter();
  const earned = useReadingStore((s) => s.badges);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>성취 배지</Text>
        <View style={{ width: 26 }} />
      </View>
      <Text style={styles.count}>
        {earned.size} / {BADGES.length} 획득
      </Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {BADGES.map((b) => {
            const has = earned.has(b.key);
            return (
              <View key={b.key} style={styles.cell}>
                <View style={[styles.badge, has ? styles.badgeOn : styles.badgeOff]}>
                  <Ionicons name={has ? 'star' : 'star-outline'} size={26} color={has ? '#FFF' : '#CBC9C4'} />
                </View>
                <Text style={[styles.name, !has && styles.locked]}>{b.name}</Text>
                <Text style={styles.desc}>{b.desc}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  count: { textAlign: 'center', fontSize: 13, color: '#8A8780', marginTop: 2, marginBottom: 8 },
  content: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeOn: { backgroundColor: '#1A1A1A' },
  badgeOff: { backgroundColor: '#EEECE6' },
  name: { fontSize: 13, fontWeight: '600', color: '#222', textAlign: 'center' },
  locked: { color: '#B0ADA6' },
  desc: { fontSize: 11, color: '#A8A59E', textAlign: 'center', marginTop: 2 },
});
