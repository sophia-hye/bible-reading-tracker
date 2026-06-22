// Test-only SqliteDriver backed by Node 24's built-in node:sqlite (in-memory).
// NOT imported by the app — production uses an expo-sqlite driver.

import { DatabaseSync } from 'node:sqlite';
import { SqliteDriver, SqlValue } from '../driver';

export function createNodeSqliteDriver(path = ':memory:'): SqliteDriver & { close(): void } {
  const db = new DatabaseSync(path);
  return {
    exec(sql: string): void {
      db.exec(sql);
    },
    run(sql: string, params: SqlValue[] = []): void {
      db.prepare(sql).run(...params);
    },
    all<T>(sql: string, params: SqlValue[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },
    get<T>(sql: string, params: SqlValue[] = []): T | undefined {
      return (db.prepare(sql).get(...params) as T | undefined) ?? undefined;
    },
    close(): void {
      db.close();
    },
  };
}
