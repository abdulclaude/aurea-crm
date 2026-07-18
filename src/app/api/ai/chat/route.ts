import { NextRequest, NextResponse } from "next/server";
import {
  convertToModelMessages,
  safeValidateUIMessages,
  streamText,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { CredentialType } from "@/db/enums";
import { GEMINI_ASSISTANT_MODEL } from "@/features/ai/constants";
import {
  AiRequestScopeError,
  resolveAiRequestScope,
} from "@/features/ai/server/request-scope";
import {
  resolveScopedAiCredential,
  ScopedAiCredentialError,
} from "@/features/ai/server/scoped-credential";
import {
  AiRateLimitError,
  finishAiUsageLog,
  startAiUsageLog,
} from "@/features/ai/server/usage-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AI_INPUT_CHARS = 100_000;

type ActiveUsageLog = {
  id: string;
  userId: string;
  organizationId: string;
  locationId: string | null;
};

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let activeLog: ActiveUsageLog | null = null;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || !("messages" in body)) {
      return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
    }
    const validatedMessages = await safeValidateUIMessages({
      messages: body.messages,
    });
    if (
      !validatedMessages.success ||
      validatedMessages.data.length > 30 ||
      validatedMessages.data.some(
        (message) => message.role !== "user" && message.role !== "assistant",
      ) ||
      JSON.stringify(validatedMessages.data).length > MAX_AI_INPUT_CHARS
    ) {
      return NextResponse.json({ error: "Invalid chat messages" }, { status: 400 });
    }

    const scope = await resolveAiRequestScope({
      sessionToken: session.session.token,
      userId: session.user.id,
    });
    const scopedCredential = await resolveScopedAiCredential({
      organizationId: scope.organizationId,
      locationId: scope.locationId,
      type: CredentialType.GEMINI,
    });
    const google = createGoogleGenerativeAI({
      apiKey: scopedCredential.apiKey,
    });

    const systemPrompt = `You are Aurea AI, an intelligent assistant built into the Aurea Studio platform, a fitness studio management system.
${scope.locationName ? `The user is currently managing "${scope.locationName}".` : ""}

You help studio owners and managers with:
- Class scheduling and capacity planning
- Membership management and retention strategies
- Check-in and attendance insights
- Member engagement and communication
- Business growth and revenue optimisation
- Instructor management and payroll
- Studio operations and best practices

Be concise, practical, and focused on studio operations. When discussing numbers or strategies, tailor advice to fitness studios in the UK. Use British English spelling.`;
    const boundedSystemPrompt = `${systemPrompt}
You do not have access to live CRM records, schedules, memberships, or revenue in this chat. Never invent current business data; direct the user to the relevant Aurea view when live figures are required.`;

    const logId = await startAiUsageLog({
      userId: scope.userId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
      credentialId: scopedCredential.id,
      model: GEMINI_ASSISTANT_MODEL,
      title: "Aurea AI chat",
      intent: "assistant.chat",
    });
    activeLog = {
      id: logId,
      userId: scope.userId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    };

    const result = streamText({
      model: google(GEMINI_ASSISTANT_MODEL),
      system: boundedSystemPrompt,
      messages: convertToModelMessages(validatedMessages.data),
      maxOutputTokens: 4000,
      onFinish: async () => {
        await finishAiUsageLog({
          ...activeLog!,
          status: "COMPLETED",
        });
      },
      onError: async ({ error }) => {
        await finishAiUsageLog({
          ...activeLog!,
          status: "FAILED",
          errorCode: error instanceof Error ? error.name : "ProviderError",
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (activeLog) {
      try {
        await finishAiUsageLog({
          ...activeLog,
          status: "FAILED",
          errorCode: error instanceof Error ? error.name : "ProviderError",
        });
      } catch (logError) {
        console.error("Aurea AI usage log update failed", {
          errorName: logError instanceof Error ? logError.name : "UnknownError",
        });
      }
    }
    if (error instanceof AiRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
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

    console.error("Aurea AI chat failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
