/**
 * Cal.com API v2 client. Credentials are supplied by the tenant-scoped
 * credential resolver and are never added to request URLs.
 */

import { z } from "zod";

import { decrypt } from "./encryption";

const CAL_COM_API_BASE = "https://api.cal.com/v2";
const ERROR_BODY_LIMIT_BYTES = 2_048;
const ERROR_MESSAGE_LIMIT = 512;

const API_VERSIONS = {
  bookings: "2026-02-25",
  bookingList: "2026-05-01",
  eventTypes: "2024-06-14",
  schedules: "2024-06-11",
  slots: "2024-09-04",
} as const;

export type CalComSuccessResponse<T> = {
  status: "success";
  data: T;
};

export type CalComConfig = {
  apiKey: string;
  baseUrl?: string;
};

export type CalComLocation = {
  type: string;
  address?: string;
  link?: string;
  displayLocationPublicly?: boolean;
};

export type CalComEventType = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number;
  locations?: CalComLocation[];
  hidden: boolean;
  position: number;
  teamId?: number;
  userId?: number;
  metadata?: Record<string, unknown>;
};

export type CreateEventTypeInput = {
  title: string;
  slug: string;
  description?: string;
  length: number;
  locations?: CalComLocation[];
  hidden?: boolean;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  slotInterval?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  scheduleId?: number;
  metadata?: Record<string, unknown>;
};

export type UpdateEventTypeInput = Partial<CreateEventTypeInput>;

export type CalComAttendee = {
  name: string;
  email: string;
  timeZone: string;
  language?: string;
  absent?: boolean;
};

export type CalComBooking = {
  id: number;
  uid: string;
  title: string;
  description?: string;
  status: string;
  start: string;
  end: string;
  duration: number;
  eventTypeId: number;
  eventType?: {
    id: number;
    slug: string;
  };
  attendees: CalComAttendee[];
  location?: string;
  metadata?: Record<string, unknown>;
  cancellationReason?: string;
  reschedulingReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingInput = {
  start: string;
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  timeZone?: string;
  language?: string;
  name?: string;
  email?: string;
  phone?: string;
  attendee?: {
    name: string;
    email: string;
    timeZone: string;
    language?: string;
    phoneNumber?: string;
  };
  guests?: string[];
  location?: CalComLocation | string;
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  lengthInMinutes?: number;
};

export type CalComSchedule = {
  id: number;
  name: string;
  timeZone: string;
  availability: CalComAvailability[];
};

export type CalComAvailability = {
  days: number[];
  startTime: string;
  endTime: string;
};

export type CalComWebhookTrigger =
  | "BOOKING_CREATED"
  | "BOOKING_PAYMENT_INITIATED"
  | "BOOKING_PAID"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_REQUESTED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REJECTED"
  | "BOOKING_NO_SHOW_UPDATED"
  | "FORM_SUBMITTED"
  | "MEETING_ENDED"
  | "MEETING_STARTED"
  | "RECORDING_READY"
  | "INSTANT_MEETING"
  | "INSTANT_MEETING_ACCEPTED"
  | "RECORDING_TRANSCRIPTION_GENERATED"
  | "OOO_CREATED"
  | "AFTER_HOSTS_CAL_VIDEO_NO_SHOW"
  | "AFTER_GUESTS_CAL_VIDEO_NO_SHOW"
  | "FORM_SUBMITTED_NO_EVENT"
  | "ROUTING_FORM_FALLBACK_HIT"
  | "DELEGATION_CREDENTIAL_ERROR"
  | "WRONG_ASSIGNMENT_REPORT"
  | "DELEGATION_CREDENTIAL_SECRET_ROTATION_FAILED"
  | "DELEGATION_CREDENTIAL_ROTATION_REQUIRED"
  | "DELEGATION_CREDENTIAL_SECRET_ROTATED"
  | "CALENDAR_ENTRY_REJECTED";

export type CreateCalComWebhookInput = {
  subscriberUrl: string;
  triggers: readonly CalComWebhookTrigger[];
  secret: string;
};

export type UpdateCalComWebhookInput = {
  subscriberUrl?: string;
  triggers?: readonly CalComWebhookTrigger[];
  secret?: string;
  active?: boolean;
};

export type CalComWebhookResult = {
  id: string;
  active: boolean;
};

export class CalComApiError extends Error {
  readonly statusCode: number;
  readonly providerCode: string | null;

  constructor(input: {
    message: string;
    statusCode: number;
    providerCode?: string | null;
  }) {
    super(input.message);
    this.name = "CalComApiError";
    this.statusCode = input.statusCode;
    this.providerCode = input.providerCode ?? null;
  }
}

export class CalComInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalComInputError";
  }
}

