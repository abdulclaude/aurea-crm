/**
 * TikTok Events API Implementation
 * 
 * Sends server-side conversion events to TikTok for:
 * - iOS 14.5+ attribution (bypasses ATT opt-out)
 * - Ad blocker bypass
 * - Improved conversion measurement accuracy
 * 
 * Docs: https://business-api.tiktok.com/portal/docs?id=1771100865818625
 * Events API: https://business-api.tiktok.com/portal/docs?id=1771101204239362
 */

import crypto from 'crypto';

export interface TikTokEvent {
  // Event details
  event: string;  // 'CompletePayment', 'SubmitForm', 'ViewContent', 'AddToCart', etc.
  eventId?: string;  // Unique event ID (for deduplication)
  timestamp?: string;  // ISO 8601 timestamp or Unix timestamp
  
  // Page info
  pageUrl?: string;
  referrerUrl?: string;
  
  // User info (for matching)
  email?: string;
  phone?: string;
  
  // External IDs
  externalId?: string;  // Your user ID
  
  // TikTok Click ID
  ttclid?: string;  // TikTok Click ID from URL parameter
  
  // Browser data
  userAgent?: string;
  ipAddress?: string;
  ttp?: string;  // _ttp cookie (TikTok Pixel cookie)
  
  // Event properties
  value?: number;
  currency?: string;
  contentType?: string;
  contentId?: string;
  contentName?: string;
  contentCategory?: string;
  contents?: Array<{
    content_id: string;
    content_name?: string;
    content_category?: string;
    quantity?: number;
    price?: number;
  }>;
  quantity?: number;
  description?: string;
  query?: string;
  
  // Custom properties
  properties?: Record<string, any>;
}

export interface TikTokEventsAPIConfig {
  pixelCode: string;  // TikTok Pixel ID
  accessToken: string;  // TikTok Marketing API access token
  testEventCode?: string;  // For testing events
}

/**
 * Hash a string value with SHA-256
 * Required by TikTok for PII (email, phone)
 */
function hashValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  // Normalize: lowercase and trim
  const normalized = value.toLowerCase().trim();
  if (!normalized) return undefined;
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Format phone number to E.164 format
 */
function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Send event to TikTok Events API
 */
export async function sendTikTokEvent(
  config: TikTokEventsAPIConfig,
  event: TikTokEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Build user context
    const context: any = {
      ad: {},
      page: {},
      user: {},
    };

    // Add click ID
    if (event.ttclid) {
      context.ad.callback = event.ttclid;
    }

    // Add page info
    if (event.pageUrl) {
      context.page.url = event.pageUrl;
    }
    if (event.referrerUrl) {
      context.page.referrer = event.referrerUrl;
    }

    // Add user data (hashed PII)
    if (event.email) {
      context.user.email = hashValue(event.email);
    }
    if (event.phone) {
      const formatted = formatPhone(event.phone);
      context.user.phone_number = hashValue(formatted);
    }
    if (event.externalId) {
      context.user.external_id = event.externalId;
    }
    if (event.ttp) {
      context.user.ttp = event.ttp;
    }

    // Add IP and user agent
    if (event.ipAddress) {
      context.user.ip = event.ipAddress;
    }
    if (event.userAgent) {
      context.user.user_agent = event.userAgent;
    }

    // Build properties
    const properties: any = {
      ...(event.properties || {}),
    };

    if (event.value !== undefined) {
      properties.value = event.value;
    }
    if (event.currency) {
      properties.currency = event.currency;
    }
    if (event.contentType) {
      properties.content_type = event.contentType;
    }
    if (event.contentId) {
      properties.content_id = event.contentId;
    }
    if (event.contentName) {
      properties.content_name = event.contentName;
    }
    if (event.contentCategory) {
      properties.content_category = event.contentCategory;
    }
    if (event.contents) {
      properties.contents = event.contents;
    }
    if (event.quantity !== undefined) {
      properties.quantity = event.quantity;
    }
    if (event.description) {
      properties.description = event.description;
    }
    if (event.query) {
      properties.query = event.query;
    }

    // Build event payload
    const eventPayload: any = {
      event: event.event,
      event_id: event.eventId || crypto.randomBytes(16).toString('hex'),
      timestamp: event.timestamp || new Date().toISOString(),
      context,
      properties,
    };

    // Build API payload
    const payload = {
      pixel_code: config.pixelCode,
      event_source: 'web',
      event_source_id: config.pixelCode,
      data: [eventPayload],
      ...(config.testEventCode && { test_event_code: config.testEventCode }),
    };

    // Send to TikTok
    const url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': config.accessToken,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      console.error('[TikTok Events API] Error:', result);
      return {
        success: false,
        eventId: eventPayload.event_id,
        error: result.message || 'Unknown error',
      };
    }

    console.log('[TikTok Events API] Event sent successfully:', {
      eventId: eventPayload.event_id,
      event: event.event,
      message: result.message,
    });

    return {
      success: true,
      eventId: eventPayload.event_id,
    };
  } catch (error) {
    console.error('[TikTok Events API] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown exception',
    };
  }
}

/**
 * Send purchase event to TikTok
 * Helper function for common purchase event
 */
export async function sendTikTokPurchase(
  config: TikTokEventsAPIConfig,
  data: {
    eventId?: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    contentId?: string;
    contents?: Array<{
      content_id: string;
      content_name?: string;
      quantity?: number;
      price?: number;
    }>;
    ttclid?: string;
    ttp?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
  }
) {
  return sendTikTokEvent(config, {
    event: 'CompletePayment',
    eventId: data.eventId,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    contentId: data.contentId,
    contents: data.contents,
    ttclid: data.ttclid,
    ttp: data.ttp,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    pageUrl: data.pageUrl,
  });
}

/**
 * Send lead event to TikTok
 */
export async function sendTikTokLead(
  config: TikTokEventsAPIConfig,
  data: {
    eventId?: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    ttclid?: string;
    ttp?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
  }
) {
  return sendTikTokEvent(config, {
    event: 'SubmitForm',
    eventId: data.eventId,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    ttclid: data.ttclid,
    ttp: data.ttp,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    pageUrl: data.pageUrl,
  });
}
