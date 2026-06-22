import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../../lib/i18n';
import { useReadingStore } from '../../lib/store/readingStore';
import { isSupabaseConfigured } from '../../lib/supabase';

function Item({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color="#8A8780" style={{ width: 28 }} />
      <Text style={styles.label}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const t = useT();
  const { email, userId, syncing, settings, signOut, sync, updateSettings, reconcileChapters } = useReadingStore();
  const signedIn = userId !== 'local';

  const onReconcile = () => {
    const n = reconcileChapters();
    Alert.alert(t('more.reconcile'), n > 0 ? `${n} chapters reset / ${n}개 장을 안읽음으로 되돌렸어요.` : 'Nothing to reset / 되돌릴 장이 없어요.');
  };

  const onLanguage = () => {
    Alert.alert(t('more.language'), undefined, [
      { text: '한국어', onPress: () => updateSettings({ locale: 'ko' }) },
      { text: 'English', onPress: () => updateSettings({ locale: 'en' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('more.title')}</Text>

        {/* 계정 */}
        {isSupabaseConfigured && (
          <View style={styles.group}>
            {signedIn ? (
              <>
                <Item icon="person-circle-outline" label={email ?? ''} />
                <Pressable style={styles.row} onPress={() => sync()}>
                  <Ionicons name="sync-outline" size={20} color="#8A8780" style={{ width: 28 }} />
                  <Text style={styles.label}>{syncing ? t('more.syncing') : t('more.syncNow')}</Text>
                </Pressable>
                <Pressable style={styles.row} onPress={() => signOut()}>
                  <Ionicons name="log-out-outline" size={20} color="#B91C1C" style={{ width: 28 }} />
                  <Text style={[styles.label, { color: '#B91C1C' }]}>{t('more.logout')}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.row} onPress={() => router.push('/auth')}>
                <Ionicons name="log-in-outline" size={20} color="#B91C1C" style={{ width: 28 }} />
                <Text style={[styles.label, { color: '#B91C1C' }]}>{t('more.login')}</Text>
                <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
              </Pressable>
            )}
          </View>
        )}

        {/* 통계/성취 */}
        <View style={styles.group}>
          <Pressable style={styles.row} onPress={() => router.push('/stats')}>
            <Ionicons name="stats-chart-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.stats')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/mission')}>
            <Ionicons name="flag-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.mission')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/badges')}>
            <Ionicons name="star-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.badges')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/share')}>
            <Ionicons name="share-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.share')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
        </View>

        {/* 설정 */}
        <View style={styles.group}>
          <Pressable style={styles.row} onPress={() => router.push('/reminder')}>
            <Ionicons name="notifications-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.notifications')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={onLanguage}>
            <Ionicons name="language-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.language')}</Text>
            <Text style={styles.value}>{settings.locale === 'en' ? 'English' : '한국어'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" style={{ marginLeft: 6 }} />
          </Pressable>
          <Item
            icon={signedIn ? 'cloud-done-outline' : isSupabaseConfigured ? 'cloud-outline' : 'cloud-offline-outline'}
            label={t('more.sync')}
            value={signedIn ? t('more.cloudConnected') : isSupabaseConfigured ? t('more.loginNeeded') : t('more.localOnly')}
          />
          <Item icon="information-circle-outline" label={t('more.version')} value="0.9.0" />
          <Pressable style={styles.row} onPress={onReconcile}>
            <Ionicons name="construct-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.reconcile')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={() => updateSettings({ onboardingDone: false })}>
            <Ionicons name="refresh-outline" size={20} color="#8A8780" style={{ width: 28 }} />
            <Text style={styles.label}>{t('more.replayOnboarding')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C0B8" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 30, fontWeight: '700', color: '#111', marginBottom: 16 },
  group: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F2F0EB' },
  label: { flex: 1, fontSize: 15, color: '#333' },
  value: { fontSize: 14, color: '#8A8780' },
  note: { marginTop: 4, fontSize: 13, color: '#A8A59E', lineHeight: 19 },
});
