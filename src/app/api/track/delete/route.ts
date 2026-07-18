import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
} as const;

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Anonymous tracking credentials cannot authorize deletion. Submit an authenticated privacy request through the organization that collected the data.",
    },
    { status: 410, headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
