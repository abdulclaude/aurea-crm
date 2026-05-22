import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { client, unsubscribeToken as unsubscribeTokenTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "Token is required" },
      { status: 400 }
    );
  }

  try {
    const [unsubscribeToken] = await db
      .select({
        token: unsubscribeTokenTable,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          emailUnsubscribed: client.emailUnsubscribed,
        },
      })
      .from(unsubscribeTokenTable)
      .innerJoin(client, eq(unsubscribeTokenTable.clientId, client.id))
      .where(eq(unsubscribeTokenTable.token, token))
      .limit(1);

    if (!unsubscribeToken) {
      return NextResponse.json(
        { valid: false, error: "Invalid unsubscribe link" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (unsubscribeToken.token.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This unsubscribe link has expired" },
        { status: 410 }
      );
    }

    // Check if already used
    if (unsubscribeToken.token.usedAt) {
      return NextResponse.json(
        { valid: false, error: "This link has already been used" },
        { status: 410 }
      );
    }

    // Check if already unsubscribed
    if (unsubscribeToken.client.emailUnsubscribed) {
      return NextResponse.json({
        valid: true,
        alreadyUnsubscribed: true,
        email: unsubscribeToken.client.email,
        clientName: unsubscribeToken.client.name,
      });
    }

    return NextResponse.json({
      valid: true,
      email: unsubscribeToken.client.email,
      clientName: unsubscribeToken.client.name,
    });
  } catch (error) {
    console.error("Error validating unsubscribe token:", error);
    return NextResponse.json(
      { valid: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
