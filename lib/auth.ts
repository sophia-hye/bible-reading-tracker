// 인증 헬퍼 (Application) — Supabase Auth 래퍼. 미설정 시 명확히 에러.

import { getSupabase } from './supabase';

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다 (.env 키 필요)');
  return supabase;
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getUserEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
