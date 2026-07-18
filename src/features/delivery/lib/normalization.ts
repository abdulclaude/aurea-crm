import { z } from "zod";

import type { DeliveryChannel } from "@/features/delivery/contracts";

const normalizedEmailSchema = z.string().email();
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const PHONE_FORMATTING_PATTERN = /^\+[0-9().\-\s]+$/;

export class InvalidDeliveryDestinationError extends Error {
  constructor(
    readonly channel: DeliveryChannel,
    readonly destination: string,
  ) {
    super(`Invalid ${channel.toLowerCase()} delivery destination`);
    this.name = "InvalidDeliveryDestinationError";
  }
}

export function normalizeEmailDestination(destination: string): string {
  const normalized = destination.trim().toLowerCase();
  if (!normalizedEmailSchema.safeParse(normalized).success) {
    throw new InvalidDeliveryDestinationError("EMAIL", destination);
  }

  return normalized;
}

export function normalizePhoneDestination(destination: string): string {
  const trimmed = destination.trim();
  if (!PHONE_FORMATTING_PATTERN.test(trimmed)) {
    throw new InvalidDeliveryDestinationError("SMS", destination);
  }

  const normalized = `+${trimmed.slice(1).replace(/[().\-\s]/g, "")}`;
  if (!E164_PATTERN.test(normalized)) {
    throw new InvalidDeliveryDestinationError("SMS", destination);
  }

  return normalized;
}

export function normalizeAppDestination(destination: string): string {
  const normalized = destination.trim();
  if (normalized.length === 0) {
    throw new InvalidDeliveryDestinationError("APP", destination);
  }

  return normalized;
}

export function normalizeDeliveryDestination(
  channel: DeliveryChannel,
  destination: string,
): string {
  switch (channel) {
    case "EMAIL":
      return normalizeEmailDestination(destination);
    case "SMS":
      return normalizePhoneDestination(destination);
    case "APP":
      return normalizeAppDestination(destination);
  }
}
