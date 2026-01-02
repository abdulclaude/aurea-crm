/**
 * Meta (Facebook) Conversion API Implementation
 * 
 * Sends server-side conversion events to Facebook for:
 * - iOS 14.5+ attribution (bypasses ATT opt-out)
 * - Ad blocker bypass
 * - 30% higher match rates than pixel-only
 * 
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'crypto';

export interface MetaConversionEvent {
  // Event details
  eventName: string;  // 'Purchase', 'Lead', 'AddToCart', 'ViewContent', etc.
  eventTime: number;  // Unix timestamp (seconds)
  eventId: string;    // Unique event ID (for deduplication with pixel)
  eventSourceUrl?: string;  // URL where event occurred
  
  // User data (for matching)
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Browser data
  userAgent?: string;
  ipAddress?: string;
  fbp?: string;  // _fbp cookie (Facebook Browser ID)
  fbc?: string;  // _fbc cookie (Facebook Click Cookie)
  fbclid?: string;  // Facebook Click ID from URL
  
  // Conversion data
  value?: number;
  currency?: string;
  contentType?: string;
  contentIds?: string[];
  contentName?: string;
  numItems?: number;
  orderId?: string;
  
  // Custom data
  customData?: Record<string, any>;
}

export interface MetaConversionAPIConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;  // For testing events
}

/**
 * Hash a string value with SHA-256
 * Required by Meta for PII (email, phone, name, address)
 */
function hashValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  // Normalize: lowercase and trim
  const normalized = value.toLowerCase().trim();
  if (!normalized) return undefined;
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Format phone number to E.164 format (required by Meta)
 * Example: +14155551234
 */
function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Send conversion event to Meta Conversion API
 */
export async function sendMetaConversion(
  config: MetaConversionAPIConfig,
  event: MetaConversionEvent
): Promise<{ success: boolean; eventId: string; error?: string }> {
  try {
    // Build user_data object (all PII must be hashed)
    const userData: Record<string, any> = {
      client_ip_address: event.ipAddress,
      client_user_agent: event.userAgent,
    };
    
    // Add hashed PII
    if (event.email) {
      userData.em = [hashValue(event.email)];
    }
    if (event.phone) {
      const formatted = formatPhone(event.phone);
      userData.ph = [hashValue(formatted)];
    }
    if (event.firstName) {
      userData.fn = [hashValue(event.firstName)];
    }
    if (event.lastName) {
      userData.ln = [hashValue(event.lastName)];
    }
    if (event.city) {
      userData.ct = [hashValue(event.city)];
    }
    if (event.state) {
      userData.st = [hashValue(event.state)];
    }
    if (event.zipCode) {
      userData.zp = [hashValue(event.zipCode)];
    }
    if (event.country) {
      userData.country = [event.country.toLowerCase()];  // Not hashed, 2-letter code
    }
    
    // Add first-party cookies
    if (event.fbp) {
      userData.fbp = event.fbp;
    }
    
    // Add fbc cookie or construct from fbclid
    if (event.fbc) {
      userData.fbc = event.fbc;
    } else if (event.fbclid) {
      // Format: fb.1.{timestamp}.{fbclid}
      userData.fbc = `fb.1.${Date.now()}.${event.fbclid}`;
    }
    
    // Build custom_data object
    const customData: Record<string, any> = {
      ...(event.customData || {}),
    };
    
    if (event.value !== undefined) {
      customData.value = event.value;
    }
    if (event.currency) {
      customData.currency = event.currency;
    }
    if (event.contentType) {
      customData.content_type = event.contentType;
    }
    if (event.contentIds) {
      customData.content_ids = event.contentIds;
    }
    if (event.contentName) {
      customData.content_name = event.contentName;
    }
    if (event.numItems !== undefined) {
      customData.num_items = event.numItems;
    }
    if (event.orderId) {
      customData.order_id = event.orderId;
    }
    
    // Build API payload
    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime,
          event_id: event.eventId,
          event_source_url: event.eventSourceUrl,
          action_source: 'website',
          user_data: userData,
          custom_data: Object.keys(customData).length > 0 ? customData : undefined,
        },
      ],
      ...(config.testEventCode && { test_event_code: config.testEventCode }),
    };
    
    // Send to Meta
    const url = `https://graph.facebook.com/v18.0/${config.pixelId}/events?access_token=${config.accessToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[Meta CAPI] Error:', result);
      return {
        success: false,
        eventId: event.eventId,
        error: result.error?.message || 'Unknown error',
      };
    }
    
    // Check for events_received
    if (result.events_received === 0) {
      console.error('[Meta CAPI] No events received:', result);
      return {
        success: false,
        eventId: event.eventId,
        error: 'Events not received by Meta',
      };
    }
    
    console.log('[Meta CAPI] Event sent successfully:', {
      eventId: event.eventId,
      eventName: event.eventName,
      eventsReceived: result.events_received,
    });
    
    return {
      success: true,
      eventId: event.eventId,
    };
  } catch (error) {
    console.error('[Meta CAPI] Exception:', error);
    return {
      success: false,
      eventId: event.eventId,
      error: error instanceof Error ? error.message : 'Unknown exception',
    };
  }
}

/**
 * Send purchase conversion to Meta
 * Helper function for common purchase event
 */
export async function sendMetaPurchase(
  config: MetaConversionAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    orderId: string;
    contentIds?: string[];
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    ipAddress?: string;
    userAgent?: string;
    eventTime?: number;
  }
) {
  return sendMetaConversion(config, {
    eventName: 'Purchase',
    eventTime: data.eventTime || Math.floor(Date.now() / 1000),
    eventId: data.eventId,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    orderId: data.orderId,
    contentIds: data.contentIds,
    fbclid: data.fbclid,
    fbp: data.fbp,
    fbc: data.fbc,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

/**
 * Send lead conversion to Meta
 */
export async function sendMetaLead(
  config: MetaConversionAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    ipAddress?: string;
    userAgent?: string;
    eventTime?: number;
  }
) {
  return sendMetaConversion(config, {
    eventName: 'Lead',
    eventTime: data.eventTime || Math.floor(Date.now() / 1000),
    eventId: data.eventId,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    fbclid: data.fbclid,
    fbp: data.fbp,
    fbc: data.fbc,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}
