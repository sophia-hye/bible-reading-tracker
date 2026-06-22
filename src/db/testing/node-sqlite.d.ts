// Minimal ambient typing for Node 24's experimental built-in node:sqlite,
// used only by the test driver. (@types/node may not yet ship these.)
declare module 'node:sqlite' {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
