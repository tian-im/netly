import { describe, it, expect } from 'vitest';
import { getWebAuthnConfig } from './webauthn';

describe('webauthn', () => {
  describe('getWebAuthnConfig', () => {
    it('extracts origin and rpID from request', () => {
      const request = new Request('https://example.com', {
        headers: { origin: 'https://example.com' },
      });
      const config = getWebAuthnConfig(request);
      expect(config.origin).toBe('https://example.com');
      expect(config.rpID).toBe('example.com');
      expect(config.rpName).toBe('Netly Ledger');
    });

    it('falls back to localhost when no origin header', () => {
      const request = new Request('http://localhost:3000');
      const config = getWebAuthnConfig(request);
      expect(config.origin).toBe('http://localhost:3000');
      expect(config.rpID).toBe('localhost');
    });

    it('uses environment variables when set', () => {
      const originalOrigin = process.env.NEXT_PUBLIC_ORIGIN;
      const originalRpID = process.env.NEXT_PUBLIC_RPID;
      process.env.NEXT_PUBLIC_ORIGIN = 'https://myapp.com';
      process.env.NEXT_PUBLIC_RPID = 'myapp.com';

      const request = new Request('http://localhost:3000');
      const config = getWebAuthnConfig(request);
      expect(config.origin).toBe('https://myapp.com');
      expect(config.rpID).toBe('myapp.com');

      process.env.NEXT_PUBLIC_ORIGIN = originalOrigin;
      process.env.NEXT_PUBLIC_RPID = originalRpID;
    });
  });
});
