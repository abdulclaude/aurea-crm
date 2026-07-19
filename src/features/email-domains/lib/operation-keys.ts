export function buildEmailDomainCreateIdempotencyKey(
  emailDomainId: string,
): string {
  return `resend-domain:create:${emailDomainId}`;
}
