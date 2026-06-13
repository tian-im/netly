import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    // Log queries in development for debugging
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Enable SQLite WAL mode for better concurrent read performance
  // WAL mode allows concurrent reads during writes, which is beneficial
  // for the local web UI reading reports while imports are running.
  client.$executeRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {
    // Non-critical: WAL mode is a performance optimization, not a requirement
  });

  // Set a busy timeout so concurrent operations retry instead of failing
  client.$executeRawUnsafe('PRAGMA busy_timeout=5000').catch(() => {
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
