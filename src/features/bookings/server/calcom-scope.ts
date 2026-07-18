import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { calComCredential } from "@/db/schema";

export async function requireActiveCalComCredential(input: {
  organizationId: string;
  locationId: string;
}): Promise<{ id: string; apiKey: string }> {
  const credential = await db.query.calComCredential.findFirst({
    where: and(
      eq(calComCredential.organizationId, input.organizationId),
      eq(calComCredential.locationId, input.locationId),
      eq(calComCredential.isActive, true),
    ),
    columns: { id: true, apiKey: true },
  });
  if (!credential?.apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect an active Cal.com account for this location first.",
    });
  }
  return { id: credential.id, apiKey: credential.apiKey };
}
