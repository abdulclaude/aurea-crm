import { type NextRequest } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { ClientType, StudioMembershipStatus } from "@/db/enums";
import { client, membershipPlan, studioMembership } from "@/db/schema";
import {
  apiError,
  requireApiKeyLocation,
  requireScope,
  validateApiKey,
} from "@/lib/api-auth";
import { and, desc, eq, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

const CreateMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "members:read");
  if (!scope.ok) return apiError(scope.error, 403);
  const keyLocation = requireApiKeyLocation(auth.apiKey);
  if (!keyLocation.ok) return apiError(keyLocation.error, 403);

  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const cursor = searchParams.get("cursor") ?? undefined;

  const conditions: SQL[] = [
    eq(client.organizationId, auth.apiKey.organizationId),
    eq(client.locationId, keyLocation.locationId),
  ];
  if (email) {
    conditions.push(ilike(client.email, email));
  }
  if (cursor) {
    const [cursorClient] = await db
      .select({ id: client.id, createdAt: client.createdAt })
      .from(client)
      .where(
        and(
          eq(client.id, cursor),
          eq(client.organizationId, auth.apiKey.organizationId),
          eq(client.locationId, keyLocation.locationId),
        ),
      )
      .limit(1);

    if (cursorClient) {
      const cursorCondition = or(
        lt(client.createdAt, cursorClient.createdAt),
        and(
          eq(client.createdAt, cursorClient.createdAt),
          lt(client.id, cursorClient.id),
        ),
      );

      if (cursorCondition) {
        conditions.push(cursorCondition);
      }
    }
  }

  const clients = await db
    .select({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      createdAt: client.createdAt,
    })
    .from(client)
    .where(and(...conditions))
    .orderBy(desc(client.createdAt), desc(client.id))
    .limit(limit + 1);

  let nextCursor: string | undefined;
  if (clients.length > limit) {
    nextCursor = clients.pop()!.id;
  }

  const clientIds = clients.map((member) => member.id);
  const membershipRows =
    clientIds.length > 0
      ? await db
          .select({
            clientId: studioMembership.clientId,
            membership: {
              id: studioMembership.id,
              status: studioMembership.status,
              startDate: studioMembership.startDate,
              endDate: studioMembership.endDate,
            },
            membershipPlan: {
              id: membershipPlan.id,
              name: membershipPlan.name,
            },
          })
          .from(studioMembership)
          .leftJoin(
            membershipPlan,
            eq(studioMembership.planId, membershipPlan.id),
          )
          .where(
            and(
              inArray(studioMembership.clientId, clientIds),
              eq(studioMembership.organizationId, auth.apiKey.organizationId),
              eq(studioMembership.locationId, keyLocation.locationId),
              eq(studioMembership.status, StudioMembershipStatus.ACTIVE),
            ),
          )
          .orderBy(desc(studioMembership.createdAt))
      : [];

  const activeMemberships = new Map<
    string,
    {
      id: string;
      status: StudioMembershipStatus;
      startDate: Date;
      endDate: Date | null;
      membershipPlan: { id: string; name: string } | null;
    }
  >();
  for (const row of membershipRows) {
    if (!activeMemberships.has(row.clientId)) {
      activeMemberships.set(row.clientId, {
        ...row.membership,
        membershipPlan: row.membershipPlan,
      });
    }
  }

  const result = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    type: c.type,
    createdAt: c.createdAt,
    activeMembership: activeMemberships.get(c.id) ?? null,
  }));

  return Response.json({ data: result, count: result.length, nextCursor });
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const writeScope = requireScope(auth.apiKey.scopes, "members:write");
  if (!writeScope.ok) return apiError(writeScope.error, 403);
  const keyLocation = requireApiKeyLocation(auth.apiKey);
  if (!keyLocation.ok) return apiError(keyLocation.error, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsedBody = CreateMemberSchema.safeParse(body);
  if (!parsedBody.success) {
    const missingEmail = parsedBody.error.issues.some((issue) =>
      issue.path.includes("email"),
    );
    return apiError(
      missingEmail ? "email is required" : "name is required",
      400,
    );
  }
  const data = parsedBody.data;

  const [existing] = await db
    .select()
    .from(client)
    .where(
      and(
        eq(client.organizationId, auth.apiKey.organizationId),
        eq(client.locationId, keyLocation.locationId),
        ilike(client.email, data.email),
      ),
    )
    .limit(1);
  if (existing) {
    return Response.json({ data: existing }, { status: 200 });
  }

  const [createdClient] = await db
    .insert(client)
    .values({
      id: createId(),
      organizationId: auth.apiKey.organizationId,
      locationId: keyLocation.locationId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      type: ClientType.LEAD,
      updatedAt: new Date(),
    })
    .returning({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
    });

  return Response.json({ data: createdClient }, { status: 201 });
}
