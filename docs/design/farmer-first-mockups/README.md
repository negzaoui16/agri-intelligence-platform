# Farmer-first UI mockups

Source of the TerraPulse farmer-first redesign: 8 phone screens, 6 desktop screens and 2 reference boards.
The live, clickable canvas is at https://claude.ai/artifact/SfPu3363pcyH4HfhoSaFei (ask Rayen for access).

These `.dc.html` files are design-canvas source, not app code. Open them in a text editor to read the exact
copy, colors, sizes and layout; they do not render on their own outside the canvas.

## Files

| File | Screen | Farmer question |
|---|---|---|
| `Principles.dc.html` | 8 design rules | – |
| `Words.dc.html` | Word swap table: jargon → farmer words (EN + AR) | – |
| `Main.dc.html` / `desktop/DeskHome.dc.html` | Home | "Is my farm OK today?" |
| `AddFarm.dc.html` / `desktop/DeskAddFarm.dc.html` | Add my farm (step 1 of 3) | "Where is my farm?" |
| `Water.dc.html` / `desktop/DeskWater.dc.html` | Water | "Do I have enough water?" |
| `Sun.dc.html` / `desktop/DeskSun.dc.html` | Sun power | "Can the sun run my pump?" |
| `Weather.dc.html` | Weather (phone only so far) | "Should I water today?" |
| `Ask.dc.html` / `desktop/DeskAsk.dc.html` | Ask | Any question, answered in one sentence first |
| `Report.dc.html` / `desktop/DeskReport.dc.html` | Farm report | "Is this farm a good choice?" |
| `HomeArabic.dc.html` | Home in Arabic, right to left | – |
| `canvas.json` | Canvas layout (positions of the boards) | – |

## Design tokens used

- Font: Atkinson Hyperlegible (Latin), Noto Sans Arabic (Arabic). Body ≥ 16px, buttons 48–60px tall.
- Background `#F6F4EE`, cards `#FFFFFF` with `#E4DFD2` border, text `#17251C`, secondary text `#4A5A4F`.
- Good `#2E6B3A` on `#E3EFE2` · Problem `#8A4B00` on `#FCEFD9` (border `#E2B66B`) · Water `#1D4F91` on `#E6EEF9` · Sun `#C98A1B`.
- Status is always word + icon + color, never color alone.

Numbers in the mockups are real values from the demo farm "Mitidja Plain Citrus & Market Estate" (peak July demand 621 m³/day,
pump 28 m³/h × 7 h = 196 m³/day, PVGIS 18,816 kWh/yr, July solar coverage 59%). Panel counts assume 500 W panels.
