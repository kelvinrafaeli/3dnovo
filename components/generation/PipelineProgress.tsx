"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, AlertCircle, MousePointerClick } from "lucide-react";
import type { PipelineStage } from "@/hooks/useGenerationPipeline";

interface PipelineProgressProps {
  stage: PipelineStage;
  progress: number;
  stageLabel: string;
  error: string | null;
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "generating_prompts", label: "Analise" },
  { key: "rendering_2d", label: "Planta 2D" },
  { key: "extracting_data", label: "Extracao" },
  { key: "rendering_3d_overview", label: "3D Geral" },
  { key: "awaiting_selection", label: "Selecao" },
  { key: "rendering_3d_rooms", label: "Comodos 3D" },
];

function getStageIndex(stage: PipelineStage): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : stage === "complete" ? STAGES.length : -1;
}

export function PipelineProgress({
  stage,
  progress,
  stageLabel,
  error,
}: PipelineProgressProps) {
  const currentIndex = getStageIndex(stage);
  const isError = stage === "error";
  const isComplete = stage === "complete";

  return (
    <div className="space-y-8">
      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        {STAGES.map((s, i) => {
          const isDone = currentIndex > i || isComplete;
          const isCurrent = currentIndex === i && !isError;
          const isAwaiting = s.key === "awaiting_selection" && isCurrent;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500",
                    isDone
                      ? "border-[var(--success)] bg-[var(--success)] text-white"
                      : isCurrent
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : isError && currentIndex === i
                      ? "border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]"
                      : "border-[var(--primary)]/15 bg-white text-[var(--primary)]/30"
                  )}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" />
                  ) : isAwaiting ? (
                    <MousePointerClick className="h-5 w-5 animate-pulse" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isError && currentIndex === i ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isDone || isCurrent
                      ? "text-[var(--primary)]"
                      : "text-[var(--primary)]/40"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mt-[-20px] h-0.5 flex-1 rounded-full transition-all duration-500",
                    isDone ? "bg-[var(--success)]" : "bg-[var(--primary)]/10"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2.5" />

      {/* Stage label */}
      <div className="text-center">
        {isError ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--error)]">{error}</p>
          </div>
        ) : (
          <p className="text-sm font-medium text-[var(--primary)]/70">
            {stageLabel}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {progress}% concluido
        </p>
      </div>
    </div>
  );
}
