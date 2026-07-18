import type {
  OutboundDeliveryStatus,
  ProviderEventKind,
} from "@/features/delivery/contracts";

const DELIVERY_TRANSITIONS = {
  QUEUED: ["SENDING", "SUPPRESSED", "CANCELLED", "DEAD_LETTER"],
  SENDING: [
    "QUEUED",
    "ACCEPTED",
    "DELIVERED",
    "BOUNCED",
    "SUPPRESSED",
    "DEAD_LETTER",
    "UNKNOWN",
  ],
  ACCEPTED: ["DELIVERED", "BOUNCED", "SUPPRESSED", "DEAD_LETTER"],
  DELIVERED: [],
  BOUNCED: [],
  SUPPRESSED: ["QUEUED"],
  CANCELLED: [],
  DEAD_LETTER: ["QUEUED"],
  UNKNOWN: ["QUEUED", "ACCEPTED", "DELIVERED", "BOUNCED", "DEAD_LETTER"],
} as const satisfies Record<
  OutboundDeliveryStatus,
  readonly OutboundDeliveryStatus[]
>;

const EVENT_TARGET_STATUS = {
  SENT: "ACCEPTED",
  ACCEPTED: "ACCEPTED",
  DELIVERED: "DELIVERED",
  BOUNCED: "BOUNCED",
  DELAYED: null,
  OPENED: null,
  CLICKED: null,
  READ: null,
  COMPLAINED: null,
} as const satisfies Record<ProviderEventKind, OutboundDeliveryStatus | null>;

export class InvalidDeliveryStatusTransitionError extends Error {
  constructor(
    readonly currentStatus: OutboundDeliveryStatus,
    readonly requestedStatus: OutboundDeliveryStatus,
  ) {
    super(
      `Cannot transition outbound delivery from ${currentStatus} to ${requestedStatus}`,
    );
    this.name = "InvalidDeliveryStatusTransitionError";
  }
}

export function canTransitionDeliveryStatus(
  currentStatus: OutboundDeliveryStatus,
  requestedStatus: OutboundDeliveryStatus,
): boolean {
  return (
    currentStatus === requestedStatus ||
    DELIVERY_TRANSITIONS[currentStatus].some(
      (candidate) => candidate === requestedStatus,
    )
  );
}

export function transitionDeliveryStatus(
  currentStatus: OutboundDeliveryStatus,
  requestedStatus: OutboundDeliveryStatus,
): OutboundDeliveryStatus {
  if (!canTransitionDeliveryStatus(currentStatus, requestedStatus)) {
    throw new InvalidDeliveryStatusTransitionError(
      currentStatus,
      requestedStatus,
    );
  }

  return requestedStatus;
}

export type ProviderEventProjection = {
  status: OutboundDeliveryStatus;
  changed: boolean;
};

export function projectProviderEventStatus(
  currentStatus: OutboundDeliveryStatus,
  eventKind: ProviderEventKind,
): ProviderEventProjection {
  const targetStatus = EVENT_TARGET_STATUS[eventKind];

  if (
    targetStatus === null ||
    !canTransitionDeliveryStatus(currentStatus, targetStatus)
  ) {
    return { status: currentStatus, changed: false };
  }

  return {
    status: targetStatus,
    changed: targetStatus !== currentStatus,
  };
}
