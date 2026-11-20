import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/prisma";

export async function GET() {
  const prisma = getPrismaClient();
  let postgresStatus = "local-persistent-fallback";
  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresStatus = "postgis-connected";
    } catch {
      postgresStatus = "postgres-unreachable-using-fallback";
    }
  }

  return NextResponse.json({
    status: "ok",
    service: "TerraPulse Agri Intelligence API",
    databaseMode: postgresStatus,
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
    timestamp: new Date().toISOString(),
  });
}
