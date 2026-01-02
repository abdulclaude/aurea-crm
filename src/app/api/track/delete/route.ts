import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";

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
		const funnel = await db.funnel.findFirst({
			where: {
				id: funnelId,
				apiKey,
				funnelType: "EXTERNAL",
			},
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

		// Delete all data for this user
		const deleteOperations = [];

		if (anonymousId) {
			// Delete events
			deleteOperations.push(
				db.funnelEvent.deleteMany({
					where: {
						anonymousId,
						funnelId: funnel.id,
					},
				}),
			);

			// Delete web vitals
			deleteOperations.push(
				db.funnelWebVital.deleteMany({
					where: {
						anonymousId,
						funnelId: funnel.id,
					},
				}),
			);

			// Delete sessions
			deleteOperations.push(
				db.funnelSession.deleteMany({
					where: {
						anonymousId,
						funnelId: funnel.id,
					},
				}),
			);

			// Delete or mark profile for deletion
			deleteOperations.push(
				db.anonymousUserProfile.updateMany({
					where: {
						id: anonymousId,
					},
					data: {
						deletionRequestedAt: new Date(),
					},
				}),
			);
		}

		if (userId) {
			// Delete events
			deleteOperations.push(
				db.funnelEvent.deleteMany({
					where: {
						userId,
						funnelId: funnel.id,
					},
				}),
			);

			// Delete sessions
			deleteOperations.push(
				db.funnelSession.deleteMany({
					where: {
						userId,
						funnelId: funnel.id,
					},
				}),
			);

			// Update profiles
			deleteOperations.push(
				db.anonymousUserProfile.updateMany({
					where: {
						identifiedUserId: userId,
					},
					data: {
						deletionRequestedAt: new Date(),
					},
				}),
			);
		}

		// Execute all deletions in parallel
		await Promise.all(deleteOperations);

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
