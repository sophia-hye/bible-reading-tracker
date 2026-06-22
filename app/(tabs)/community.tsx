import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookProgressBar } from '../../components/BookProgressBar';
import { useReadingStore } from '../../lib/store/readingStore';
import { isSupabaseConfigured } from '../../lib/supabase';

// 미리보기 샘플 — 실제 그룹 데이터는 백엔드(그룹 테이블/멤버 진행 집계) 연결 후 표시
const SAMPLE = {
  name: '청년부 통독',
  goalLabel: '90일 함께 읽기',
  read: 1240,
  total: 1780,
  members: [
    { name: '지혜', percent: 0.92 },
    { name: '소피아', percent: 0.78 },
    { name: '은혜', percent: 0.61 },
    { name: '다윗', percent: 0.55 },
    { name: '한나', percent: 0.4 },
  ],
};

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const userId = useReadingStore((s) => s.userId);
  const signedIn = userId !== 'local';
  const soon = () => Alert.alert('곧 제공', '그룹 만들기·참여는 다음 업데이트에서 제공됩니다.');

  // 로그인/설정 게이트
  if (!isSupabaseConfigured || !signedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.gate}>
          <Ionicons name="people-outline" size={48} color="#C4C0B8" />
          <Text style={styles.gateTitle}>함께 읽기</Text>
          <Text style={styles.gateSub}>
            {isSupabaseConfigured
              ? '로그인하면 교회·소그룹에 참여해 함께 통독할 수 있어요.'
              : '커뮤니티 기능은 계정 연결이 필요합니다.'}
          </Text>
          {isSupabaseConfigured && (
            <Pressable style={styles.primary} onPress={() => router.push('/auth')}>
              <Text style={styles.primaryText}>로그인 / 회원가입</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.round((SAMPLE.read / SAMPLE.total) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>커뮤니티</Text>

        <View style={styles.previewBanner}>
          <Ionicons name="eye-outline" size={14} color="#8A8780" />
          <Text style={styles.previewText}>미리보기 — 실제 그룹 연결은 곧 제공</Text>
        </View>

        <Text style={styles.groupName}>{SAMPLE.name}</Text>

        {/* 그룹 진행 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardKicker}>그룹 진행 · {SAMPLE.goalLabel}</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardPct}>{pct}%</Text>
            <Text style={styles.cardCount}>
              {SAMPLE.read.toLocaleString()} / {SAMPLE.total.toLocaleString()} 장
            </Text>
          </View>
          <View style={styles.cardBar}>
            <View style={[styles.cardBarFill, { width: `${pct}%` }]} />
          </View>
        </View>

        <Text style={styles.section}>멤버 · {SAMPLE.members.length}</Text>
        {SAMPLE.members.map((m) => (
          <View key={m.name} style={styles.member}>
            <Avatar name={m.name} />
            <View style={styles.memberBody}>
              <View style={styles.memberTop}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberPct}>{Math.round(m.percent * 100)}%</Text>
              </View>
              <BookProgressBar percent={m.percent} />
            </View>
          </View>
        ))}

        <Pressable style={styles.invite} onPress={soon}>
          <Text style={styles.inviteText}>멤버 초대</Text>
        </Pressable>

        <View style={styles.links}>
          {[
            { icon: 'trophy-outline' as const, label: '리더보드', href: '/leaderboard' },
            { icon: 'flame-outline' as const, label: '챌린지', href: '/challenges' },
            { icon: 'leaf-outline' as const, label: 'QT 묵상', href: '/qt' },
          ].map((l) => (
            <Pressable key={l.href} style={styles.linkRow} onPress={() => router.push(l.href)}>
              <Ionicons name={l.icon} size={20} color="#8A8780" style={{ width: 28 }} />
              <Text style={styles.linkText}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 30, fontWeight: '700', color: '#111', marginBottom: 12 },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0EEE8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 16 },
  previewText: { fontSize: 12, color: '#8A8780' },
  groupName: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 12 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20 },
  cardKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#9A968E', textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
  cardPct: { fontSize: 34, fontWeight: '700', color: '#FFF' },
  cardCount: { fontSize: 13, color: '#B9B5AD' },
  cardBar: { height: 6, borderRadius: 3, backgroundColor: '#3A3A3A', marginTop: 14, overflow: 'hidden' },
  cardBarFill: { height: 6, borderRadius: 3, backgroundColor: '#B91C1C' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 26, marginBottom: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  memberBody: { flex: 1 },
  memberTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  memberName: { fontSize: 15, color: '#222' },
  memberPct: { fontSize: 13, fontWeight: '600', color: '#444' },
  invite: { marginTop: 28, borderWidth: 1.5, borderColor: '#222', borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  inviteText: { fontSize: 15, fontWeight: '600', color: '#222' },
  links: { marginTop: 24, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#F2F0EB' },
  linkText: { flex: 1, fontSize: 15, color: '#333' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  gateTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 8 },
  gateSub: { fontSize: 14, color: '#8A8780', textAlign: 'center', lineHeight: 20 },
  primary: { backgroundColor: '#B91C1C', borderRadius: 26, paddingVertical: 14, paddingHorizontal: 28, marginTop: 14 },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
