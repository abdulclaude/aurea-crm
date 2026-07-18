const CALLBACK_ORIGIN = "https://aurea.local";

export function getSafeCallbackUrl(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, CALLBACK_ORIGIN);
    if (url.origin !== CALLBACK_ORIGIN) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
