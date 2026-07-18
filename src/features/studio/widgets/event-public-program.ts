import type { EventWidgetConfig } from "@/features/studio/widgets/contracts";
import { parsePublicMediaUrl } from "@/features/studio/widgets/public-media-url";

type EventOccurrenceInput = {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  instructorName: string | null;
  location: string | null;
  roomName: string | null;
  isVirtual: boolean;
  updatedAt: Date;
};

type EventProgramInput = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  format: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  defaultLocation: string | null;
  durationMinutes: number;
  price: string | null;
  currency: string;
  updatedAt: Date;
  occurrences: EventOccurrenceInput[];
};

export function toPublicEventProgram(
  program: EventProgramInput,
  config: EventWidgetConfig,
) {
  return {
    id: program.id,
    name: program.name.slice(0, 160),
    description: config.showDescription
      ? program.description?.slice(0, 2_000) ?? null
      : null,
    imageUrl: config.showImage ? safePublicImageUrl(program.imageUrl) : null,
    format: program.format,
    defaultLocation: config.showLocation
      ? program.defaultLocation?.slice(0, 240) ?? null
      : null,
    durationMinutes: program.durationMinutes,
    price: config.showPrice ? program.price : null,
    currency: program.currency.slice(0, 3).toUpperCase(),
    updatedAt: program.updatedAt.toISOString(),
    occurrences: program.occurrences
      .slice(0, config.occurrencesPerEvent)
      .map((occurrence) => ({
        id: occurrence.id,
        name: occurrence.name.slice(0, 160),
        startTime: occurrence.startTime.toISOString(),
        endTime: occurrence.endTime.toISOString(),
        instructorName: occurrence.instructorName?.slice(0, 160) ?? null,
        location: config.showLocation
          ? occurrence.location?.slice(0, 240) ?? null
          : null,
        roomName: config.showLocation
          ? occurrence.roomName?.slice(0, 160) ?? null
          : null,
        isVirtual: occurrence.isVirtual,
        updatedAt: occurrence.updatedAt.toISOString(),
      })),
  };
}

function safePublicImageUrl(value: string | null): string | null {
  return value ? parsePublicMediaUrl(value) : null;
}
