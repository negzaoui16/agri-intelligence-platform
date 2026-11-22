# FarmBrain Guide for Farmers

## What is FarmBrain?
FarmBrain uses the information you already gave TerraPulse — your field size, crops, pump, solar panels, local weather, and optional field sensor — to answer two simple questions:

1. **Farm Potential (`/farmbrain`)**: *How much water, power, time, and money can I save using smart irrigation?*
2. **Decision Simulator (`/simulator`)**: *What happens to my crops, water, and pump if I change something before spending any money?*

You never need to re-type your farm size, soil, or pump specs.

---

## 1. Understanding Your Savings (`/farmbrain`)
- **Water saved**: Shown both in percentage and real volume (cubic metres `m³` and litres per year).
- **Electricity saved**: Shows pump electricity (`kWh/year`) saved by avoiding unnecessary runs.
  - *If solar panels run your pump*: Electricity cost saved is shown as **0 TND**, because sunlight already gives you free pumping electricity — your main gains are saving underground water and reducing pump wear.
- **Local prices (TND)**: Enter your own local water and STEG electricity prices if you know them. TerraPulse never guesses your prices.
- **How savings are verified**:
  - **Starting estimate**: Computed right after onboarding from your farm profile.
  - **Live-updated**: Updated automatically once a soil sensor sends a reading.
  - **Verified from actual pump runs**: Once 24 hours of sensor readings record actual pump cycles, FarmBrain measures real water used vs. your old schedule.

---

## 2. Testing Decisions Safely (`/simulator`)
Nothing in the Simulator turns on your real pump or changes your real farm profile. You can test 5 real situations:

1. **Water Shortage**: Enter how many litres you have available today (`1,000 L`, `2,000 L`, `5,000 L`, or custom). FarmBrain prioritizes sensitive crops instead of cutting every plot equally.
2. **Change Crop**: Compare switching a plot to another crop and see the water, cycle length, and expected harvest impact.
3. **Hotter / Drier Weather**: Test a heatwave (`+3°C`) or dry spell (`-40%` rain) before it hits.
4. **Watering Schedule**: Compare fixed watering every 2 days against sensor-triggered or smart AI timing over 30 days.
5. **Expand Farm Area**: Check whether adding extra hectares overloads your current pump or solar panels.

Every test you run can be named, saved, reloaded later, deleted, or compared side by side.
