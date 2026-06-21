import { NextRequest } from 'next/server';

/**
 * Securely retrieve the client's IP address.
 * 
 * If `TRUST_PROXY=true` is set, it reads the proxy headers X-Forwarded-For or X-Real-IP.
 * Otherwise, it defaults to Next.js's built-in socket IP (`request.ip`) to prevent client-side header spoofing.
 */
export function getClientIp(request?: NextRequest): string {
  if (!request) return '127.0.0.1';
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(',')[0].trim();
      if (firstIp) return firstIp;
    }

    const xRealIp = request.headers.get('x-real-ip');
    if (xRealIp) return xRealIp.trim();
  }

  return (request as any).ip || '127.0.0.1';
}

/**
 * Validate that the request payload does not exceed the specified maximum byte limit.
 * 
 * Returns true if valid, false if Content-Length exceeds the limit or is missing for state-changing requests.
 */
export function checkPayloadSize(request: Request | NextRequest, maxBytes: number): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (isNaN(size) || size > maxBytes) {
      return false;
    }
    return true;
  }

  // Reject missing Content-Length for state-changing requests that typically carry payloads
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && process.env.SKIP_PAYLOAD_CHECK !== 'true') {
    return false;
  }

  return true;
}
