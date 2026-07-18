import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { inngest } from "@/inngest/client";
import { syncLocationEmbeddings } from "@/lib/embeddings/sync";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db";
import { CredentialType } from "@/db/enums";
import { location } from "@/db/schema";
import {
  AiRequestScopeError,
  resolveAiRequestScope,
} from "@/features/ai/server/request-scope";
import {
  resolveScopedAiCredential,
  ScopedAiCredentialError,
} from "@/features/ai/server/scoped-credential";
import { requireCapability } from "@/features/permissions/server/authorization";

const ReindexRequestSchema = z.object({
  locationId: z.string().min(1),
  async: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = ReindexRequestSchema.safeParse(
    (await request.json()) as unknown,
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "A valid locationId is required" },
      { status: 400 },
    );
  }

  try {
    const scope = await resolveAiRequestScope({
      sessionToken: session.session.token,
      userId: session.user.id,
    });
    const { locationId, async: runAsync } = parsedBody.data;
    const [targetLocation] = await db
      .select({ id: location.id, organizationId: location.organizationId })
      .from(location)
      .where(
        and(
          eq(location.id, locationId),
          eq(location.organizationId, scope.organizationId),
        ),
      )
      .limit(1);
    if (!targetLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    await requireCapability({
      actor: {
        userId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      capability: "customer.manage",
      resource: {
        organizationId: targetLocation.organizationId,
        locationId: targetLocation.id,
      },
    });
    const scopedCredential = await resolveScopedAiCredential({
      organizationId: targetLocation.organizationId,
      locationId: targetLocation.id,
      type: CredentialType.OPENAI,
    });

    if (runAsync) {
      // Queue the reindex job via Inngest
      await inngest.send({
        name: "embeddings/reindex.location",
        data: {
          locationId,
          credentialId: scopedCredential.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Reindex job queued",
        locationId,
      });
    } else {
      // Run synchronously (for smaller datasets or testing)
      const logs: string[] = [];
      const result = await syncLocationEmbeddings(locationId, {
        credentialId: scopedCredential.id,
        onProgress: (msg) => logs.push(msg),
      });

      return NextResponse.json({
        success: true,
        result,
        logs,
      });
    }
  } catch (error) {
    if (error instanceof AiRequestScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof ScopedAiCredentialError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof TRPCError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "FORBIDDEN" ? 403 : 409 },
      );
    }

    console.error("Embedding reindex failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Failed to reindex" },
      { status: 500 },
    );
  }
}
