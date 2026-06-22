// RemoteApi 구현체 (Supabase). 동기화 로직(src/services/syncService)은 이 구현에
// 의존하지 않고 RemoteApi 인터페이스만 사용 → 백엔드 교체 가능.

import { RemoteReadingLog } from '../../src/db/readingRepo';
import { RemoteApi } from '../../src/services/remote';
import { getSupabase } from '../supabase';

interface ReadingLogRow {
  user_id: string;
  cycle: number;
  book_order: number;
  chapter: number;
  read: boolean;
  read_at: string | null;
  source: string;
  updated_at: string;
}

function toRow(r: RemoteReadingLog): ReadingLogRow {
  return {
    user_id: r.userId,
    cycle: r.cycle,
    book_order: r.bookOrder,
    chapter: r.chapter,
    read: r.read,
    read_at: r.readAt,
    source: r.source ?? 'manual',
    updated_at: r.updatedAt,
  };
}

function fromRow(row: ReadingLogRow): RemoteReadingLog {
  return {
    userId: row.user_id,
    cycle: row.cycle,
    bookOrder: row.book_order,
    chapter: row.chapter,
    read: row.read,
    readAt: row.read_at,
    updatedAt: row.updated_at,
    source: row.source,
  };
}

export function createSupabaseRemote(): RemoteApi {
  return {
    async pushReadingLogs(rows: RemoteReadingLog[]): Promise<void> {
      if (rows.length === 0) return;
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('brt_reading_log')
        .upsert(rows.map(toRow), { onConflict: 'user_id,cycle,book_order,chapter' });
      if (error) throw new Error(`pushReadingLogs failed: ${error.message}`);
    },

    async pullReadingLogs(userId: string, since: string | null): Promise<RemoteReadingLog[]> {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');
      let query = supabase.from('brt_reading_log').select('*').eq('user_id', userId);
      if (since !== null) query = query.gt('updated_at', since);
      const { data, error } = await query;
      if (error) throw new Error(`pullReadingLogs failed: ${error.message}`);
      return (data as ReadingLogRow[]).map(fromRow);
    },
  };
}
