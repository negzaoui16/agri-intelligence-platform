"use client";

import { Badge } from "@/components/ui/primitives";
import { formatTimestamp } from "@/lib/utils";
import type { DataProvenanceType } from "@/types/agri";
import { CloudOff, Radio } from "lucide-react";

export function DataFreshnessBadge({
  retrievedAt,
  provenance,
  isOffline,
  providerLabel,
}: {
  retrievedAt?: string | null;
  provenance?: DataProvenanceType;
  isOffline?: boolean;
  providerLabel?: string;
}) {
  const ageMinutes = retrievedAt
    ? Math.round((Date.now() - new Date(retrievedAt).getTime()) / 60000)
    : null;
  const isStale = Boolean(isOffline) || (ageMinutes !== null && ageMinutes > 60);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {isStale ? (
        <Badge variant="amber">
          <CloudOff className="h-3 w-3" />
          Cached Snapshot • {formatTimestamp(retrievedAt)} (May be outdated)
        </Badge>
      ) : (
        <Badge variant="green">
          <Radio className="h-3 w-3" />
          Live • {formatTimestamp(retrievedAt)}
        </Badge>
      )}
      {provenance && (
        <Badge
          variant={
            provenance === "OBSERVED"
              ? "blue"
              : provenance === "MODELED"
              ? "amber"
              : "neutral"
          }
        >
          {provenance === "OBSERVED"
            ? "Observed Data"
            : provenance === "MODELED"
            ? "Modeled Estimate"
            : "Assumption"}
        </Badge>
      )}
      {providerLabel && (
        <span className="text-muted-foreground">{providerLabel}</span>
      )}
    </div>
  );
}
