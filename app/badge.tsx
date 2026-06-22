import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReadingStore } from '../lib/store/readingStore';
import { BADGES } from '../src/domain/achievements';

export default function BadgeModal() {
  const router = useRouter();
  const newBadge = useReadingStore((s) => s.newBadge);
  const clearBadge = useReadingStore((s) => s.clearBadge);
  const def = BADGES.find((b) => b.key === newBadge);

  const close = () => {
    clearBadge();
    router.back();
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.star}>
          <Ionicons name="star" size={34} color="#FFF" />
        </View>
        <Text style={styles.kicker}>배지 획득</Text>
        <Text style={styles.title}>{def?.name ?? '새 배지'}</Text>
        <Text style={styles.desc}>{def?.desc ?? ''}</Text>
        <Pressable style={styles.primary} onPress={close}>
          <Text style={styles.primaryText}>이 순간 공유</Text>
        </Pressable>
        <Pressable onPress={close}>
          <Text style={styles.ghost}>계속 읽기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#FAF9F6', borderRadius: 22, padding: 28, alignItems: 'center', alignSelf: 'stretch' },
  star: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  kicker: { fontSize: 11, letterSpacing: 1.5, color: '#B91C1C', fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700', color: '#111', marginTop: 8 },
  desc: { fontSize: 14, color: '#8A8780', marginTop: 8, textAlign: 'center' },
  primary: { backgroundColor: '#B91C1C', borderRadius: 26, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 22 },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  ghost: { color: '#8A8780', fontSize: 14, marginTop: 14 },
});
