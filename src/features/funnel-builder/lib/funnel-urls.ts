/**
 * Funnel URL Utilities
 *
 * Helper functions for generating funnel URLs
 */

import type { FunnelDomainType } from "@prisma/client";

export const PLATFORM_BASE_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "localhost:3000";

interface FunnelDomainConfig {
  domainType: FunnelDomainType;
  subdomain?: string | null;
  customDomain?: string | null;
}

/**
 * Get the public URL for a published funnel page
 */
export function getPublicFunnelPageUrl(
  funnelId: string,
  pageSlug: string,
  domainConfig?: FunnelDomainConfig,
  baseUrl?: string
): string {
  // If domain config is provided, use custom logic
  if (domainConfig) {
    if (domainConfig.domainType === "CUSTOM" && domainConfig.customDomain) {
      // Custom domain: https://www.clientdomain.com/{pageSlug}
      const protocol = PLATFORM_BASE_DOMAIN.includes("localhost") ? "http" : "https";
      return `${protocol}://${domainConfig.customDomain}/${pageSlug}`;
    }

    if (domainConfig.domainType === "SUBDOMAIN" && domainConfig.subdomain) {
      // Subdomain: https://subdomain.platform.com/{pageSlug}
      const protocol = PLATFORM_BASE_DOMAIN.includes("localhost") ? "http" : "https";
      return `${protocol}://${domainConfig.subdomain}.${PLATFORM_BASE_DOMAIN}/${pageSlug}`;
    }
  }

  // Fallback to default path-based URL
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/f/${funnelId}/${pageSlug}`;
}

/**
 * Get the editor URL for a funnel page
 */
export function getFunnelEditorUrl(
  funnelId: string,
  pageId?: string,
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${base}/funnels/${funnelId}/editor`;
  return pageId ? `${url}?pageId=${pageId}` : url;
}

/**
 * Generate shareable link for a funnel page
 */
export function generateShareableLink(
  funnelId: string,
  pageSlug: string,
  domainConfig?: FunnelDomainConfig
): {
  url: string;
  qrCodeUrl: string;
} {
  const url = getPublicFunnelPageUrl(funnelId, pageSlug, domainConfig);
  // QR code can be generated using a service like api.qrserver.com
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

  return { url, qrCodeUrl };
}

/**
 * Extract funnel ID and slug from a public URL
 */
export function parseFunnelUrl(url: string): {
  funnelId: string | null;
  slug: string | null;
} {
  const match = url.match(/\/f\/([^/]+)\/([^/?#]+)/);
  if (!match) {
    return { funnelId: null, slug: null };
  }

  return {
    funnelId: match[1],
    slug: match[2],
  };
}

/**
 * Validate subdomain format
 * - Only lowercase letters, numbers, and hyphens
 * - Must start and end with alphanumeric
 * - 3-63 characters
 */
export function validateSubdomain(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  if (!subdomain) {
    return { valid: false, error: "Subdomain is required" };
  }

  if (subdomain.length < 3 || subdomain.length > 63) {
    return { valid: false, error: "Subdomain must be 3-63 characters" };
  }

  if (!/^[a-z0-9]/.test(subdomain)) {
    return { valid: false, error: "Subdomain must start with a letter or number" };
  }

  if (!/[a-z0-9]$/.test(subdomain)) {
    return { valid: false, error: "Subdomain must end with a letter or number" };
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { valid: false, error: "Subdomain can only contain lowercase letters, numbers, and hyphens" };
  }

  if (subdomain.includes("--")) {
    return { valid: false, error: "Subdomain cannot contain consecutive hyphens" };
  }

  // Reserved subdomains
  const reserved = ["www", "api", "app", "admin", "dashboard", "mail", "smtp", "ftp"];
  if (reserved.includes(subdomain)) {
    return { valid: false, error: "This subdomain is reserved" };
  }

  return { valid: true };
}

/**
 * Validate custom domain format
 * - Must be a valid domain name
 * - Can include www or other subdomains
 */
export function validateCustomDomain(domain: string): {
  valid: boolean;
  error?: string;
} {
  if (!domain) {
    return { valid: false, error: "Domain is required" };
  }

  // Basic domain validation regex
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

  if (!domainRegex.test(domain)) {
    return { valid: false, error: "Invalid domain format" };
  }

  return { valid: true };
}
