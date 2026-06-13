import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuditLogCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      create: (...args: any[]) => mockAuditLogCreate(...args),
    },
  },
}));

import { auditLog } from './audit';

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists an audit log entry to the database', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: '1', action: 'LOGIN_SUCCESS', details: 'test', createdAt: new Date() });

    await auditLog('LOGIN_SUCCESS', 'test');

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: { action: 'LOGIN_SUCCESS', details: 'test' },
    });
  });

  it('handles errors gracefully without throwing', async () => {
    mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

    // Should not throw
    await expect(auditLog('LOGIN_FAILURE', 'should-not-crash')).resolves.toBeUndefined();
  });

  it('works with empty details', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: '2', action: 'LOGOUT', details: '', createdAt: new Date() });

    await auditLog('LOGOUT');

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: { action: 'LOGOUT', details: '' },
    });
  });
});
