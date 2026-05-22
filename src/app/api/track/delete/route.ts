import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
	anonymousUserProfiles,
	funnel as funnelTable,
	funnelEvent,
	funnelSession,
	funnelWebVital,
} from "@/db/schema";

const DeleteRequestSchema = z.object({
	anonymousId: z.string().optional(),
	userId: z.string().optional(),
});

/**
 * GDPR Right to be Forgotten
 * Delete all tracking data for a user/anonymous visitor
 */
export async function POST(req: NextRequest) {
	try {
		// Get headers from request
		const apiKey = req.headers.get("X-Aurea-API-Key");
		const funnelId = req.headers.get("X-Aurea-Funnel-ID");

		if (!apiKey || !funnelId) {
			return NextResponse.json(
				{ error: "Missing API key or Funnel ID" },
				{
					status: 401,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// Verify funnel and API key
		const funnel = await db.query.funnel.findFirst({
			where: and(
				eq(funnelTable.id, funnelId),
				eq(funnelTable.apiKey, apiKey),
				eq(funnelTable.funnelType, "EXTERNAL")
			),
			columns: { id: true },
		});

		if (!funnel) {
			return NextResponse.json(
				{ error: "Invalid API key or Funnel ID" },
				{
					status: 401,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// Parse request body
		const body = await req.json();
		const { anonymousId, userId } = DeleteRequestSchema.parse(body);

		if (!anonymousId && !userId) {
			return NextResponse.json(
				{ error: "Must provide either anonymousId or userId" },
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		await db.transaction(async (tx) => {
			if (anonymousId) {
				await tx
					.delete(funnelEvent)
					.where(
						and(eq(funnelEvent.anonymousId, anonymousId), eq(funnelEvent.funnelId, funnel.id))
					);
				await tx
					.delete(funnelWebVital)
					.where(
						and(eq(funnelWebVital.anonymousId, anonymousId), eq(funnelWebVital.funnelId, funnel.id))
					);
				await tx
					.delete(funnelSession)
					.where(
						and(eq(funnelSession.anonymousId, anonymousId), eq(funnelSession.funnelId, funnel.id))
					);
				await tx
					.update(anonymousUserProfiles)
					.set({ deletionRequestedAt: new Date() })
					.where(eq(anonymousUserProfiles.id, anonymousId));
			}

			if (userId) {
				await tx
					.delete(funnelEvent)
					.where(and(eq(funnelEvent.userId, userId), eq(funnelEvent.funnelId, funnel.id)));
				await tx
					.delete(funnelSession)
					.where(and(eq(funnelSession.userId, userId), eq(funnelSession.funnelId, funnel.id)));
				await tx
					.update(anonymousUserProfiles)
					.set({ deletionRequestedAt: new Date() })
					.where(eq(anonymousUserProfiles.identifiedUserId, userId));
			}
		});

		return NextResponse.json(
			{
				success: true,
				message: "Data deletion request processed",
			},
			{
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
				},
			},
		);
	} catch (error) {
		console.error("[Delete API] Error processing deletion request:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request format", details: error.issues },
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{
				status: 500,
				headers: {
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers":
				"Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
		},
	});
}
