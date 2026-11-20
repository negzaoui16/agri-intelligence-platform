import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

export function withApiRateLimit(
  request: Request,
  bucketName: string,
  capacity = 60
): NextResponse | null {
  const clientId = getClientIdentifier(request);
  const res = checkRateLimit(`${bucketName}:${clientId}`, capacity, capacity);
  if (!res.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please retry shortly.",
        retryAfterMs: res.resetAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(res.resetAfterMs / 1000)),
        },
      }
    );
  }
  return null;
}

export function apiError(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status });
}
