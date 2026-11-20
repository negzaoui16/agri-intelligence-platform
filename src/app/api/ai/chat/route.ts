import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { runAIChat } from "@/lib/ai/assistant-service";
import { getActiveSessionUser } from "@/lib/auth/session";
import { appendConversationMessages, getConversationMessages } from "@/lib/db/repository";
import { aiChatRequestSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId") || undefined;
  return NextResponse.json({ messages: getConversationMessages(farmId) });
}

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "ai_chat", 25);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = aiChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid AI chat request", 400, parsed.error.flatten());
    }

    const user = await getActiveSessionUser();
    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user" as const,
      content: parsed.data.message,
      createdAt: new Date().toISOString(),
    };

    const assistantMsg = await runAIChat({
      farmId: parsed.data.farmId,
      compareFarmId: parsed.data.compareFarmId,
      message: parsed.data.message,
      history: parsed.data.history,
      groqApiKeyOverride: parsed.data.groqApiKeyOverride,
      groqModelOverride: parsed.data.groqModelOverride,
    });

    appendConversationMessages(user.id, parsed.data.farmId, [userMsg, assistantMsg]);

    return NextResponse.json({ message: assistantMsg });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "AI assistant failed",
      500
    );
  }
}
