import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { useReadingStore } from '../lib/store/readingStore';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const init = useReadingStore((s) => s.init);
  const ready = useReadingStore((s) => s.ready);
  const onboardingDone = useReadingStore((s) => s.settings.onboardingDone);
  const justCompleted = useReadingStore((s) => s.justCompleted);
  const clearCompleted = useReadingStore((s) => s.clearCompleted);
  const newBadge = useReadingStore((s) => s.newBadge);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboardingDone && !inOnboarding) router.replace('/onboarding');
    else if (onboardingDone && inOnboarding) router.replace('/');
  }, [ready, onboardingDone, segments, router]);

  useEffect(() => {
    if (justCompleted) {
      clearCompleted();
      router.push('/completed');
    }
  }, [justCompleted, clearCompleted, router]);

  useEffect(() => {
    if (newBadge) router.push('/badge');
  }, [newBadge, router]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* 상태바(시간·와이파이·배터리) 영역은 배경만 보이도록 — 콘텐츠는 SafeAreaView가 그 아래로 밀어냄 */}
      <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAF9F6' } }} />
      </View>
    </SafeAreaProvider>
  );
}
