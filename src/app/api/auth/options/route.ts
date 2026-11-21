import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth/config";

/** Which sign-in options work on this deployment, so the login screens only show those. */
export async function GET() {
  return NextResponse.json(getAuthOptions(), {
    headers: { "Cache-Control": "no-store" },
  });
}
