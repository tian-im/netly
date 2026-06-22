import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    // Log queries in development for debugging
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // WARNING: Never accept user input or dynamic variables in $queryRawUnsafe.
  // These PRAGMA statements are safe because they use static, hardcoded strings.
  // WHY: Use $queryRawUnsafe instead of $executeRawUnsafe because SQLite PRAGMA
  // statements can return results (e.g. PRAGMA journal_mode returns the new mode).
  // $executeRawUnsafe logs a prisma:error when results are returned. The .catch()
  // suppresses the thrown error at runtime, but the log noise is undesirable.
  // Enable SQLite WAL mode for better concurrent read performance
  // WAL mode allows concurrent reads during writes, which is beneficial
  // for the local web UI reading reports while imports are running.
  client.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {
    // Non-critical: WAL mode is a performance optimization, not a requirement
  });

  // Set a busy timeout so concurrent operations retry instead of failing
  client.$queryRawUnsafe('PRAGMA busy_timeout=5000').catch(() => {
    // Non-critical
  });

  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = db;
}
