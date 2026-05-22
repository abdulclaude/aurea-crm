import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";
const MODEL_ID = "deepseek-v4-pro";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENCODE_GO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { messages, locationName } = body as {
    messages: Parameters<typeof convertToModelMessages>[0];
    locationName?: string;
  };

  const client = createOpenAI({
    apiKey,
    baseURL: OPENCODE_GO_BASE_URL,
  });

  const systemPrompt = `You are Aurea AI, an intelligent assistant built into the Aurea Studio platform — a fitness studio management system.
${locationName ? `The user is currently managing "${locationName}".` : ""}

You help studio owners and managers with:
- Class scheduling and capacity planning
- Membership management and retention strategies
- Check-in and attendance insights
- Member engagement and communication
- Business growth and revenue optimisation
- Instructor management and payroll
- Studio operations and best practices

Be concise, practical, and focused on studio operations. When discussing numbers or strategies, tailor advice to fitness studios in the UK. Use British English spelling.`;

  const result = streamText({
    model: client(MODEL_ID),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    maxOutputTokens: 4000,
  });

  return result.toTextStreamResponse();
}
