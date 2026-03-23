"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/ProjectContext";
import { useGenerationPipeline } from "@/hooks/useGenerationPipeline";
import { PipelineProgress } from "./PipelineProgress";
import { Plan2DPreview } from "./Plan2DPreview";
import { RoomRenderQueue } from "./RoomRenderQueue";
import { RoomSelector } from "./RoomSelector";
import { planApi } from "@/lib/api/plan";
import { buildConsistencyLock } from "@/lib/consistency";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, Sparkles, Loader2 } from "lucide-react";

export function GenerationOrchestrator() {
  const { state, dispatch } = useProject();
  const { pipeline, runPreSelection, runPostSelection, updatePipeline } =
    useGenerationPipeline();
  const router = useRouter();
  const hasStarted = useRef(false);
  const runPreRef = useRef(runPreSelection);
  runPreRef.current = runPreSelection;

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [rerendering2D, setRerendering2D] = useState(false);
  const [rerendering3D, setRerendering3D] = useState(false);

  // Auto-start pipeline on mount
  useEffect(() => {
    if (hasStarted.current) return;
    if (!state.formData || Object.keys(state.formData).length === 0) return;

    hasStarted.current = true;

    // If we have extraction + 3D overview but no room renders → jump to selection
    if (state.extractedPlanData && state.plan3DResults?.total && state.plan3DResults.rooms.length === 0) {
      updatePipeline({
        stage: "awaiting_selection",
        progress: 55,
        stageLabel: "Selecione os comodos para renderizar em 3D",
        error: null,
        retryAfter: null,
      });
      return;
    }

    // If we have extraction but no 3D overview yet → run pre-selection (will skip to 3D overview)
    if (state.extractedPlanData && !state.plan3DResults?.total) {
      runPreRef.current(state.formData);
      return;
    }

    // If we already have 3D room results → jump to complete
    if (state.plan3DResults && state.plan3DResults.rooms.length > 0) {
      updatePipeline({
        stage: "complete",
        progress: 100,
        stageLabel: "Projeto gerado com sucesso!",
        error: null,
        retryAfter: null,
      });
      return;
    }

    // Normal: run stages 1-4
    runPreRef.current(state.formData);
  }, [state.formData, state.extractedPlanData, state.plan3DResults, updatePipeline]);

  // Initialize local selection when entering awaiting_selection
  useEffect(() => {
    if (pipeline.stage !== "awaiting_selection") return;

    const existing = state.selectedRooms;
    if (existing.length > 0) {
      setLocalSelected(existing);
    } else {
      const all =
        state.generationPackage?.prompts.plan3DRooms.map((r) => r.room) || [];
      setLocalSelected(all);
    }
  }, [pipeline.stage, state.selectedRooms, state.generationPackage]);

  // Build available rooms list with optional area from extraction
  const availableRooms = useMemo(() => {
    const roomPrompts =
      state.generationPackage?.prompts.plan3DRooms || [];
    const planData = state.extractedPlanData?.extractedPlanData as
      | Record<string, unknown>
      | undefined;
    const extractedRooms = Array.isArray(planData?.rooms)
      ? (planData.rooms as Array<{ name?: string; dimensions?: { area_m2?: number } }>)
      : [];

    return roomPrompts.map((rp) => {
      const match = extractedRooms.find(
        (er) =>
          er.name?.toLowerCase().trim() === rp.room.toLowerCase().trim()
      );
      return {
        room: rp.room,
        area: match?.dimensions?.area_m2 ?? undefined,
      };
    });
  }, [state.generationPackage, state.extractedPlanData]);

  const handleToggle = useCallback((room: string) => {
    setLocalSelected((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  }, []);

  const handleConfirm = useCallback(() => {
    dispatch({ type: "SET_SELECTED_ROOMS", payload: localSelected });
    runPostSelection(localSelected);
  }, [localSelected, dispatch, runPostSelection]);

  /** Re-render 2D: generates new 2D → re-extracts → re-renders 3D overview */
  const handleRerender2D = useCallback(async () => {
    const generationPackage = state.generationPackage;
    if (!generationPackage) return;

    setRerendering2D(true);
    try {
      // 1. Re-render 2D
      const render2D = await planApi.render2D(
        generationPackage.prompts.plan2DRenderNanoBanana2.prompt
      );
      const plan2DResult = {
        model: render2D.model,
        usedFallback: render2D.usedFallback,
        text: render2D.text,
        imageDataUrl: render2D.imageDataUrl,
      };
      dispatch({ type: "SET_PLAN_2D", payload: plan2DResult });

      // 2. Re-extract data
      const extraction = await planApi.extract2DData(
        plan2DResult.imageDataUrl,
        generationPackage.roomProgram,
        generationPackage.prompts.plan2DRenderNanoBanana2.prompt
      );
      dispatch({ type: "SET_EXTRACTION", payload: extraction });

      const lock = buildConsistencyLock(
        extraction.extractedPlanData,
        plan2DResult.imageDataUrl,
        (state.formData as Record<string, unknown>).architecturalStyle as string | undefined
      );
      dispatch({ type: "SET_CONSISTENCY_LOCK", payload: lock });

      // 3. Re-render 3D overview
      const allRooms = generationPackage.prompts.plan3DRooms.map((r) => r.room);
      const pkg3D = await planApi.render3DPackage({
        prompts: {
          ...generationPackage.prompts,
          plan3DTotal: generationPackage.prompts.plan3DTotal,
          facade3D: { prompt: "" },
          plan3DRooms: [],
        },
        plan2DImageDataUrl: plan2DResult.imageDataUrl,
        extractedPlanData: extraction.extractedPlanData,
        projectConsistencyLock: lock?.visualSignature ?? null,
        roomProgram: allRooms,
        maxRooms: 0,
      });

      let totalResult = null;
      for (const item of pkg3D.results) {
        if (item.type === "total" && item.result) {
          totalResult = {
            model: item.result.model,
            usedFallback: item.result.usedFallback,
            text: item.result.text,
            imageDataUrl: item.result.imageDataUrl,
          };
        }
      }
      dispatch({ type: "SET_PLAN_3D", payload: { total: totalResult, facade: null, rooms: [] } });
    } catch {
      // silently fail for MVP
    } finally {
      setRerendering2D(false);
    }
  }, [state.generationPackage, state.formData, dispatch]);

  /** Re-render 3D overview only */
  const handleRerender3D = useCallback(async () => {
    const generationPackage = state.generationPackage;
    const plan2DResult = state.plan2DResult;
    const extraction = state.extractedPlanData;
    const lock = state.consistencyLock;
    if (!generationPackage || !plan2DResult || !extraction) return;

    setRerendering3D(true);
    try {
      const allRooms = generationPackage.prompts.plan3DRooms.map((r) => r.room);
      const pkg3D = await planApi.render3DPackage({
        prompts: {
          ...generationPackage.prompts,
          plan3DTotal: generationPackage.prompts.plan3DTotal,
          facade3D: { prompt: "" },
          plan3DRooms: [],
        },
        plan2DImageDataUrl: plan2DResult.imageDataUrl,
        extractedPlanData: extraction.extractedPlanData,
        projectConsistencyLock: lock?.visualSignature ?? null,
        roomProgram: allRooms,
        maxRooms: 0,
      });

      let totalResult = null;
      for (const item of pkg3D.results) {
        if (item.type === "total" && item.result) {
          totalResult = {
            model: item.result.model,
            usedFallback: item.result.usedFallback,
            text: item.result.text,
            imageDataUrl: item.result.imageDataUrl,
          };
        }
      }
      dispatch({ type: "SET_PLAN_3D", payload: { total: totalResult, facade: null, rooms: [] } });
    } catch {
      // silently fail for MVP
    } finally {
      setRerendering3D(false);
    }
  }, [state.generationPackage, state.plan2DResult, state.extractedPlanData, state.consistencyLock, dispatch]);

  const expectedRooms =
    state.selectedRooms.length > 0
      ? state.selectedRooms
      : state.generationPackage?.roomProgram || [];

  const isRerendering = rerendering2D || rerendering3D;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
          <Sparkles className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <h1 className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold text-[var(--primary)]">
          {pipeline.stage === "awaiting_selection"
            ? "Escolha os comodos"
            : "Gerando seu projeto"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {pipeline.stage === "awaiting_selection"
            ? "Selecione quais comodos deseja renderizar em 3D."
            : "Nossa IA esta criando a planta e renderizando cada comodo."}
        </p>
      </div>

      {/* Pipeline Progress */}
      <Card>
        <CardContent className="p-8">
          <PipelineProgress
            stage={pipeline.stage}
            progress={pipeline.progress}
            stageLabel={pipeline.stageLabel}
            error={pipeline.error}
          />
        </CardContent>
      </Card>

      {/* 2D Preview with re-render button */}
      {state.plan2DResult && (
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-[var(--primary)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Planta 2D Humanizada
              </h3>
              {(pipeline.stage === "awaiting_selection" || pipeline.stage === "complete") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRerender2D}
                  disabled={isRerendering}
                  className="gap-1.5 text-xs"
                >
                  {rerendering2D ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {rerendering2D ? "Regenerando..." : "Refazer 2D"}
                </Button>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.plan2DResult.imageDataUrl}
              alt="Planta 2D humanizada"
              className="w-full rounded-lg border border-border/40"
            />
          </CardContent>
        </Card>
      )}

      {/* 3D Isometric Preview with re-render button */}
      {state.plan3DResults?.total && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-[var(--primary)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Vista 3D Isometrica (sem telhado)
              </h3>
              {(pipeline.stage === "awaiting_selection" || pipeline.stage === "complete") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRerender3D}
                  disabled={isRerendering}
                  className="gap-1.5 text-xs"
                >
                  {rerendering3D ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {rerendering3D ? "Regenerando..." : "Refazer 3D"}
                </Button>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.plan3DResults.total.imageDataUrl}
              alt="Vista 3D Isometrica"
              className="w-full rounded-lg border border-border/40"
            />
          </CardContent>
        </Card>
      )}

      {/* Room selection (appears after 3D overview) */}
      {pipeline.stage === "awaiting_selection" && availableRooms.length > 0 && (
        <RoomSelector
          availableRooms={availableRooms}
          selectedRooms={localSelected}
          onToggle={handleToggle}
          onConfirm={handleConfirm}
        />
      )}

      {/* Room render queue (appears during/after room 3D rendering) */}
      {(pipeline.stage === "rendering_3d_rooms" || pipeline.stage === "complete") &&
        expectedRooms.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <RoomRenderQueue
                results={state.plan3DResults}
                expectedRooms={expectedRooms}
              />
            </CardContent>
          </Card>
        )}

      {/* Action buttons */}
      {pipeline.stage === "complete" && (
        <div className="flex justify-center">
          <Button
            variant="accent"
            size="lg"
            onClick={() => router.push("/results")}
            className="gap-2 px-8"
          >
            Ver Resultados
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {pipeline.stage === "error" && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push("/wizard")}
            className="gap-2"
          >
            Voltar ao Formulario
          </Button>
          <Button
            variant="accent"
            size="lg"
            onClick={() => {
              hasStarted.current = false;
              runPreSelection(state.formData);
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  );
}
