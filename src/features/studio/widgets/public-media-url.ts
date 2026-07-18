const PRIVATE_IPV4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
];

export function parsePublicMediaUrl(value: string): string | null {
  if (value.length > 2_048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.includes(":") ||
      PRIVATE_IPV4.some((pattern) => pattern.test(hostname))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
