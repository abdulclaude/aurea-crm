import { type NextRequest } from "next/server";
import { db } from "@/db";
import { membershipPlan } from "@/db/schema";
import { validateApiKey, requireScope, apiError } from "@/lib/api-auth";
import { and, asc, eq, type SQL } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "memberships:read");
  if (!scope.ok) return apiError(scope.error, 403);

  const { searchParams } = req.nextUrl;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const conditions: SQL[] = [
    eq(membershipPlan.organizationId, auth.apiKey.organizationId),
  ];
  if (!includeInactive) {
    conditions.push(eq(membershipPlan.isActive, true));
  }

  const plans = await db
    .select({
      id: membershipPlan.id,
      name: membershipPlan.name,
      description: membershipPlan.description,
      price: membershipPlan.price,
      currency: membershipPlan.currency,
      billingInterval: membershipPlan.billingInterval,
      type: membershipPlan.type,
      classCredits: membershipPlan.classCredits,
      durationDays: membershipPlan.durationDays,
      isActive: membershipPlan.isActive,
      trialDays: membershipPlan.trialDays,
      sortOrder: membershipPlan.sortOrder,
    })
    .from(membershipPlan)
    .where(and(...conditions))
    .orderBy(asc(membershipPlan.sortOrder));

  const result = plans.map((p) => ({
    ...p,
    price: p.price ? Number(p.price) : null,
  }));

  return Response.json({ data: result, count: result.length });
}
