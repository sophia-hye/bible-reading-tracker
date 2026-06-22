import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QtScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>QT 묵상</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.body}>
        <Ionicons name="leaf-outline" size={48} color="#C4C0B8" />
        <Text style={styles.h}>곧 제공됩니다</Text>
        <Text style={styles.sub}>매일 말씀 묵상을 기록하고 공동체와 나누는 QT 기능을 준비하고 있어요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  h: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 8 },
  sub: { fontSize: 14, color: '#8A8780', textAlign: 'center', lineHeight: 21 },
});
