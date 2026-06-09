/**
 * Integration test database helper.
 *
 * Uses the DATABASE_URL env var which the integration vitest config sets to an
 * isolated SQLite file (prisma/test.db). This keeps integration tests
 * completely isolated from the development database.
 */
import { PrismaClient } from '@prisma/client';

let _testDb: PrismaClient | undefined;

export function getTestDb(): PrismaClient {
  if (!_testDb) {
    // If DATABASE_URL points to dev.db, or is empty, force test.db to prevent wiping development database
    const url = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dev.db')
      ? process.env.DATABASE_URL
      : 'file:./test.db';

    _testDb = new PrismaClient({
      datasources: {
        db: {
          url,
        },
      },
    });
  }
  return _testDb;
}

/**
 * Wipes all rows from every table in dependency order so each test suite
 * starts from a known-empty state. Call in beforeEach / afterEach.
 */
export async function clearTestDb(): Promise<void> {
  const db = getTestDb();
  await db.$transaction([
    db.categoryRule.deleteMany(),
    db.transaction.deleteMany(),
    db.category.deleteMany(),
    db.account.deleteMany(),
  ]);
}

/**
 * Disconnects the Prisma client after all tests in a suite complete.
 * Call in afterAll.
 */
export async function disconnectTestDb(): Promise<void> {
  if (_testDb) {
    await _testDb.$disconnect();
    _testDb = undefined;
  }
}
