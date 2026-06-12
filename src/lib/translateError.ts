/**
 * Maps server-action error codes (thrown as Error messages) to i18n keys
 * in the `errors` namespace. Pass the result to t() from the errors namespace.
 *
 * Usage:
 *   const tErr = useTranslations('errors');
 *   toast.error(tErr(translateError(err)));
 */

const KNOWN_ERROR_CODES = new Set([
  'ERR_ACCOUNT_NAME_REQUIRED',
  'ERR_ACCOUNT_NOT_FOUND',
  'ERR_INVALID_CURRENCY',
  'ERR_PATTERN_REQUIRED',
  'ERR_TRANSACTION_NOT_FOUND',
  'ERR_CATEGORY_NAME_REQUIRED',
  'ERR_CATEGORY_NAME_EXISTS',
  'ERR_CATEGORY_NOT_FOUND',
  'ERR_TRANSFER_CATEGORY_PROTECTED',
  'ERR_CHALLENGE_EXPIRED_OR_INVALID',
  'ERR_CREDENTIAL_NOT_FOUND',
  'ERR_REGISTRATION_VERIFICATION_FAILED',
  'ERR_AUTHENTICATION_VERIFICATION_FAILED',
  'ERR_CREDENTIAL_ALREADY_REGISTERED',
  'ERR_DEVICE_NAME_REQUIRED',
  'ERR_CANNOT_REMOVE_LAST_PASSKEY',
  'ERR_NO_CREDENTIALS_REGISTERED',
  'ERR_SETUP_TOKEN_EXPIRED_OR_INVALID',
  'ERR_UNAUTHORIZED',
  'ERR_MCP_NAME_REQUIRED',
  'ERR_MCP_TOKEN_NOT_FOUND',
]);

export function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return KNOWN_ERROR_CODES.has(msg) ? msg : 'ERR_UNKNOWN';
}
