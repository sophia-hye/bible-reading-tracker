// Production SqliteDriver backed by expo-sqlite (on-device).
// Implements the same interface used by the (tested) core repository layer.

import * as SQLite from 'expo-sqlite';
import { SqliteDriver, SqlValue } from '../../src/db/driver';

export function createExpoSqliteDriver(
  databaseName = 'bible-tracker.db',
): SqliteDriver {
  const db = SQLite.openDatabaseSync(databaseName);
  return {
    exec(sql: string): void {
      db.execSync(sql);
    },
    run(sql: string, params: SqlValue[] = []): void {
      db.runSync(sql, params as SQLite.SQLiteBindValue[]);
    },
    all<T>(sql: string, params: SqlValue[] = []): T[] {
      return db.getAllSync<T>(sql, params as SQLite.SQLiteBindValue[]);
    },
    get<T>(sql: string, params: SqlValue[] = []): T | undefined {
      return db.getFirstSync<T>(sql, params as SQLite.SQLiteBindValue[]) ?? undefined;
    },
  };
}
