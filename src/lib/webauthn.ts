export function getWebAuthnConfig(request: Request) {
  const origin = process.env.NEXT_PUBLIC_ORIGIN || request.headers.get('origin') || 'http://localhost:3000';
  const rpID = process.env.NEXT_PUBLIC_RPID || new URL(origin).hostname;
  return { origin, rpID, rpName: 'Netly Ledger' };
}
