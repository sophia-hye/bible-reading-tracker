// Test-only in-memory RemoteApi simulating a server with last-write-wins.
// Shared across multiple local drivers to emulate multi-device sync.

import { RemoteReadingLog } from '../../db/readingRepo';
import { RemoteApi } from '../remote';

function key(r: RemoteReadingLog): string {
  return `${r.userId}:${r.cycle}:${r.bookOrder}:${r.chapter}`;
}

export function createFakeRemote(): RemoteApi & {
  seed(rows: RemoteReadingLog[]): void;
  rows(): RemoteReadingLog[];
} {
  const store = new Map<string, RemoteReadingLog>();

  const apply = (r: RemoteReadingLog): void => {
    const existing = store.get(key(r));
    // server-side last-write-wins (tiebreak: read=true wins)
    if (
      !existing ||
      r.updatedAt > existing.updatedAt ||
      (r.updatedAt === existing.updatedAt && r.read && !existing.read)
    ) {
      store.set(key(r), { ...r });
    }
  };

  return {
    async pushReadingLogs(rows: RemoteReadingLog[]): Promise<void> {
      rows.forEach(apply);
    },
    async pullReadingLogs(userId: string, since: string | null): Promise<RemoteReadingLog[]> {
      return [...store.values()]
        .filter((r) => r.userId === userId && (since === null || r.updatedAt > since))
        .map((r) => ({ ...r }));
    },
    seed(rows: RemoteReadingLog[]): void {
      rows.forEach(apply);
    },
    rows(): RemoteReadingLog[] {
      return [...store.values()].map((r) => ({ ...r }));
    },
  };
}
