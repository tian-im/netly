import { NextRequest } from 'next/server';

/**
 * Verify CSRF protection for state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * Checks that the Origin or Referer header matches the expected host of the request.
 * Returns true if the request is safe, and false if CSRF check fails.
 */
export function verifyCsrf(request?: Request | NextRequest): boolean {
  // Allow bypassing CSRF checks in test/development environments if configured via env var
  if (process.env.SKIP_CSRF === 'true') {
    return true;
  }

  if (!request) {
    return false;
  }

  // Only protect state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  // WHY: When behind a reverse proxy (Docker + Traefik/Nginx), the `host`
  // header is often the internal container name (e.g. `netly-web:3000`)
  // while `x-forwarded-host` carries the external domain the user actually
  // visited. The Origin/Referer header from the browser matches the external
  // domain, so x-forwarded-host must take priority. This matches the de facto
  // standard for reverse-proxy setups, consistent with getClientIp's TRUST_PROXY
  // pattern in request-utils.ts.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

  if (!host) {
    return false;
  }

  // Helper to check host equality
  const hostMatches = (value: string): boolean => {
    try {
      // Handles both absolute URLs (from Origin/Referer) and host headers
      const url = value.startsWith('http://') || value.startsWith('https://')
        ? new URL(value)
        : new URL(`http://${value}`);
      
      // Compare host names (ignores protocol and handles port numbers)
      return url.host === host;
    } catch {
      return false;
    }
  };

  // If Origin header is present, it MUST match the Host
  if (origin) {
    return hostMatches(origin);
  }

  // If Origin is not present, Referer MUST match the Host
  if (referer) {
    return hostMatches(referer);
  }

  // Both Origin and Referer are missing for a state-changing request
  // This is highly suspicious (e.g., cross-origin requests from scripts can hide headers, or standard API calls)
  return false;
}
