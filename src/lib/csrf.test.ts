import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyCsrf } from './csrf';

describe('CSRF Validation Helper', () => {
  it('allows safe methods (GET, HEAD, OPTIONS) without checking headers', () => {
    const reqGet = new Request('http://localhost:3000/api/some-endpoint', { method: 'GET' });
    const reqHead = new Request('http://localhost:3000/api/some-endpoint', { method: 'HEAD' });
    const reqOptions = new Request('http://localhost:3000/api/some-endpoint', { method: 'OPTIONS' });

    expect(verifyCsrf(reqGet)).toBe(true);
    expect(verifyCsrf(reqHead)).toBe(true);
    expect(verifyCsrf(reqOptions)).toBe(true);
  });

  it('blocks state-changing requests if Host header is missing', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {}
    });
    // Next.js Request or native Request will usually have a host/URL, but if we strip the Host header:
    req.headers.delete('host');
    expect(verifyCsrf(req)).toBe(false);
  });

  it('verifies match against Host header when Origin is present', () => {
    const reqValid = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000'
      }
    });
    expect(verifyCsrf(reqValid)).toBe(true);

    const reqInvalid = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://malicious.com'
      }
    });
    expect(verifyCsrf(reqInvalid)).toBe(false);
  });

  it('verifies match against Host header when Referer is present (Origin missing)', () => {
    const reqValid = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        referer: 'http://localhost:3000/some-page'
      }
    });
    expect(verifyCsrf(reqValid)).toBe(true);

    const reqInvalid = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        referer: 'http://malicious.com/exploit'
      }
    });
    expect(verifyCsrf(reqInvalid)).toBe(false);
  });

  it('blocks state-changing requests if both Origin and Referer are missing', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000'
      }
    });
    expect(verifyCsrf(req)).toBe(false);
  });

  it('uses x-forwarded-host when Host header is missing', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        'x-forwarded-host': 'my-netly-domain.com',
        origin: 'https://my-netly-domain.com'
      }
    });
    req.headers.delete('host');
    expect(verifyCsrf(req)).toBe(true);
  });

  it('gives x-forwarded-host priority over Host header when both are present', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'internal-service:3000',
        'x-forwarded-host': 'my-netly-domain.com',
        origin: 'https://my-netly-domain.com'
      }
    });
    // x-forwarded-host wins, origin matches it → pass
    expect(verifyCsrf(req)).toBe(true);

    const reqMismatch = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'my-netly-domain.com',
        'x-forwarded-host': 'internal-service:3000',
        origin: 'https://my-netly-domain.com'
      }
    });
    // x-forwarded-host takes priority, origin does NOT match it → fail
    expect(verifyCsrf(reqMismatch)).toBe(false);
  });

  it('returns false when request is undefined', () => {
    expect(verifyCsrf(undefined)).toBe(false);
  });

  it('handles protocol-less Origin values', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'localhost:3000'
      }
    });
    expect(verifyCsrf(req)).toBe(true);
  });

  it('returns false when URL parsing throws an error', () => {
    const req = new Request('http://localhost:3000/api/some-endpoint', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://[::1'
      }
    });
    expect(verifyCsrf(req)).toBe(false);
  });

  it('allows state-changing requests if SKIP_CSRF is true', () => {
    const original = process.env.SKIP_CSRF;
    process.env.SKIP_CSRF = 'true';
    try {
      const req = new Request('http://localhost:3000/api/some-endpoint', {
        method: 'POST'
      });
      expect(verifyCsrf(req)).toBe(true);
    } finally {
      process.env.SKIP_CSRF = original;
    }
  });
});
