const encoder = new TextEncoder();
const SECRET = process.env.SESSION_SECRET || 'netly-dev-secret-change-in-production';

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBuffer(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export interface SessionPayload {
  token: string;
  exp: number;
}

export async function createSessionCookie(): Promise<string> {
  const token = crypto.randomUUID();
  const payload: SessionPayload = { token, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const json = JSON.stringify(payload);
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(json));
  const payloadBase64 = bufferToBase64(encoder.encode(json));
  const sigBase64 = bufferToBase64(sig);
  return `${payloadBase64}.${sigBase64}`;
}

export async function verifySessionCookie(cookieValue: string): Promise<string | null> {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, sigBase64] = parts;

  try {
    const key = await getKey();
    const sigBuffer = base64ToBuffer(sigBase64);
    const payloadBuffer = base64ToBuffer(payloadBase64);
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer as any, payloadBuffer as any);
    if (!valid) return null;

    const json = new TextDecoder().decode(payloadBuffer);
    const payload: SessionPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;

    return payload.token;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'netly_session';
export const SETUP_SESSION_COOKIE_NAME = 'netly_setup_session';

export async function createSetupSessionCookie(): Promise<string> {
  const token = crypto.randomUUID();
  const payload: SessionPayload = { token, exp: Date.now() + 15 * 60 * 1000 };
  const json = JSON.stringify(payload);
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(json));
  const payloadBase64 = bufferToBase64(encoder.encode(json));
  const sigBase64 = bufferToBase64(sig);
  return `${payloadBase64}.${sigBase64}`;
}
