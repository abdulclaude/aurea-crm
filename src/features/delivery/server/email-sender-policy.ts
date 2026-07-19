export type ApprovedEmailSender = {
  email: string;
  displayName: string;
  replyTo: string | null;
  isDefault: boolean;
  isDisabled: boolean;
  removedAt: Date | null;
};

export function selectApprovedEmailSender<T extends ApprovedEmailSender>(
  senders: readonly T[],
  requestedEmail: string | null,
): T | null {
  const active = senders.filter(
    (sender) => !sender.isDisabled && sender.removedAt === null,
  );
  if (requestedEmail) {
    const normalized = requestedEmail.trim().toLowerCase();
    return (
      active.find((sender) => sender.email.toLowerCase() === normalized) ?? null
    );
  }
  return active.find((sender) => sender.isDefault) ?? null;
}
