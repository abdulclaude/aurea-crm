import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { inngest } from "@/inngest/client";
import { syncLocationEmbeddings } from "@/lib/embeddings/sync";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { locationId, async: runAsync = true } = body;

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId is required" },
      { status: 400 }
    );
  }

  try {
    if (runAsync) {
      // Queue the reindex job via Inngest
      await inngest.send({
        name: "embeddings/reindex.location",
        data: { locationId },
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
        onProgress: (msg) => logs.push(msg),
      });

      return NextResponse.json({
        success: true,
        result,
        logs,
      });
    }
  } catch (error) {
    console.error("Reindex error:", error);
    return NextResponse.json(
      { error: "Failed to reindex", details: String(error) },
      { status: 500 }
    );
  }
}
