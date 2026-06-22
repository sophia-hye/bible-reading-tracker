// On-device database singleton: opens expo-sqlite once and initializes the schema.

import { SqliteDriver } from '../../src/db/driver';
import { initSchema } from '../../src/db/schema';
import { createExpoSqliteDriver } from './expoSqliteDriver';

export const USER = 'local';

let driver: SqliteDriver | null = null;

export function getDriver(): SqliteDriver {
  if (!driver) {
    driver = createExpoSqliteDriver();
    initSchema(driver);
  }
  return driver;
}
