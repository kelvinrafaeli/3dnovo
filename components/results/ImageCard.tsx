"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Maximize2 } from "lucide-react";

interface ImageCardProps {
  title: string;
  imageDataUrl: string;
  model?: string;
  usedFallback?: boolean;
  onRegenerate?: () => void;
  onExpand?: () => void;
  isRegenerating?: boolean;
}

export function ImageCard({
  title,
  imageDataUrl,
  model,
  usedFallback,
  onRegenerate,
  onExpand,
  isRegenerating,
}: ImageCardProps) {
  function handleDownload() {
    const link = document.createElement("a");
    link.href = imageDataUrl;
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.png`;
    link.click();
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      {/* Image */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-[var(--primary)]/5 cursor-pointer"
        onClick={onExpand}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageDataUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          {onExpand && (
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onExpand(); }}
              className="h-10 w-10 rounded-full bg-white/90 shadow-lg"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="h-10 w-10 rounded-full bg-white/90 shadow-lg"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onRegenerate && (
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              disabled={isRegenerating}
              className="h-10 w-10 rounded-full bg-white/90 shadow-lg"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between p-4">
        <h3 className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          {title}
        </h3>
      </div>
    </Card>
  );
}
