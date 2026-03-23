"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import type { Plan3DResults } from "@/context/ProjectContext";

interface RoomRenderQueueProps {
  results: Plan3DResults | null;
  expectedRooms: string[];
}

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function RoomRenderQueue({
  results,
  expectedRooms,
}: RoomRenderQueueProps) {
  if (expectedRooms.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
        Comodos renderizados
      </h3>
      <div className="flex flex-wrap gap-2">
        {expectedRooms.map((room) => {
          const roomResult = results?.rooms.find(
            (r) => normalize(r.room) === normalize(room)
          );
          const completed = !!roomResult;
          return (
            <div
              key={room}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                completed
                  ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                  : "border-[var(--primary)]/10 bg-white"
              )}
            >
              {completed ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)]">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]/30" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  completed
                    ? "text-[var(--primary)]"
                    : "text-[var(--primary)]/40"
                )}
              >
                {room}
              </span>

              {/* Mini thumbnail */}
              {roomResult?.result.imageDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={roomResult.result.imageDataUrl}
                  alt={room}
                  className="h-8 w-8 rounded border border-border/40 object-cover"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
