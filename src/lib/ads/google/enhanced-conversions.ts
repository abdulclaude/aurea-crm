/**
 * Google Ads Enhanced Conversions Implementation
 * 
 * Sends server-side conversion events to Google Ads for:
 * - iOS 14.5+ attribution (bypasses ATT opt-out)
 * - Ad blocker bypass
 * - Improved conversion measurement accuracy
 * 
 * Docs: https://developers.google.com/google-ads/api/docs/conversions/overview
 * Enhanced Conversions: https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */

import crypto from 'crypto';

export interface GoogleConversionEvent {
  // Event details
  conversionAction: string;  // Resource name: customers/{customer_id}/conversionActions/{conversion_action_id}
  conversionDateTime: string;  // Format: "yyyy-mm-dd hh:mm:ss+|-hh:mm" (e.g., "2024-01-15 10:30:00-08:00")
  conversionValue?: number;
  currencyCode?: string;  // ISO 4217 code (e.g., "USD")
  orderId?: string;
  
  // Click identifier (one required)
  gclid?: string;  // Google Click ID
  gbraid?: string;  // Google SKAN 4.0 conversion value
  wbraid?: string;  // Google SKAN 4.0 conversion value
  
  // User identifiers (for enhanced conversions)
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    streetAddress?: string;
    city?: string;
    state?: string;  // 2-letter state code
    postalCode?: string;
    countryCode?: string;  // 2-letter country code (e.g., "US")
  };
  
  // Custom variables
  customVariables?: Array<{
    conversionCustomVariable: string;  // Resource name
    value: string;
  }>;
  
  // Cart data
  cartData?: {
    merchantId?: string;
    feedCountryCode?: string;
    feedLanguageCode?: string;
    localTransactionCost?: number;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

export interface GoogleAdsConfig {
  customerId: string;  // Google Ads customer ID (without hyphens)
  conversionActionId: string;  // Conversion action ID
  developerToken: string;  // Google Ads API developer token
  accessToken?: string;  // OAuth2 access token (if using OAuth)
  refreshToken?: string;  // OAuth2 refresh token
  clientId?: string;  // OAuth2 client ID
  clientSecret?: string;  // OAuth2 client secret
  loginCustomerId?: string;  // Manager account ID (if applicable)
}

/**
 * Hash a string value with SHA-256
 * Required by Google Ads for PII (email, phone, name, address)
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
 * Google Ads requires this format
 */
function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Refresh OAuth2 access token
 */
async function refreshAccessToken(config: GoogleAdsConfig): Promise<string> {
  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    throw new Error('Missing OAuth2 credentials for token refresh');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${result.error_description || result.error}`);
  }

  return result.access_token;
}

/**
 * Send conversion to Google Ads API
 */
export async function sendGoogleConversion(
  config: GoogleAdsConfig,
  event: GoogleConversionEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure we have a valid access token
    let accessToken = config.accessToken;
    if (!accessToken && config.refreshToken) {
      accessToken = await refreshAccessToken(config);
    }
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Build user identifiers (enhanced conversions)
    const userIdentifiers: any[] = [];
    
    if (event.email) {
      userIdentifiers.push({
        hashedEmail: hashValue(event.email),
      });
    }
    
    if (event.phone) {
      const formatted = formatPhone(event.phone);
      userIdentifiers.push({
        hashedPhoneNumber: hashValue(formatted),
      });
    }
    
    // Address info
    if (event.address || event.firstName || event.lastName) {
      const addressInfo: any = {};
      
      if (event.firstName) {
        addressInfo.hashedFirstName = hashValue(event.firstName);
      }
      if (event.lastName) {
        addressInfo.hashedLastName = hashValue(event.lastName);
      }
      if (event.address?.countryCode) {
        addressInfo.countryCode = event.address.countryCode.toUpperCase();
      }
      if (event.address?.postalCode) {
        addressInfo.postalCode = event.address.postalCode;
      }
      if (event.address?.streetAddress) {
        addressInfo.hashedStreetAddress = hashValue(event.address.streetAddress);
      }
      
      if (Object.keys(addressInfo).length > 0) {
        userIdentifiers.push({ addressInfo });
      }
    }

    // Build click conversion
    const clickConversion: any = {
      conversionAction: `customers/${config.customerId}/conversionActions/${config.conversionActionId}`,
      conversionDateTime: event.conversionDateTime,
    };

    // Add click identifier (gclid, gbraid, or wbraid)
    if (event.gclid) {
      clickConversion.gclid = event.gclid;
    } else if (event.gbraid) {
      clickConversion.gbraid = event.gbraid;
    } else if (event.wbraid) {
      clickConversion.wbraid = event.wbraid;
    } else {
      throw new Error('Missing click identifier (gclid, gbraid, or wbraid)');
    }

    // Add conversion value
    if (event.conversionValue !== undefined) {
      clickConversion.conversionValue = event.conversionValue;
    }
    
    if (event.currencyCode) {
      clickConversion.currencyCode = event.currencyCode;
    }
    
    if (event.orderId) {
      clickConversion.orderId = event.orderId;
    }

    // Add user identifiers (enhanced conversions)
    if (userIdentifiers.length > 0) {
      clickConversion.userIdentifiers = userIdentifiers;
    }

    // Add custom variables
    if (event.customVariables && event.customVariables.length > 0) {
      clickConversion.customVariables = event.customVariables;
    }

    // Add cart data
    if (event.cartData) {
      clickConversion.cartData = event.cartData;
    }

    // Build API payload
    const payload = {
      conversions: [clickConversion],
      partialFailure: true,  // Allow partial success
    };

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': config.developerToken,
    };

    if (config.loginCustomerId) {
      headers['login-customer-id'] = config.loginCustomerId;
    }

    // Send to Google Ads API
    const url = `https://googleads.googleapis.com/v16/customers/${config.customerId}:uploadClickConversions`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Google Ads] Error:', result);
      return {
        success: false,
        error: result.error?.message || 'Unknown error',
      };
    }

    // Check for partial failures
    if (result.partialFailureError) {
      console.error('[Google Ads] Partial failure:', result.partialFailureError);
      return {
        success: false,
        error: result.partialFailureError.message || 'Partial failure',
      };
    }

    console.log('[Google Ads] Conversion uploaded successfully:', {
      gclid: event.gclid,
      conversionAction: clickConversion.conversionAction,
      conversionValue: event.conversionValue,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Google Ads] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown exception',
    };
  }
}

