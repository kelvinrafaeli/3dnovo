"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { RenderResult } from "@/context/ProjectContext";

interface Plan2DPreviewProps {
  result: RenderResult | null;
}

export function Plan2DPreview({ result }: Plan2DPreviewProps) {
  if (!result) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[var(--accent)]" />
            Planta 2D Humanizada
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {result.imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.imageDataUrl}
            alt="Planta 2D humanizada"
            className="w-full rounded-lg border border-border/40"
          />
        )}
      </CardContent>
    </Card>
  );
}
