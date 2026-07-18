/**
 * GDPR Compliance Utilities
 * Tools for privacy-preserving analytics
 */

import crypto from "node:crypto";

/**
 * Hash an IP address with a daily-rotating salt
 * This makes IPs non-reversible while allowing same-day deduplication
 */
export class IpHashSaltUnavailableError extends Error {
  constructor() {
    super("IP hashing is unavailable because its deployment secret is missing");
    this.name = "IpHashSaltUnavailableError";
  }
}

export function hashIpAddress(
	ip: string,
	options: { now?: Date; salt?: string } = {},
): string {
	if (!ip) return "unknown";

	// Use daily salt (resets every day at midnight UTC)
	const today = (options.now ?? new Date()).toISOString().split("T")[0];
	const salt = options.salt ?? process.env.IP_HASH_SALT?.trim();
	if (!salt || salt.length < 32) {
		throw new IpHashSaltUnavailableError();
	}

	const hash = crypto
		.createHmac("sha256", salt)
		.update(`${today}:${ip}`)
		.digest("hex");

	return hash.substring(0, 32);
}

/**
 * Anonymize IP address (last octet for IPv4, last 80 bits for IPv6)
 */
export function anonymizeIpAddress(ip: string): string {
	if (!ip) return "unknown";

	// IPv4: Replace last octet with 0
	if (ip.includes(".")) {
		const parts = ip.split(".");
		if (parts.length === 4) {
			parts[3] = "0";
			return parts.join(".");
		}
	}

	// IPv6: Zero out last 80 bits (5 groups)
	if (ip.includes(":")) {
		const parts = ip.split(":");
		if (parts.length >= 3) {
			// Keep first 3 groups, zero the rest
			return `${parts.slice(0, 3).join(":")}::`;
		}
	}

	return ip;
}

/**
 * Get the appropriate IP address based on GDPR settings
 */
export function getPrivacyCompliantIp(
	ip: string,
	config: {
		anonymizeIp: boolean;
		hashIp?: boolean;
	},
): string {
	if (config.hashIp) {
		return hashIpAddress(ip);
	}
	if (config.anonymizeIp) {
		return anonymizeIpAddress(ip);
	}
	return ip;
}

/**
 * Check if user has given valid GDPR consent
 */
export function hasValidConsent(
	consentGiven: boolean,
	consentTimestamp: Date | null,
	consentVersion: string | null,
	currentVersion = "1.0",
): boolean {
	if (!consentGiven) return false;
	if (!consentTimestamp) return false;

	// Check if consent version matches (user must re-consent if policy changed)
	if (consentVersion !== currentVersion) return false;

	// Check if consent is not older than 12 months (re-consent required)
	const twelveMonthsAgo = new Date();
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

	if (consentTimestamp < twelveMonthsAgo) return false;

	return true;
}

/**
 * Calculate data retention expiry date
 */
export function getDataRetentionExpiryDate(retentionDays = 90): Date {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + retentionDays);
	return expiry;
}

/**
 * Check if data should be deleted based on retention policy
 */
export function shouldDeleteData(
	createdAt: Date,
	retentionDays = 90,
	deletionRequested = false,
): boolean {
	// If deletion was requested, always delete
	if (deletionRequested) return true;

	// Check if data is older than retention period
	const expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() - retentionDays);

	return createdAt < expiryDate;
}

/**
 * Sanitize user properties for GDPR compliance
 * Removes PII fields that shouldn't be stored
 */
export function sanitizeUserProperties(
	properties: Record<string, unknown>,
): Record<string, unknown> {
	const sanitized = { ...properties };

	// Remove common PII fields
	const piiFields = [
		"email",
		"phone",
		"phoneNumber",
		"telephone",
		"address",
		"street",
		"city",
		"zipCode",
		"postalCode",
		"ssn",
		"socialSecurityNumber",
		"creditCard",
		"bankAccount",
		"password",
	];

	for (const field of piiFields) {
		delete sanitized[field];
	}

	return sanitized;
}

/**
 * Current GDPR consent version
 */
export const CURRENT_CONSENT_VERSION = "1.0";

/**
 * Default data retention period in days
 */
export const DEFAULT_RETENTION_DAYS = 90;
