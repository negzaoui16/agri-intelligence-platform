import { NextResponse } from "next/server";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { confirmPasswordReset } from "@/lib/auth/service";
import { resetPasswordSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "auth_reset", 15);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid reset request", 400);
    }
    const updated = await confirmPasswordReset(parsed.data);
    if (!updated) {
      return apiError("Reset code is invalid or expired.", 400);
    }
    return NextResponse.json({ reset: true });
  } catch {
    return apiError("Failed to reset password", 500);
  }
}
