"use client";

import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { useFarms } from "@/hooks/useFarms";
import { CloudOff, MapPin, Tractor } from "lucide-react";

export default function OfflinePage() {
  const { farms } = useFarms();

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="amber">
              <CloudOff className="h-3.5 w-3.5" />
              Offline Field Mode
            </Badge>
          </div>
          <CardTitle className="text-xl mt-2">
            You are currently offline — Cached Farms & Local Calculators Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            External weather, satellite WaPOR, and PVGIS forecasts require connectivity to fetch new updates. You can still inspect previously cached farms, draw boundaries, run deterministic pump & FAO-56 calculations, and queue edits for automatic sync.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="primary">Open Cached Dashboard</Button>
            </Link>
            <Link href="/farms">
              <Button variant="outline">
                <Tractor className="h-4 w-4" />
                Manage Farms Offline
              </Button>
            </Link>
            <Link href="/water">
              <Button variant="outline">Pump & Water Calculators</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Offline Properties ({farms.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {farms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No farms cached locally yet.</p>
          ) : (
            farms.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.centerLat.toFixed(4)}°, {f.centerLon.toFixed(4)}° • {f.areaHectares.toFixed(2)} ha
                    </p>
                  </div>
                </div>
                <Link href="/reports">
                  <Button size="sm" variant="outline">View Reports</Button>
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
