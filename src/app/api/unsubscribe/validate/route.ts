import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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
    // Find the unsubscribe token
    const unsubscribeToken = await prisma.unsubscribeToken.findUnique({
      where: { token },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            emailUnsubscribed: true,
          },
        },
      },
    });

    if (!unsubscribeToken) {
      return NextResponse.json(
        { valid: false, error: "Invalid unsubscribe link" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (unsubscribeToken.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This unsubscribe link has expired" },
        { status: 410 }
      );
    }

    // Check if already used
    if (unsubscribeToken.usedAt) {
      return NextResponse.json(
        { valid: false, error: "This link has already been used" },
        { status: 410 }
      );
    }

    // Check if already unsubscribed
    if (unsubscribeToken.contact.emailUnsubscribed) {
      return NextResponse.json({
        valid: true,
        alreadyUnsubscribed: true,
        email: unsubscribeToken.contact.email,
        contactName: unsubscribeToken.contact.name,
      });
    }

    return NextResponse.json({
      valid: true,
      email: unsubscribeToken.contact.email,
      contactName: unsubscribeToken.contact.name,
    });
  } catch (error) {
    console.error("Error validating unsubscribe token:", error);
    return NextResponse.json(
      { valid: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
