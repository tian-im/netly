import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp, checkPayloadSize } from './request-utils';

describe('Request Utilities', () => {
  const originalEnv = process.env.TRUST_PROXY;

  afterEach(() => {
    process.env.TRUST_PROXY = originalEnv;
  });

  describe('getClientIp', () => {
    it('uses request.ip when TRUST_PROXY is not set', () => {
      // Mock NextRequest with request.ip
      const req = new NextRequest('http://localhost:3000/api', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
          'x-real-ip': '203.0.113.196'
        }
      });
      // We manually define request.ip properties for NextRequest mock because NextRequest constructor doesn't set request.ip directly.
      Object.defineProperty(req, 'ip', { value: '192.0.2.1', writable: true });
      process.env.TRUST_PROXY = 'false';

      expect(getClientIp(req)).toBe('192.0.2.1');
    });

    it('defaults to 127.0.0.1 when request.ip and TRUST_PROXY are not set', () => {
      const req = new NextRequest('http://localhost:3000/api');
      process.env.TRUST_PROXY = 'false';

      expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('returns 127.0.0.1 when request is undefined', () => {
      expect(getClientIp(undefined)).toBe('127.0.0.1');
    });

    it('uses first IP in x-forwarded-for when TRUST_PROXY is true', () => {
      const req = new NextRequest('http://localhost:3000/api', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 198.51.100.10, 192.0.2.1'
        }
      });
      process.env.TRUST_PROXY = 'true';

      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('uses x-real-ip when x-forwarded-for is missing and TRUST_PROXY is true', () => {
      const req = new NextRequest('http://localhost:3000/api', {
        headers: {
          'x-real-ip': '203.0.113.196'
        }
      });
      process.env.TRUST_PROXY = 'true';

      expect(getClientIp(req)).toBe('203.0.113.196');
    });

    it('falls back to request.ip when proxy headers are missing and TRUST_PROXY is true', () => {
      const req = new NextRequest('http://localhost:3000/api');
      Object.defineProperty(req, 'ip', { value: '192.0.2.1', writable: true });
      process.env.TRUST_PROXY = 'true';

      expect(getClientIp(req)).toBe('192.0.2.1');
    });
  });

  describe('checkPayloadSize', () => {
    it('returns true when content-length is within limits', () => {
      const req = new Request('http://localhost:3000/api', {
        method: 'POST',
        headers: {
          'content-length': '500'
        }
      });
      expect(checkPayloadSize(req, 1000)).toBe(true);
    });

    it('returns false when content-length exceeds limits', () => {
      const req = new Request('http://localhost:3000/api', {
        method: 'POST',
        headers: {
          'content-length': '1500'
        }
      });
      expect(checkPayloadSize(req, 1000)).toBe(false);
    });

    it('returns false when content-length is missing on a POST request', () => {
      const req = new Request('http://localhost:3000/api', {
        method: 'POST'
      });
      expect(checkPayloadSize(req, 1000)).toBe(false);
    });

    it('returns true when content-length is missing on a POST request but SKIP_PAYLOAD_CHECK is true', () => {
      const original = process.env.SKIP_PAYLOAD_CHECK;
      process.env.SKIP_PAYLOAD_CHECK = 'true';
      try {
        const req = new Request('http://localhost:3000/api', {
          method: 'POST'
        });
        expect(checkPayloadSize(req, 1000)).toBe(true);
      } finally {
        process.env.SKIP_PAYLOAD_CHECK = original;
      }
    });

    it('returns true when content-length is missing on a GET request', () => {
      const req = new Request('http://localhost:3000/api', {
        method: 'GET'
      });
      expect(checkPayloadSize(req, 1000)).toBe(true);
    });

    it('returns false when content-length is invalid', () => {
      const req = new Request('http://localhost:3000/api', {
        method: 'POST',
        headers: {
          'content-length': 'not-a-number'
        }
      });
      expect(checkPayloadSize(req, 1000)).toBe(false);
    });
  });
});