/**
 * Send purchase conversion to Google Ads
 * Helper function for common purchase event
 */
export async function sendGooglePurchase(
  config: GoogleAdsConfig,
  data: {
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    orderId: string;
    conversionDateTime?: string;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }
) {
  // Format conversion date time (Google Ads format: "yyyy-mm-dd hh:mm:ss+|-hh:mm")
  const conversionDateTime = data.conversionDateTime || 
    new Date().toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, '+00:00');

  return sendGoogleConversion(config, {
    conversionAction: `customers/${config.customerId}/conversionActions/${config.conversionActionId}`,
    conversionDateTime,
    conversionValue: data.value,
    currencyCode: data.currency,
    orderId: data.orderId,
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    email: data.email,
    phone: data.phone,
    cartData: data.items ? {
      items: data.items,
    } : undefined,
  });
}

/**
 * Send lead conversion to Google Ads
 */
export async function sendGoogleLead(
  config: GoogleAdsConfig,
  data: {
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    conversionDateTime?: string;
  }
) {
  const conversionDateTime = data.conversionDateTime || 
    new Date().toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, '+00:00');

  return sendGoogleConversion(config, {
    conversionAction: `customers/${config.customerId}/conversionActions/${config.conversionActionId}`,
    conversionDateTime,
    conversionValue: data.value,
    currencyCode: data.currency,
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    email: data.email,
    phone: data.phone,
  });
}
