import { db } from '@/lib/db';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_CHALLENGE_EXPIRED'
  | 'LOGOUT'
  | 'REGISTER_CREDENTIAL'
  | 'DELETE_CREDENTIAL'
  | 'SETUP_TOKEN_GENERATED'
  | 'SETUP_TOKEN_CONSUMED'
  | 'SETUP_TOKEN_FAILED'
  | 'RATE_LIMITED'
  | 'CSRF_FAILURE';

/**
 * Record an audit log entry.
 *
 * Logs to console in development and persists to DB for querying.
 */
export async function auditLog(action: AuditAction, details: string = ''): Promise<void> {
  const entry = { action, details };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUDIT] ${action}${details ? ': ' + details : ''}`);
  }

  // True fire-and-forget — do not block the response on DB writes.
  // If your DB is busy, the user's request should not be delayed by audit logging.
  db.auditLog.create({ data: entry }).catch(() => {
    // Silently fail — audit logging should never break the main flow
  });
}
