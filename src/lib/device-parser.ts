import { UAParser } from "ua-parser-js";

export function parseUserAgent(userAgent: string, screenWidth?: number, screenHeight?: number) {
	const parser = new UAParser(userAgent);
	const result = parser.getResult();

	return {
		// Browser
		browserName: result.browser.name || "Unknown",
		browserVersion: result.browser.version || "Unknown",

		// OS
		osName: result.os.name || "Unknown",
		osVersion: result.os.version || "Unknown",

		// Device (granular detection matching SDK logic)
		deviceType: getDeviceType(result.device.type, userAgent, screenWidth, screenHeight),
	};
}

function getDeviceType(type?: string, userAgent?: string, screenWidth?: number, screenHeight?: number): string {
	// If user agent indicates mobile/tablet, use that
	if (type) {
		switch (type.toLowerCase()) {
			case "mobile":
				return "Mobile";
			case "tablet":
				return "Tablet";
			case "smarttv":
				return "Smart TV";
			case "wearable":
				return "Wearable";
			case "console":
				return "Console";
		}
	}

	// Desktop devices - determine if Laptop, Desktop, or Ultrawide
	// This matches the SDK logic exactly
	const width = screenWidth || 0;
	const height = screenHeight || 0;
	const aspectRatio = height > 0 ? width / height : 0;
	const ua = userAgent?.toLowerCase() || '';
	
	// Check user agent for laptop indicators
	const isWindowsLaptop = ua.includes('windows') && ua.includes('touch');
	const isChromebook = ua.includes('chromebook') || ua.includes('cros');
	const hasLaptopKeyword = ua.includes('laptop');
	
	// Ultrawide detection: width >= 2560 or aspect ratio >= 2.2:1
	if (width >= 2560 || aspectRatio >= 2.2) {
		return "Ultrawide";
	}
	
	// Laptop detection: <= 1920 width (covers MacBooks up to 16")
	// MacBook Air 13": ~1470px
	// MacBook Pro 14": ~1512px  
	// MacBook Pro 16": ~1728px
	// Most Windows laptops: 1366-1920px
	if (width > 0 && width <= 1920) {
		return "Laptop";
	}
	
	// Additional laptop indicators for edge cases (1920-2048 range)
	if (width > 0 && width <= 2048 && (isWindowsLaptop || isChromebook || hasLaptopKeyword)) {
		return "Laptop";
	}
	
	// Default to Desktop if no screen info or large monitors
	return "Desktop";
}

function isPrivateIP(ip: string): boolean {
	if (!ip || ip === "unknown") return true;
	if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
	if (ip.startsWith("192.168.")) return true;
	if (ip.startsWith("10.")) return true;
	if (ip.startsWith("172.")) {
		const second = Number.parseInt(ip.split(".")[1] || "0", 10);
		if (second >= 16 && second <= 31) return true;
	}
	if (ip.startsWith("fc00:") || ip.startsWith("fd00:")) return true; // IPv6 private
	return false;
}

export async function parseIPAddress(ip: string) {
	console.log(`[Device Parser] parseIPAddress called with IP: ${ip}`);
	
	// Handle localhost/private IPs - mark as Localhost instead of Unknown
	if (isPrivateIP(ip)) {
		console.log(`[Device Parser] ✗ Private IP detected: ${ip} - returning Localhost (this shouldn't happen if API route works)`);
		return {
			countryCode: "LOCAL",
			countryName: "Localhost",
			region: "Development",
			city: "Local",
		};
	}

	// Use ip-api.com for geo lookup (free, reliable, no dependencies)
	try {
		const response = await fetch(
			`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city`,
			{
				signal: AbortSignal.timeout(3000), // 3 second timeout
			}
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();

		if (data.status === "fail") {
			console.log(`[Device Parser] ✗ Geo lookup failed for ${ip}: ${data.message}`);
			return {
				countryCode: "Unknown",
				countryName: "Unknown",
				region: "Unknown",
				city: "Unknown",
			};
		}

		// Successfully parsed geo data
		console.log(`[Device Parser] ✓ Geo lookup successful for ${ip}: ${data.country} (${data.countryCode}) - ${data.city || "Unknown city"}`);

		return {
			countryCode: data.countryCode || "Unknown",
			countryName: data.country || "Unknown",
			region: data.regionName || "Unknown",
			city: data.city || "Unknown",
		};
	} catch (error) {
		console.error(`[Device Parser] ✗ Error performing geo lookup for ${ip}:`, error);
		return {
			countryCode: "Unknown",
			countryName: "Unknown",
			region: "Unknown",
			city: "Unknown",
		};
	}
}

// Helper to convert country codes to names
function getCountryName(code: string): string {
	const countryNames: Record<string, string> = {
		US: "United States",
		GB: "United Kingdom",
		CA: "Canada",
		AU: "Australia",
		DE: "Germany",
		FR: "France",
		IT: "Italy",
		ES: "Spain",
		NL: "Netherlands",
		SE: "Sweden",
		NO: "Norway",
		DK: "Denmark",
		FI: "Finland",
		PL: "Poland",
		CH: "Switzerland",
		AT: "Austria",
		BE: "Belgium",
		IE: "Ireland",
		PT: "Portugal",
		GR: "Greece",
		CZ: "Czech Republic",
		RO: "Romania",
		HU: "Hungary",
		BG: "Bulgaria",
		HR: "Croatia",
		SK: "Slovakia",
		SI: "Slovenia",
		LT: "Lithuania",
		LV: "Latvia",
		EE: "Estonia",
		JP: "Japan",
		CN: "China",
		IN: "India",
		KR: "South Korea",
		SG: "Singapore",
		MY: "Malaysia",
		TH: "Thailand",
		ID: "Indonesia",
		PH: "Philippines",
		VN: "Vietnam",
		NZ: "New Zealand",
		BR: "Brazil",
		MX: "Mexico",
		AR: "Argentina",
		CL: "Chile",
		CO: "Colombia",
		PE: "Peru",
		VE: "Venezuela",
		ZA: "South Africa",
		EG: "Egypt",
		NG: "Nigeria",
		KE: "Kenya",
		MA: "Morocco",
		TN: "Tunisia",
		AE: "United Arab Emirates",
		SA: "Saudi Arabia",
		IL: "Israel",
		TR: "Turkey",
		RU: "Russia",
		UA: "Ukraine",
		BY: "Belarus",
		KZ: "Kazakhstan",
	};

	return countryNames[code] || code;
}