const apiLocationSchema = z
  .object({
    type: z.string(),
    address: z.string().optional(),
    link: z.string().optional(),
    public: z.boolean().optional(),
  })
  .loose();

const apiEventTypeSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    lengthInMinutes: z.number(),
    locations: z.array(apiLocationSchema).optional(),
    hidden: z.boolean().optional(),
    position: z.number().optional(),
    teamId: z.number().optional(),
    ownerId: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

const apiAttendeeSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    timeZone: z.string(),
    language: z.string().nullable().optional(),
    absent: z.boolean().optional(),
  })
  .loose();

const apiBookingSchema = z
  .object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number(),
    eventType: z
      .object({ id: z.number(), slug: z.string() })
      .loose()
      .optional(),
    attendees: z.array(apiAttendeeSchema),
    location: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    cancellationReason: z.string().nullable().optional(),
    reschedulingReason: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

const apiScheduleSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    timeZone: z.string(),
    availability: z.array(
      z.object({
        days: z.array(z.union([z.string(), z.number()])),
        startTime: z.string(),
        endTime: z.string(),
      }),
    ),
  })
  .loose();

const apiUserSchema = z
  .object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    name: z.string(),
    timeZone: z.string(),
    weekStart: z.string(),
    timeFormat: z.number(),
  })
  .loose();

const apiWebhookSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    active: z.boolean(),
  })
  .loose();

const providerErrorSchema = z.object({
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  message: z.string().optional(),
});

function successSchema<T>(data: z.ZodType<T>): z.ZodType<CalComSuccessResponse<T>> {
  return z.object({ status: z.literal("success"), data });
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new CalComInputError("Cal.com base URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new CalComInputError("Cal.com base URL cannot include credentials or query data");
  }
  return url.toString().replace(/\/$/, "");
}

