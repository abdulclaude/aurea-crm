import "dotenv/config";
import prisma from "../src/lib/db";

type GeoCoordinates = { latitude: number; longitude: number } | null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getArgValue = (flag: string) => {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.split("=").slice(1).join("=") : undefined;
};

const funnelIdFilter = getArgValue("--funnelId");
const limitArg = getArgValue("--limit");
const sleepArg = getArgValue("--sleepMs");
const updateLimit = limitArg ? Number(limitArg) : undefined;
const sleepMs = sleepArg ? Number(sleepArg) : 1000;
const shouldLogFailures = process.env.LOG_GEO_FAILURES === "1";

if (updateLimit !== undefined && !Number.isFinite(updateLimit)) {
  console.warn(`[Backfill] Invalid --limit value: ${limitArg}`);
}
if (!Number.isFinite(sleepMs)) {
  console.warn(`[Backfill] Invalid --sleepMs value: ${sleepArg}`);
}

const normalizeCountryCode = (code?: string | null) => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "UK") return "GB";
  return normalized;
};

const CITY_ALIASES: Record<string, string> = {
  "águeda municipality": "Águeda",
  "leicestershire": "Leicester",
};

const normalizeCityName = (city: string) => {
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];

  const suffixes = [
    " municipality",
    " county",
    " province",
    " region",
    " district",
    " governorate",
  ];
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix)) {
      const withoutSuffix = trimmed.slice(0, -suffix.length).trim();
      if (withoutSuffix) return withoutSuffix;
    }
  }

  return trimmed;
};

const fetchCityCoordinates = async ({
  city,
  region,
  countryCode,
  countryName,
}: {
  city: string;
  region?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
}): Promise<GeoCoordinates> => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const cleanRegion =
    region && region.toLowerCase() !== "unknown" ? region : undefined;
  const normalizedCity = normalizeCityName(city);

  const tryLookup = async (params: URLSearchParams) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            "User-Agent": "aurea-crm/1.0",
          },
        }
      );
      if (!response.ok) return null;
      const results = (await response.json()) as { lat?: string; lon?: string }[];
      if (!results?.length) return null;
      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  };

  const attempts: URLSearchParams[] = [];
  const baseParams = new URLSearchParams({
    format: "json",
    limit: "1",
    city: normalizedCity,
  });

  const withRegion = new URLSearchParams(baseParams);
  if (cleanRegion) withRegion.set("state", cleanRegion);
  if (countryName) withRegion.set("country", countryName);
  if (normalizedCountryCode) {
    withRegion.set("countrycodes", normalizedCountryCode.toLowerCase());
  }
  attempts.push(withRegion);

  const withoutRegion = new URLSearchParams(baseParams);
  if (countryName) withoutRegion.set("country", countryName);
  if (normalizedCountryCode) {
    withoutRegion.set("countrycodes", normalizedCountryCode.toLowerCase());
  }
  attempts.push(withoutRegion);

  if (countryName) {
    const byNameOnly = new URLSearchParams(baseParams);
    byNameOnly.set("country", countryName);
    attempts.push(byNameOnly);
  }

  if (normalizedCountryCode) {
    const byCodeOnly = new URLSearchParams(baseParams);
    byCodeOnly.set("countrycodes", normalizedCountryCode.toLowerCase());
    attempts.push(byCodeOnly);
  }

  attempts.push(new URLSearchParams(baseParams));

  for (const params of attempts) {
    const coords = await tryLookup(params);
    if (coords) return coords;
    await sleep(Number.isFinite(sleepMs) ? sleepMs : 1000);
  }

  return null;
};

const getCityKey = (city: string, countryKey: string, region?: string | null) =>
  `${city.trim().toLowerCase()}||${countryKey}||${region?.trim().toLowerCase() || ""}`;

async function main() {
  const cityGeoCache = new Map<string, GeoCoordinates>();

  const sessions = await prisma.funnelSession.findMany({
    where: {
      city: { not: null },
      latitude: null,
      longitude: null,
      ...(funnelIdFilter ? { funnelId: funnelIdFilter } : {}),
    },
    select: {
      id: true,
      city: true,
      region: true,
      countryCode: true,
      countryName: true,
    },
  });

  let updatedCount = 0;

  console.log(
    `[Backfill] Found ${sessions.length} sessions missing coords${
      funnelIdFilter ? ` for funnel ${funnelIdFilter}` : ""
    }.`
  );

  for (const session of sessions) {
    if (!session.city || session.city === "Unknown") continue;

    const originalCountryCode = session.countryCode?.trim().toUpperCase();
    const normalizedCountryCode = normalizeCountryCode(session.countryCode);
    const normalizedCountryName = session.countryName?.trim();
    if (!normalizedCountryCode && !normalizedCountryName && !originalCountryCode) {
      continue;
    }
    const countryKey =
      originalCountryCode ||
      normalizedCountryCode ||
      normalizedCountryName?.toLowerCase() ||
      "unknown";
    const normalizedCity = normalizeCityName(session.city);
    const key = getCityKey(normalizedCity, countryKey, session.region);

    if (!cityGeoCache.has(key)) {
      const existing = await prisma.funnelSession.findFirst({
        where: {
          ...(funnelIdFilter ? { funnelId: funnelIdFilter } : {}),
          city: normalizedCity,
          ...(normalizedCountryName ? { countryName: normalizedCountryName } : {}),
          ...(normalizedCountryCode || originalCountryCode
            ? {
                countryCode:
                  normalizedCountryCode && originalCountryCode
                    ? { in: [normalizedCountryCode, originalCountryCode] }
                    : normalizedCountryCode || originalCountryCode,
              }
            : {}),
          ...(session.region ? { region: session.region } : {}),
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          latitude: true,
          longitude: true,
        },
      });

      if (existing?.latitude && existing?.longitude) {
        cityGeoCache.set(key, {
          latitude: existing.latitude,
          longitude: existing.longitude,
        });
      } else {
        const coords = await fetchCityCoordinates({
          city: normalizedCity,
          region: session.region,
          countryCode: normalizedCountryCode || originalCountryCode,
          countryName: normalizedCountryName,
        });
        if (!coords && shouldLogFailures) {
          console.warn(
            `[Backfill] No coords for ${normalizedCity}, ${normalizedCountryName || normalizedCountryCode || originalCountryCode || "Unknown"}`
          );
        }
        cityGeoCache.set(key, coords);
      }
    }

    const coords = cityGeoCache.get(key);
    if (!coords) continue;

    await prisma.funnelSession.update({
      where: { id: session.id },
      data: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
    updatedCount += 1;

    if (updateLimit && updatedCount >= updateLimit) {
      break;
    }
  }

  console.log(`[Backfill] Updated ${updatedCount} sessions with coords.`);
}

main()
  .catch((error) => {
    console.error("[Backfill] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
