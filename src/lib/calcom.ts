/**
 * Cal.com API Client
 * Handles interactions with Cal.com API v2 for booking management
 */

import { decrypt } from "./encryption";

const CAL_COM_API_BASE = "https://api.cal.com/v1";

export interface CalComConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Cal.com API Client
 */
export class CalComClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CalComConfig) {
    this.apiKey = config.apiKey.trim();
    this.baseUrl = config.baseUrl || CAL_COM_API_BASE;
  }

  /**
   * Make authenticated request to Cal.com API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const hasQuery = endpoint.includes("?");
    const url = `${this.baseUrl}${endpoint}${hasQuery ? "&" : "?"}apiKey=${encodeURIComponent(this.apiKey)}`;
    if (!this.apiKey) {
      throw new Error("Cal.com API key is missing");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "x-cal-api-key": this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cal.com API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  // ========================================
  // Event Types
  // ========================================

  /**
   * Get all event types
   */
  async getEventTypes() {
    return this.request<{
      status: string;
      data: CalComEventType[];
    }>("/event-types");
  }

  /**
   * Get a specific event type
   */
  async getEventType(eventTypeId: number) {
    return this.request<{
      status: string;
      data: CalComEventType;
    }>(`/event-types/${eventTypeId}`);
  }

  /**
   * Create an event type
   */
  async createEventType(data: CreateEventTypeInput) {
    return this.request<{
      status: string;
      data: CalComEventType;
    }>("/event-types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an event type
   */
  async updateEventType(eventTypeId: number, data: UpdateEventTypeInput) {
    return this.request<{
      status: string;
      data: CalComEventType;
    }>(`/event-types/${eventTypeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an event type
   */
  async deleteEventType(eventTypeId: number) {
    return this.request<{
      status: string;
    }>(`/event-types/${eventTypeId}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // Bookings
  // ========================================

  /**
   * Get all bookings
   */
  async getBookings(params?: {
    status?: string;
    attendeeEmail?: string;
    eventTypeId?: number;
    afterStart?: string;
    beforeEnd?: string;
    take?: number;
    skip?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = query ? `/bookings?${query}` : "/bookings";

    return this.request<{
      status: string;
      data: CalComBooking[];
    }>(endpoint);
  }

  /**
   * Get a specific booking
   */
  async getBooking(bookingUid: string) {
    return this.request<{
      status: string;
      data: CalComBooking;
    }>(`/bookings/${bookingUid}`);
  }

  /**
   * Create a booking
   */
  async createBooking(data: CreateBookingInput) {
    return this.request<{
      status: string;
      data: CalComBooking;
    }>("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(bookingUid: string, data: { start: string; reschedulingReason?: string }) {
    return this.request<{
      status: string;
      data: CalComBooking;
    }>(`/bookings/${bookingUid}/reschedule`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingUid: string, reason?: string) {
    return this.request<{
      status: string;
    }>(`/bookings/${bookingUid}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason: reason }),
    });
  }

  // ========================================
  // Schedules
  // ========================================

  /**
   * Get all schedules
   */
  async getSchedules() {
    return this.request<{
      status: string;
      data: CalComSchedule[];
    }>("/schedules");
  }

  /**
   * Get available time slots for an event type
   */
  async getAvailableSlots(params: {
    eventTypeId?: number;
    eventTypeSlug?: string;
    username?: string;
    startTime: string;
    endTime: string;
    timeZone?: string;
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return this.request<{
      status: string;
      data: {
        slots: Record<string, { time: string }[]>;
      };
    }>(`/slots?${queryParams.toString()}`);
  }

  // ========================================
  // Me (User Info)
  // ========================================

  /**
   * Get current user profile
   */
  async getMe() {
    const parseResponse = async (endpoint: string) =>
      this.request<{
        status?: string;
        data?: {
          id: number;
          username: string;
          name: string;
          email: string;
          timeZone: string;
          weekStart: string;
          timeFormat: number;
        };
        user?: {
          id: number;
          username: string;
          name: string;
          email: string;
          timeZone: string;
          weekStart: string;
          timeFormat: number;
        };
        id?: number;
        username?: string;
        name?: string;
        email?: string;
        timeZone?: string;
        weekStart?: string;
        timeFormat?: number;
      }>(endpoint);

    const hasUserData = (payload: {
      data?: { id?: number };
      user?: { id?: number };
      id?: number;
    }) => Boolean(payload.data?.id || payload.user?.id || payload.id);

    try {
      const primary = await parseResponse("/me");
      if (hasUserData(primary)) return primary;
    } catch {
      // fall through to fallback
    }

    return parseResponse("/users/me");
  }

  /**
   * Get current user profile (legacy response shape)
   */
  async getMeLegacy() {
    return this.request<{
      status?: string;
      data?: {
        id: number;
        username: string;
        name: string;
        email: string;
        timeZone: string;
        weekStart: string;
        timeFormat: number;
      };
      user?: {
        id: number;
        username: string;
        name: string;
        email: string;
        timeZone: string;
        weekStart: string;
        timeFormat: number;
      };
      id?: number;
      username?: string;
      name?: string;
      email?: string;
      timeZone?: string;
      weekStart?: string;
      timeFormat?: number;
    }>("/me");
  }
}

/**
 * Get Cal.com client from encrypted credential
 */
export async function getCalComClient(
  encryptedApiKey: string
): Promise<CalComClient> {
  const apiKey = decrypt(encryptedApiKey);
  return new CalComClient({ apiKey });
}

/**
 * Get Cal.com client with plain API key
 */
export function createCalComClient(apiKey: string): CalComClient {
  return new CalComClient({ apiKey });
}

// ========================================
// Type Definitions
// ========================================

export interface CalComEventType {
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
}

export interface CalComLocation {
  type: string;
  address?: string;
  link?: string;
  displayLocationPublicly?: boolean;
}

export interface CreateEventTypeInput {
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
}

export interface UpdateEventTypeInput {
  title?: string;
  slug?: string;
  description?: string;
  length?: number;
  locations?: CalComLocation[];
  hidden?: boolean;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  slotInterval?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  scheduleId?: number;
  metadata?: Record<string, unknown>;
}

export interface CalComBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  status: "accepted" | "pending" | "cancelled" | "rejected";
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
}

export interface CalComAttendee {
  name: string;
  email: string;
  timeZone: string;
  language?: string;
  absent?: boolean;
}

export interface CreateBookingInput {
  start: string; // ISO 8601 in UTC
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
  };
  guests?: string[];
  location?: CalComLocation | string;
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  lengthInMinutes?: number;
}

export interface CalComSchedule {
  id: number;
  name: string;
  timeZone: string;
  availability: CalComAvailability[];
}

export interface CalComAvailability {
  days: number[];
  startTime: string;
  endTime: string;
}
