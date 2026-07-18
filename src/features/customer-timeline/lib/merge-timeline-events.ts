import type {
  CustomerTimelineCursor,
  CustomerTimelineEvent,
  CustomerTimelinePage,
} from "@/features/customer-timeline/contracts";

function compareEvents(
  left: CustomerTimelineEvent,
  right: CustomerTimelineEvent,
): number {
  const timeDifference = right.occurredAt.getTime() - left.occurredAt.getTime();
  return timeDifference !== 0
    ? timeDifference
    : right.id.localeCompare(left.id);
}

function isBeforeCursor(
  event: CustomerTimelineEvent,
  cursor: CustomerTimelineCursor,
): boolean {
  const eventTime = event.occurredAt.getTime();
  const cursorTime = cursor.at.getTime();
  return (
    eventTime < cursorTime || (eventTime === cursorTime && event.id < cursor.id)
  );
}

export function mergeTimelineEvents(input: {
  sources: CustomerTimelineEvent[][];
  limit: number;
  cursor?: CustomerTimelineCursor;
}): CustomerTimelinePage {
  const unique = new Map<string, CustomerTimelineEvent>();
  for (const event of input.sources.flat()) {
    if (!input.cursor || isBeforeCursor(event, input.cursor)) {
      unique.set(event.id, event);
    }
  }
  const sorted = [...unique.values()].sort(compareEvents);
  const items = sorted.slice(0, input.limit);
  const hasMore = sorted.length > input.limit;
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? { at: last.occurredAt, id: last.id } : null,
  };
}
