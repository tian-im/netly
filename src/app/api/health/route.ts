import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health check endpoint.
 * Returns 200 OK with server status and database connectivity.
 */
export async function GET() {
  try {
    // Verify database connectivity with a lightweight query
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}
