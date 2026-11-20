# Prompt: implement the farmer-first UI

Copy everything below the line into Claude Code (or your coding agent) from the repo root,
on a new branch made from an up-to-date `main`.

---

You are working in the TerraPulse repo (Next.js App Router, TypeScript, Tailwind, Prisma + Supabase/PostGIS).
Your job: rebuild the UI so a farmer with no engineering background can use it, following the mockups in
`docs/design/farmer-first-mockups/`. The science and the APIs stay the same; the words, the order and the
navigation change.

## 0. Setup (do this first)

1. `git switch main && git pull`, then `git switch -c feat/farmer-first-ui`.
2. `npm install`, then `npx prisma migrate deploy` and `npx prisma generate` (migration 0003 is new).
3. `npm test` must pass (21 tests) before and after your work. Tests use their own throwaway store (`.data-test/`),
   never Supabase and never your `.data/` folder.
4. Read, in this order: `docs/design/farmer-first-mockups/README.md`, `Principles.dc.html`, `Words.dc.html`,
   then each screen file. The `.dc.html` files are HTML with inline styles: copy their wording, sizes and
   colors exactly; rebuild them as React/Tailwind components (do not import the .dc.html files).

## 1. Rules you must follow everywhere

- One farmer question per page; the page title is that question ("Do I have enough water?").
- Answer first in one short sentence ("Not in July."), numbers second, formulas/sources only inside a
  collapsed "How do we know this?" or "For your engineer" section.
- Every problem shown comes with "What can you do?" and 2–3 concrete options.
- Status = word + icon + color (Good / OK / Problem). Never color alone.
- Body text ≥ 16px, tap targets ≥ 44px (main buttons 48–60px), high contrast, light theme by default.
- Use the word list in `Words.dc.html`. No acronyms in farmer-facing text: ET₀, PVGIS, WaPOR, HydroSHEDS,
  TDH, kWp, Aridity Index, FAO-56 only appear in engineer sections.
- Technical fields (pump efficiency, pipe size, tilt, losses…) are optional with "Skip if you don't know";
  when skipped, use the existing defaults and label the result "our estimate".

## 2. Navigation

Replace the 8-item nav in `src/components/layout/AppShell.tsx` with 4 items: **Home** (`/`), **My farm**
(`/farms`), **Ask** (`/assistant`), **Report** (`/reports`). Phone: bottom bar with these 4. Desktop: left
sidebar with the same 4 plus a "Check" group (Water `/water`, Sun power `/solar`, Weather `/environmental`)
each showing its one-word status (see `desktop/DeskHome.dc.html`). `/map` becomes part of My farm / Add farm.
Keep the old routes working.

## 3. Screens (mockup → route)

| Mockup | Route | Notes |
|---|---|---|
| `Main` / `DeskHome` | `/` | Top card = the single most important problem (or "All good"). Then 3 tiles, Today, Next steps. |
| `AddFarm` / `DeskAddFarm` | `/farms` new + `/onboarding` | 3 steps: Where → What you grow → Water. "I am on my farm now" (GPS) or village search; boundary optional. Reuse the onboarding API. |
| `Water` / `DeskWater` | `/water` | Compare `irrigation.peakDailyWaterM3` with pump supply `pumpConfig.flowRateM3Hr × operatingHoursDay`. Options: bigger pump (needed m³/h = peak ÷ hours), pump longer (hours = peak ÷ flow), second source (top 3 of `waterSources`, height difference as "Easy"/"Hard: N m lower"). Keep the "go and check" warning. |
| `Sun` / `DeskSun` | `/solar` | Year: PVGIS annual kWh vs pump annual kWh. Worst month: `solarVsPump.worstMonthCoveragePct` shown as filled blocks out of 10. Options: tank / battery / grid (existing buffer sizing). |
| `Weather` | `/environmental` | "Should I water today?" from forecast rain + ET₀ ("soil loses about N mm a day"). Warnings as words. WaPOR/DEM go to an engineer section. |
| `Ask` / `DeskAsk` | `/assistant` | Big mic button + "Listen" (Web Speech API). Side panel "What I know about your farm" with a fix link. Assistant answers must start with a one-sentence direct answer to the question asked (fix the template in `src/lib/ai/` that currently returns a generic multi-section summary starting at "2."). |
| `Report` / `DeskReport` | `/reports` | Plain verdict sentence + Good/Problem/OK cards + best crops + "check in person" + collapsed engineer details. PDF export keeps the technical detail. |
| `HomeArabic` | all | Arabic RTL support (see §5). |

## 4. Honest numbers (logic changes, small but required)

- `src/lib/services/analysis-orchestrator.ts` (~line 196): the score starts at 82 and never checks whether
  the pump can deliver peak water. Add a pump-capacity check: if pump daily supply < peak daily demand,
  subtract points proportionally and add a "Water supply too small in <peak month>" risk; the verdict sentence
  must mention it. The home card, water page and report must agree on the same numbers (one shared selector).
- Dashboard "Solar Pump Coverage 100%" must not be the headline when the worst month is below 100%: show
  "Enough most of the year, short in <month>".
- `src/lib/db/defaults.ts` says Manual irrigation = 55% / None = 100% efficiency but the farm form labels say
  65% / 55%. Pick one source of truth and make the labels read from it.

## 5. Languages

Add i18n (e.g. `next-intl`) with `en`, `fr`, `ar`. Arabic uses `dir="rtl"`, Noto Sans Arabic, mirrored arrows,
Western digits, and the Maghreb month names (جانفي، فيفري، مارس، أفريل، ماي، جوان، جويلية، أوت، سبتمبر، أكتوبر، نوفمبر، ديسمبر).
Start from the strings in the mockups and `Words.dc.html`; mark Arabic/French strings for review by a native speaker.

## 6. Known bugs to fix while you are in these files

1. `src/app/farms/page.tsx`: Area input has `step="0.1"`, so any farm with a drawn boundary (4-decimal area)
   cannot be saved. Use `step="any"` (same for lat/lon) and round only for display.
2. `src/app/farms/page.tsx`: Delete removes a farm with one click. Add a confirm dialog naming the farm.
3. `POST /api/farms` drops crops, pump, solar, location fields (only PATCH accepts them). Accept them on create.
4. `src/lib/auth/session.ts`: with no/invalid cookie every request becomes the demo user. Only allow that in
   development (`NODE_ENV !== "production"`), otherwise return 401.
5. `src/hooks/useAuth.ts`: the offline cache is only cleared on logout; also clear it on login/register so a
   new user never sees the previous user's farms.

## 7. Done means

- All pages above match the mockups' wording and hierarchy on phone (390px) and desktop (1440px); no
  horizontal scroll at 390px.
- No acronym from the word list appears outside engineer sections.
- The demo farm shows "Water will be short in July" on Home, Water and Report with the same numbers.
- `npm test`, `npx tsc --noEmit` and `npm run build` pass; add tests for the pump-capacity check and the
  shared numbers selector.
- Commit in small steps (nav, each page, logic, i18n, bug fixes) and open a PR against `main`
  with before/after screenshots.
