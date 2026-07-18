export function isInboxReadCursorAdvance(
  currentLastReadAt: Date | null,
  observedMessageAt: Date,
): boolean {
  return (
    currentLastReadAt === null ||
    observedMessageAt.getTime() > currentLastReadAt.getTime()
  );
}
