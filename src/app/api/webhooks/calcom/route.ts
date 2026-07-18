import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: "This webhook endpoint has been retired." },
    { status: 410 },
  );
}
