/**
 * Copies records that only exist in the local JSON store (.data/agri-platform-db.json)
 * into Postgres: accounts, farmer profiles, onboarding progress, complete farms
 * (boundary, pins, crops, water sources, soil, solar, pump) and feasibility reports.
 *
 * Dry run by default. Never overwrites a Postgres farm that is newer than the local copy.
 *
 *   npx tsx scripts/backfill-local-to-postgres.ts                       # dry run, all users
 *   npx tsx scripts/backfill-local-to-postgres.ts --email you@x.com     # dry run, one user
 *   npx tsx scripts/backfill-local-to-postgres.ts --email you@x.com --apply
 *   npx tsx scripts/backfill-local-to-postgres.ts --file path/to/agri-platform-db.json
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { pgSaveFarm, pgSaveProfile, pgSaveProgress, pgSaveReport, pgSaveUser } from "../src/lib/db/pg-store";
import type { LocalDbSnapshot } from "../src/lib/db/local-store";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (run with the project .env loaded)");
  }
  const apply = process.argv.includes("--apply");
  const onlyEmail = arg("--email")?.toLowerCase();
  const file = arg("--file") ?? path.join(process.cwd(), ".data", "agri-platform-db.json");
  const local = JSON.parse(fs.readFileSync(file, "utf8")) as LocalDbSnapshot;
  const prisma = new PrismaClient();
  const act = async (label: string, fn: () => Promise<unknown>) => {
    console.log(`${apply ? "WRITE" : "would write"}  ${label}`);
    if (apply) await fn();
  };

  const users = local.users.filter((u) => !onlyEmail || u.email.toLowerCase() === onlyEmail);
  if (onlyEmail && users.length === 0) console.log(`No local account for ${onlyEmail}`);

  for (const user of users) {
    console.log(`\n# ${user.email} (${user.id})`);
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      const clash = await prisma.user.findUnique({ where: { email: user.email } });
      if (clash) {
        console.log(`  SKIP user: email already used by ${clash.id} in Postgres`);
        continue;
      }
      await act("account", () => pgSaveUser(prisma, user));
    }

    const profile = local.farmerProfiles.find((p) => p.userId === user.id);
    if (profile && !(await prisma.farmerProfile.findUnique({ where: { userId: user.id } }))) {
      await act("farmer profile", () => pgSaveProfile(prisma, profile));
    }
    const progress = local.onboardingProgress.find((o) => o.userId === user.id);
    if (progress && !(await prisma.onboardingProgress.findUnique({ where: { userId: user.id } }))) {
      await act("onboarding progress", () => pgSaveProgress(prisma, progress));
    }

    for (const farm of local.farms.filter((f) => f.userId === user.id)) {
      const dbFarm = await prisma.farm.findUnique({ where: { id: farm.id } });
      // 5 s tolerance: the old code wrote Postgres a few ms after the local file for the same save
      if (dbFarm && dbFarm.updatedAt.getTime() > new Date(farm.updatedAt).getTime() + 5000) {
        console.log(`  SKIP farm "${farm.name}": Postgres copy is newer`);
        continue;
      }
      await act(
        `farm "${farm.name}" (pins ${farm.pins.length}, crops ${farm.crops?.length ?? 0}, water ${
          farm.farmerWaterSources?.length ?? 0
        }, boundary ${farm.boundary ? "yes" : "no"})`,
        () => pgSaveFarm(prisma, farm)
      );
      for (const report of local.reports.filter((r) => r.farmId === farm.id)) {
        if (!(await prisma.feasibilityReport.findUnique({ where: { id: report.id } }))) {
          await act(`  report ${report.id}`, () => pgSaveReport(prisma, report));
        }
      }
    }
  }

  await prisma.$disconnect();
  if (!apply) console.log("\nDry run only. Re-run with --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