async function readBoundedErrorBody(response: Response): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (received < ERROR_BODY_LIMIT_BYTES) {
      const result = await reader.read();
      if (result.done) break;
      const remaining = ERROR_BODY_LIMIT_BYTES - received;
      const chunk = result.value.subarray(0, remaining);
      chunks.push(chunk);
      received += chunk.byteLength;
      if (result.value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function redactProviderText(value: string, apiKey: string): string {
  let redacted = value;
  if (apiKey) redacted = redacted.split(apiKey).join("[REDACTED]");
  return redacted
    .replace(/Bearer\s+[^\s"',}]+/gi, "Bearer [REDACTED]")
    .replace(/\bcal_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(
      /("(?:apiKey|api_key|authorization|secret|token)"\s*:\s*")[^"]+/gi,
      "$1[REDACTED]",
    )
    .slice(0, ERROR_MESSAGE_LIMIT);
}

function parseProviderError(body: string, apiKey: string): {
  code: string | null;
  message: string;
} {
  try {
    const value: unknown = JSON.parse(body);
    const parsed = providerErrorSchema.safeParse(value);
    if (parsed.success) {
      const message = parsed.data.error?.message ?? parsed.data.message;
      return {
        code: parsed.data.error?.code ?? null,
        message: message
          ? redactProviderText(message, apiKey)
          : "Cal.com rejected the request",
      };
    }
  } catch {
    // A truncated or non-JSON provider response is intentionally not exposed.
  }
  return { code: null, message: "Cal.com rejected the request" };
}

function normalizeLocation(location: CalComLocation): Record<string, unknown> {
  return {
    type: location.type,
    ...(location.address ? { address: location.address } : {}),
    ...(location.link ? { link: location.link } : {}),
    ...(location.displayLocationPublicly === undefined
      ? {}
      : { public: location.displayLocationPublicly }),
  };
}

function normalizeEventType(value: z.infer<typeof apiEventTypeSchema>): CalComEventType {
  return {
    id: value.id,
    title: value.title,
    slug: value.slug,
    description: value.description ?? undefined,
    length: value.lengthInMinutes,
    locations: value.locations?.map((location) => ({
      type: location.type,
      address: location.address,
      link: location.link,
      displayLocationPublicly: location.public,
    })),
    hidden: value.hidden ?? false,
    position: value.position ?? 0,
    teamId: value.teamId,
    userId: value.ownerId,
    metadata: value.metadata,
  };
}

function normalizeBooking(value: z.infer<typeof apiBookingSchema>): CalComBooking {
  return {
    id: value.id,
    uid: value.uid,
    title: value.title,
    description: value.description ?? undefined,
    status: value.status,
    start: value.start,
    end: value.end,
    duration: value.duration,
    eventTypeId: value.eventTypeId,
    eventType: value.eventType,
    attendees: value.attendees.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: attendee.language ?? undefined,
      absent: attendee.absent,
    })),
    location: value.location ?? undefined,
    metadata: value.metadata,
    cancellationReason: value.cancellationReason ?? undefined,
    reschedulingReason: value.reschedulingReason ?? undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function stringResponse(input: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function bookingFields(input: CreateBookingInput): Record<string, unknown> | undefined {
  const fields = { ...(input.responses ?? {}), ...(input.bookingFieldsResponses ?? {}) };
  delete fields.name;
  delete fields.email;
  delete fields.phone;
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function toV2BookingInput(input: CreateBookingInput): Record<string, unknown> {
  const customFields = bookingFields(input);
  const attendee = {
    name: input.attendee?.name ?? input.name ?? stringResponse(input.responses, "name"),
    email: input.attendee?.email ?? input.email ?? stringResponse(input.responses, "email"),
    timeZone: input.attendee?.timeZone ?? input.timeZone ?? "UTC",
    language: input.attendee?.language ?? input.language ?? "en",
    phoneNumber:
      input.attendee?.phoneNumber ?? input.phone ?? stringResponse(input.responses, "phone"),
  };

  if (!attendee.name || !attendee.email) {
    throw new CalComInputError("Cal.com v2 bookings require an attendee name and email");
  }

  const location =
    typeof input.location === "string"
      ? input.location.startsWith("http")
        ? { type: "link", link: input.location }
        : { type: "address", address: input.location }
      : input.location
        ? normalizeLocation(input.location)
        : undefined;

  return {
    start: input.start,
    attendee,
    ...(input.eventTypeId === undefined ? {} : { eventTypeId: input.eventTypeId }),
    ...(input.eventTypeSlug ? { eventTypeSlug: input.eventTypeSlug } : {}),
    ...(input.username ? { username: input.username } : {}),
    ...(input.guests ? { guests: input.guests } : {}),
    ...(location ? { location } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(customFields ? { bookingFieldsResponses: customFields } : {}),
    ...(input.lengthInMinutes === undefined
      ? {}
      : { lengthInMinutes: input.lengthInMinutes }),
  };
}

const weekDayNumber: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export class CalComClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CalComConfig) {
    this.apiKey = config.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? CAL_COM_API_BASE);
  }

  private async request<T>(input: {
    endpoint: string;
    schema: z.ZodType<T>;
    apiVersion?: string;
    init?: RequestInit;
  }): Promise<T> {
    if (!this.apiKey) throw new CalComInputError("Cal.com API key is missing");

    const headers = new Headers(input.init?.headers);
    if (input.init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (input.apiVersion) headers.set("cal-api-version", input.apiVersion);

    const response = await fetch(`${this.baseUrl}${input.endpoint}`, {
      ...input.init,
      headers,
    });

    if (!response.ok) {
      const body = await readBoundedErrorBody(response);
      const providerError = parseProviderError(body, this.apiKey);
      throw new CalComApiError({
        statusCode: response.status,
        providerCode: providerError.code,
        message: `Cal.com API error (${response.status}): ${providerError.message}`,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new CalComApiError({
        statusCode: 502,
        message: "Cal.com returned an invalid JSON response",
      });
    }

    const parsed = input.schema.safeParse(payload);
    if (!parsed.success) {
      throw new CalComApiError({
        statusCode: 502,
        message: "Cal.com returned an unexpected response shape",
      });
    }
    return parsed.data;
  }

  async getEventTypes(): Promise<CalComSuccessResponse<CalComEventType[]>> {
    const response = await this.request({
      endpoint: "/event-types",
      apiVersion: API_VERSIONS.eventTypes,
      schema: successSchema(z.array(apiEventTypeSchema)),
    });
    return { status: response.status, data: response.data.map(normalizeEventType) };
  }

  async getEventType(eventTypeId: number): Promise<CalComSuccessResponse<CalComEventType>> {
    const response = await this.request({
      endpoint: `/event-types/${eventTypeId}`,
      apiVersion: API_VERSIONS.eventTypes,
      schema: successSchema(apiEventTypeSchema),
    });
    return { status: response.status, data: normalizeEventType(response.data) };
  }

  async createEventType(data: CreateEventTypeInput): Promise<CalComSuccessResponse<CalComEventType>> {
    const response = await this.request({
      endpoint: "/event-types",
      apiVersion: API_VERSIONS.eventTypes,
      schema: successSchema(apiEventTypeSchema),
      init: {
        method: "POST",
        body: JSON.stringify({
          ...data,
          lengthInMinutes: data.length,
          locations: data.locations?.map(normalizeLocation),
          length: undefined,
        }),
      },
    });
    return { status: response.status, data: normalizeEventType(response.data) };
  }

  async updateEventType(
    eventTypeId: number,
    data: UpdateEventTypeInput,
  ): Promise<CalComSuccessResponse<CalComEventType>> {
    const response = await this.request({
      endpoint: `/event-types/${eventTypeId}`,
      apiVersion: API_VERSIONS.eventTypes,
      schema: successSchema(apiEventTypeSchema),
      init: {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          ...(data.length === undefined ? {} : { lengthInMinutes: data.length }),
          ...(data.locations ? { locations: data.locations.map(normalizeLocation) } : {}),
          length: undefined,
        }),
      },
    });
    return { status: response.status, data: normalizeEventType(response.data) };
  }

  async deleteEventType(eventTypeId: number): Promise<{ status: "success" }> {
    const response = await this.request({
      endpoint: `/event-types/${eventTypeId}`,
      apiVersion: API_VERSIONS.eventTypes,
      schema: successSchema(apiEventTypeSchema),
      init: { method: "DELETE" },
    });
    return { status: response.status };
  }

  async getBookings(params?: {
    status?: "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
    attendeeEmail?: string;
    eventTypeId?: number;
    afterStart?: string;
    beforeEnd?: string;
    take?: number;
    skip?: number;
    cursor?: string;
    limit?: number;
  }): Promise<
    CalComSuccessResponse<CalComBooking[]> & {
      pagination: { nextCursor: string | null; hasMore: boolean };
    }
  > {
    if (params?.skip) {
      throw new CalComInputError("Cal.com v2 uses cursor pagination and does not support skip");
    }
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries({
      status: params?.status,
      attendeeEmail: params?.attendeeEmail,
      eventTypeId: params?.eventTypeId,
      afterStart: params?.afterStart,
      beforeEnd: params?.beforeEnd,
      cursor: params?.cursor,
      limit: params?.limit ?? params?.take,
    })) {
      if (value !== undefined) queryParams.set(key, String(value));
    }
    const query = queryParams.toString();
    const response = await this.request({
      endpoint: query ? `/bookings?${query}` : "/bookings",
      apiVersion: API_VERSIONS.bookingList,
      schema: z.object({
        status: z.literal("success"),
        data: z.array(apiBookingSchema),
        pagination: z.object({
          nextCursor: z.string().nullable(),
          hasMore: z.boolean(),
        }),
      }),
    });
    return { ...response, data: response.data.map(normalizeBooking) };
  }

  async getBooking(bookingUid: string): Promise<CalComSuccessResponse<CalComBooking>> {
    const response = await this.request({
      endpoint: `/bookings/${encodeURIComponent(bookingUid)}`,
      apiVersion: API_VERSIONS.bookings,
      schema: successSchema(apiBookingSchema),
    });
    return { status: response.status, data: normalizeBooking(response.data) };
  }

  async createBooking(data: CreateBookingInput): Promise<CalComSuccessResponse<CalComBooking>> {
    const response = await this.request({
      endpoint: "/bookings",
      apiVersion: API_VERSIONS.bookings,
      schema: successSchema(apiBookingSchema),
      init: { method: "POST", body: JSON.stringify(toV2BookingInput(data)) },
    });
    return { status: response.status, data: normalizeBooking(response.data) };
  }

  async rescheduleBooking(
    bookingUid: string,
    data: { start: string; reschedulingReason?: string },
  ): Promise<CalComSuccessResponse<CalComBooking>> {
    const response = await this.request({
      endpoint: `/bookings/${encodeURIComponent(bookingUid)}/reschedule`,
      apiVersion: API_VERSIONS.bookings,
      schema: successSchema(apiBookingSchema),
      init: { method: "POST", body: JSON.stringify(data) },
    });
    return { status: response.status, data: normalizeBooking(response.data) };
  }

  async cancelBooking(bookingUid: string, reason?: string): Promise<{ status: "success" }> {
    const response = await this.request({
      endpoint: `/bookings/${encodeURIComponent(bookingUid)}/cancel`,
      apiVersion: API_VERSIONS.bookings,
      schema: successSchema(z.union([apiBookingSchema, z.array(apiBookingSchema)])),
      init: {
        method: "POST",
        body: JSON.stringify(reason ? { cancellationReason: reason } : {}),
      },
    });
    return { status: response.status };
  }

  async getSchedules(): Promise<CalComSuccessResponse<CalComSchedule[]>> {
    const response = await this.request({
      endpoint: "/schedules",
      apiVersion: API_VERSIONS.schedules,
      schema: successSchema(z.array(apiScheduleSchema)),
    });
    return {
      status: response.status,
      data: response.data.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        timeZone: schedule.timeZone,
        availability: schedule.availability.map((availability) => ({
          days: availability.days.map((day) =>
            typeof day === "number" ? day : (weekDayNumber[day] ?? -1),
          ),
          startTime: availability.startTime,
          endTime: availability.endTime,
        })),
      })),
    };
  }

  async getAvailableSlots(params: {
    eventTypeId?: number;
    eventTypeSlug?: string;
    username?: string;
    startTime: string;
    endTime: string;
    timeZone?: string;
  }): Promise<CalComSuccessResponse<{ slots: Record<string, { time: string }[]> }>> {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries({
      eventTypeId: params.eventTypeId,
      eventTypeSlug: params.eventTypeSlug,
      username: params.username,
      start: params.startTime,
      end: params.endTime,
      timeZone: params.timeZone,
    })) {
      if (value !== undefined) queryParams.set(key, String(value));
    }
    const response = await this.request({
      endpoint: `/slots?${queryParams.toString()}`,
      apiVersion: API_VERSIONS.slots,
      schema: successSchema(
        z.record(z.string(), z.array(z.object({ start: z.string() }).loose())),
      ),
    });
    return {
      status: response.status,
      data: {
        slots: Object.fromEntries(
          Object.entries(response.data).map(([date, slots]) => [
            date,
            slots.map((slot) => ({ time: slot.start })),
          ]),
        ),
      },
    };
  }

  async getMe(): Promise<CalComSuccessResponse<z.infer<typeof apiUserSchema>>> {
    return this.request({ endpoint: "/me", schema: successSchema(apiUserSchema) });
  }

  async getMeLegacy(): Promise<CalComSuccessResponse<z.infer<typeof apiUserSchema>>> {
    return this.getMe();
  }

  async createWebhook(data: CreateCalComWebhookInput): Promise<CalComWebhookResult> {
    const response = await this.request({
      endpoint: "/webhooks",
      schema: successSchema(apiWebhookSchema),
      init: {
        method: "POST",
        body: JSON.stringify({ ...data, active: true, version: "2021-10-20" }),
      },
    });
    return { id: String(response.data.id), active: response.data.active };
  }

  async updateWebhook(
    webhookId: string,
    data: UpdateCalComWebhookInput,
  ): Promise<CalComWebhookResult> {
    const response = await this.request({
      endpoint: `/webhooks/${encodeURIComponent(webhookId)}`,
      schema: successSchema(apiWebhookSchema),
      init: {
        method: "PATCH",
        body: JSON.stringify({ ...data, version: "2021-10-20" }),
      },
    });
    return { id: String(response.data.id), active: response.data.active };
  }

  async deleteWebhook(webhookId: string): Promise<CalComWebhookResult> {
    const response = await this.request({
      endpoint: `/webhooks/${encodeURIComponent(webhookId)}`,
      schema: successSchema(apiWebhookSchema),
      init: { method: "DELETE" },
    });
    return { id: String(response.data.id), active: response.data.active };
  }
}

export async function getCalComClient(encryptedApiKey: string): Promise<CalComClient> {
  const apiKey = decrypt(encryptedApiKey);
  return new CalComClient({ apiKey });
}

export function createCalComClient(apiKey: string): CalComClient {
  return new CalComClient({ apiKey });
}
