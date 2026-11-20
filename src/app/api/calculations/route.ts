import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { calculateCropWaterRequirements } from "@/lib/engines/fao56-calculator";
import { calculatePumpEnergy } from "@/lib/engines/pump-calculator";
import { compareSolarAndPumpEnergy } from "@/lib/engines/solar-irrigation-matcher";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pump = calculatePumpEnergy(body.pumpInput);
    const cropWater = body.monthlyClimate
      ? calculateCropWaterRequirements({
          cropCode: body.cropCode || "tomato",
          irrigatedAreaHa: Number(body.irrigatedAreaHa || 5),
          irrigationMethod: body.irrigationMethod || "DRIP",
          plantingMonth: Number(body.plantingMonth || 3),
          monthlyClimate: body.monthlyClimate,
          soilProfile: body.soilProfile,
          pumpFlowRateM3Hr: pump.flowRateM3Hr,
        })
      : undefined;

    const solarVsPump = body.solarMonthly
      ? compareSolarAndPumpEnergy({
          solarMonthly: body.solarMonthly,
          pumpResult: pump,
          cropWaterResult: cropWater,
        })
      : undefined;

    return NextResponse.json({ pump, cropWater, solarVsPump });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Calculation error", 400);
  }
}
