import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingStore } from '../lib/store/readingStore';

export default function AuthScreen() {
  const router = useRouter();
  const signIn = useReadingStore((s) => s.signIn);
  const signUp = useReadingStore((s) => s.signUp);

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#222" />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.body}
      >
        <Text style={styles.title}>{mode === 'in' ? '로그인' : '회원가입'}</Text>
        <Text style={styles.sub}>기기 간 진행 동기화를 위해 계정을 사용하세요.</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#A8A59E"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#A8A59E"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.btn, busy && styles.btnBusy]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>{mode === 'in' ? '로그인' : '가입하기'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={styles.switch}>
          <Text style={styles.switchText}>
            {mode === 'in' ? '계정이 없나요? 회원가입' : '이미 계정이 있나요? 로그인'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { paddingHorizontal: 16, paddingTop: 4 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  sub: { fontSize: 14, color: '#8A8780', marginTop: 6, marginBottom: 24 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E3DE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
  },
  error: { color: '#B91C1C', fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnBusy: { opacity: 0.7 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  switch: { alignItems: 'center', marginTop: 18 },
  switchText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
