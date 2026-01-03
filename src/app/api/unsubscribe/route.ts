import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the unsubscribe token with contact
    const unsubscribeToken = await prisma.unsubscribeToken.findUnique({
      where: { token },
      include: {
        contact: {
          select: {
            id: true,
            emailUnsubscribed: true,
          },
        },
      },
    });

    if (!unsubscribeToken) {
      return NextResponse.json(
        { success: false, error: "Invalid unsubscribe link" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (unsubscribeToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This unsubscribe link has expired" },
        { status: 410 }
      );
    }

    // Check if already used
    if (unsubscribeToken.usedAt) {
      return NextResponse.json(
        { success: false, error: "This link has already been used" },
        { status: 410 }
      );
    }

    // If already unsubscribed, just mark the token as used
    if (unsubscribeToken.contact.emailUnsubscribed) {
      await prisma.unsubscribeToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "You are already unsubscribed",
      });
    }

    // Perform the unsubscribe in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the contact
      await tx.contact.update({
        where: { id: unsubscribeToken.contactId },
        data: {
          emailUnsubscribed: true,
          emailUnsubscribedAt: new Date(),
        },
      });

      // Mark the token as used
      await tx.unsubscribeToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      // If there's a campaign, increment the unsubscribed count
      if (unsubscribeToken.campaignId) {
        await tx.campaign.update({
          where: { id: unsubscribeToken.campaignId },
          data: {
            unsubscribed: { increment: 1 },
          },
        });

        // Also update the campaign recipient status
        await tx.campaignRecipient.updateMany({
          where: {
            campaignId: unsubscribeToken.campaignId,
            contactId: unsubscribeToken.contactId,
          },
          data: {
            status: "UNSUBSCRIBED",
            unsubscribedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while unsubscribing" },
      { status: 500 }
    );
  }
}
