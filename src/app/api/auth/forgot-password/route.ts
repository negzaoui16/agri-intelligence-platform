import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth/config";
import { apiError, withApiRateLimit } from "@/lib/api/http";
import { requestPasswordReset } from "@/lib/auth/service";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = withApiRateLimit(request, "auth_forgot", 15);
  if (limited) return limited;

  // Reset codes can't be emailed yet; showing them on screen is only safe in development
  if (!getAuthOptions().passwordReset) {
    return apiError(
      "Password reset by email is not available yet. Please contact support to recover your account.",
      503
    );
  }
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Enter a valid email address", 400);
    }
    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json({
      message:
        "If an account exists for that email, password recovery instructions have been generated.",
      ...result,
    });
  } catch {
    return apiError("Unable to process password reset request", 500);
  }
}
