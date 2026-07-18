export type OutlookTriggerSenderInput = {
  sender?: string | null;
  from?: string | null;
};

export function resolveOutlookTriggerSender(
  input: OutlookTriggerSenderInput,
): string | undefined {
  const sender = input.sender?.trim() || input.from?.trim();
  return sender || undefined;
}
