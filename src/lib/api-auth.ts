import { createHash } from "crypto";
import { type NextRequest } from "next/server";
import { db } from "@/db";
import { apiKey as apiKeyTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type ValidatedApiKey = Pick<
  typeof apiKeyTable.$inferSelect,
  "id" | "organizationId" | "locationId"
> & {
  scopes: string[];
};

export async function validateApiKey(req: NextRequest): Promise<
  | {
      valid: false;
      error: string;
    }
  | {
      valid: true;
      apiKey: ValidatedApiKey;
    }
> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or malformed Authorization header" };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("ak_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hash = createHash("sha256").update(rawKey).digest("hex");

  const [apiKey] = await db
    .select({
      id: apiKeyTable.id,
      organizationId: apiKeyTable.organizationId,
      locationId: apiKeyTable.locationId,
      scopes: apiKeyTable.scopes,
      isActive: apiKeyTable.isActive,
      expiresAt: apiKeyTable.expiresAt,
    })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.keyHash, hash))
    .limit(1);

  if (!apiKey) return { valid: false, error: "Invalid API key" };
  if (!apiKey.isActive) return { valid: false, error: "API key is revoked" };
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  await db
    .update(apiKeyTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeyTable.id, apiKey.id))
    .catch(() => {});

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      locationId: apiKey.locationId,
      scopes: apiKey.scopes ?? [],
    },
  };
}

export function requireScope(
  scopes: string[],
  required: string,
): { ok: false; error: string } | { ok: true } {
  if (!scopes.includes(required)) {
    return {
      ok: false,
      error: `This key does not have the '${required}' scope`,
    };
  }
  return { ok: true };
}

export function requireApiKeyLocation(apiKey: {
  locationId: string | null;
}): { ok: false; error: string } | { ok: true; locationId: string } {
  if (!apiKey.locationId) {
    return {
      ok: false,
      error:
        "This API key is not bound to a location. Create a location-scoped key.",
    };
  }
  return { ok: true, locationId: apiKey.locationId };
}

export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
