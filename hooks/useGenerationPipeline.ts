"use client";

import { useState, useCallback } from "react";
import { planApi } from "@/lib/api/plan";
import { buildConsistencyLock } from "@/lib/consistency";
import { useProject, type GenerationPackage, type RenderResult, type Plan3DResults } from "@/context/ProjectContext";
import type { WizardFormData } from "@/lib/validation";
import type { GenerateRequest } from "@/lib/api/types";
import { ApiRequestError } from "@/lib/api/client";

export type PipelineStage =
  | "idle"
  | "generating_prompts"
  | "rendering_2d"
  | "extracting_data"
  | "rendering_3d_overview"
  | "awaiting_selection"
  | "rendering_3d_rooms"
  | "complete"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  progress: number;
  stageLabel: string;
  error: string | null;
  retryAfter: number | null;
}

export function useGenerationPipeline() {
  const { state, dispatch } = useProject();
  const [pipeline, setPipeline] = useState<PipelineState>({
    stage: "idle",
    progress: 0,
    stageLabel: "",
    error: null,
    retryAfter: null,
  });

  const updatePipeline = useCallback((partial: Partial<PipelineState>) => {
    setPipeline((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * Stages 1-4: generate prompts → render 2D → extract data → render 3D isometric overview
   * Then pause for room selection.
   */
  const runPreSelection = useCallback(
    async (formData: Partial<WizardFormData>) => {
      try {
        let generationPackage = state.generationPackage;
        let plan2DResult = state.plan2DResult;
        let extraction = state.extractedPlanData;
        let lock = state.consistencyLock;
        let plan3DResults = state.plan3DResults;

        // --- Stage 1: Generate prompts (skip if already have them) ---
        if (!generationPackage) {
          updatePipeline({
            stage: "generating_prompts",
            progress: 5,
            stageLabel: "Analisando seu projeto...",
            error: null,
            retryAfter: null,
          });

          const apiFormData: GenerateRequest = {
            fullName: formData.fullName || "",
            document: formData.document || "",
            budgetRange: formData.budgetRange || "",
            objective: formData.objective || "",
            cep: formData.cep || "",
            street: formData.street || "",
            number: formData.number || "",
            neighborhood: formData.neighborhood || "",
            city: formData.city || "",
            state: formData.state || "",
            terrainType: formData.terrainType || "",
            frontMeters: formData.frontMeters || 10,
            backMeters: formData.backMeters || 10,
            rightMeters: formData.rightMeters || 20,
            leftMeters: formData.leftMeters || 20,
            topography: formData.topography || "plano",
            soilType: formData.soilType || "argiloso",
            leftNeighbor: formData.leftNeighbor || "residencial_baixo",
            rightNeighbor: formData.rightNeighbor || "residencial_baixo",
            backNeighbor: formData.backNeighbor || "residencial_baixo",
            hasWater: formData.hasWater ?? true,
            hasSewer: formData.hasSewer ?? true,
            hasElectricity: formData.hasElectricity ?? true,
            architecturalStyle: formData.architecturalStyle,
          };

          const genPkg = await planApi.generate(apiFormData);
          generationPackage = {
            ...genPkg,
            prompts: {
              plan2DTechnical: { prompt: genPkg.prompts.plan2DTechnical },
              plan2DRenderNanoBanana2: { prompt: genPkg.prompts.plan2DRenderNanoBanana2 },
              plan3DTotal: { prompt: genPkg.prompts.plan3DTotal },
              plan3DRooms: genPkg.prompts.plan3DRooms,
              facade3D: { prompt: genPkg.prompts.facade3D },
            },
          };
          dispatch({ type: "SET_GENERATION_PACKAGE", payload: generationPackage });
        } else {
          updatePipeline({
            stage: "generating_prompts",
            progress: 5,
            stageLabel: "Projeto ja analisado, avancando...",
            error: null,
            retryAfter: null,
          });
        }

        // --- Stage 2: Render 2D (skip if already have it) ---
        if (!plan2DResult) {
          updatePipeline({
            stage: "rendering_2d",
            progress: 15,
            stageLabel: "Gerando planta 2D humanizada...",
          });

          const render2D = await planApi.render2D(
            generationPackage.prompts.plan2DRenderNanoBanana2.prompt
          );
          plan2DResult = {
            model: render2D.model,
            usedFallback: render2D.usedFallback,
            text: render2D.text,
            imageDataUrl: render2D.imageDataUrl,
          };
          dispatch({ type: "SET_PLAN_2D", payload: plan2DResult });
        } else {
          updatePipeline({
            stage: "rendering_2d",
            progress: 15,
            stageLabel: "Planta 2D ja gerada, avancando...",
          });
        }

        // --- Stage 3: Extract data (skip if already have it) ---
        if (!extraction) {
          updatePipeline({
            stage: "extracting_data",
            progress: 30,
            stageLabel: "Extraindo dados da planta...",
          });

          extraction = await planApi.extract2DData(
            plan2DResult.imageDataUrl,
            generationPackage.roomProgram,
            generationPackage.prompts.plan2DRenderNanoBanana2.prompt
          );
          dispatch({ type: "SET_EXTRACTION", payload: extraction });

          lock = buildConsistencyLock(
            extraction.extractedPlanData,
            plan2DResult.imageDataUrl,
            formData.architecturalStyle
          );
          dispatch({ type: "SET_CONSISTENCY_LOCK", payload: lock });
        } else {
          if (!lock) {
            lock = buildConsistencyLock(
              extraction.extractedPlanData,
              plan2DResult.imageDataUrl,
              formData.architecturalStyle
            );
            dispatch({ type: "SET_CONSISTENCY_LOCK", payload: lock });
          }
          updatePipeline({
            stage: "extracting_data",
            progress: 30,
            stageLabel: "Dados ja extraidos, avancando...",
          });
        }

        // --- Stage 4: Render 3D isometric overview (skip if already have it) ---
        if (!plan3DResults?.total) {
          updatePipeline({
            stage: "rendering_3d_overview",
            progress: 45,
            stageLabel: "Gerando vista 3D isometrica...",
          });

          const allRooms = generationPackage.prompts.plan3DRooms.map((r) => r.room);

          const pkg3D = await planApi.render3DPackage({
            prompts: {
              ...generationPackage.prompts,
              plan3DTotal: generationPackage.prompts.plan3DTotal,
              facade3D: { prompt: "" },       // skip facade
              plan3DRooms: [],                // skip room renders — only total
            },
            plan2DImageDataUrl: plan2DResult.imageDataUrl,
            extractedPlanData: extraction.extractedPlanData,
            projectConsistencyLock: lock?.visualSignature ?? null,
            roomProgram: allRooms,
            maxRooms: 0,
          });

          // Extract just the total result
          plan3DResults = {
            total: null,
            facade: null,
            rooms: [],
          };

          for (const item of pkg3D.results) {
            if (item.type === "total" && item.result) {
              plan3DResults.total = {
                model: item.result.model,
                usedFallback: item.result.usedFallback,
                text: item.result.text,
                imageDataUrl: item.result.imageDataUrl,
              };
            }
          }

          dispatch({ type: "SET_PLAN_3D", payload: plan3DResults });
        } else {
          updatePipeline({
            stage: "rendering_3d_overview",
            progress: 45,
            stageLabel: "Vista 3D ja gerada, avancando...",
          });
        }

        // --- Pause: wait for user to select rooms ---
        updatePipeline({
          stage: "awaiting_selection",
          progress: 55,
          stageLabel: "Selecione os comodos para renderizar em 3D",
        });
      } catch (err) {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Erro inesperado. Tente novamente.";
        const retryAfter =
          err instanceof ApiRequestError ? err.retryAfter ?? null : null;

        updatePipeline({
          stage: "error",
          stageLabel: message,
          error: message,
          retryAfter,
        });
      }
    },
    [dispatch, updatePipeline, state.generationPackage, state.plan2DResult, state.extractedPlanData, state.consistencyLock, state.plan3DResults]
  );

  /** Stage 5: render only the user-selected rooms in 3D */
  const runPostSelection = useCallback(
    async (selectedRooms: string[]) => {
      try {
        const generationPackage = state.generationPackage;
        const plan2DResult = state.plan2DResult;
        const extraction = state.extractedPlanData;
        const lock = state.consistencyLock;

        if (!generationPackage || !plan2DResult || !extraction) {
          throw new Error("Dados incompletos. Execute a etapa anterior primeiro.");
        }

        updatePipeline({
          stage: "rendering_3d_rooms",
          progress: 60,
          stageLabel: "Renderizando comodos em 3D...",
          error: null,
          retryAfter: null,
        });

        // Filter room prompts to only include selected rooms
        const filteredRoomPrompts = generationPackage.prompts.plan3DRooms.filter(
          (rp) => selectedRooms.includes(rp.room)
        );

        const pkg3D = await planApi.render3DPackage({
          prompts: {
            ...generationPackage.prompts,
            plan3DTotal: { prompt: "" },     // already rendered — skip
            facade3D: { prompt: "" },         // skip facade
            plan3DRooms: filteredRoomPrompts,
          },
          plan2DImageDataUrl: plan2DResult.imageDataUrl,
          extractedPlanData: extraction.extractedPlanData,
          projectConsistencyLock: lock?.visualSignature ?? null,
          roomProgram: selectedRooms,
          maxRooms: selectedRooms.length,
        });

        // Merge room results with existing total
        const existingTotal = state.plan3DResults?.total ?? null;
        const plan3DResults: Plan3DResults = {
          total: existingTotal,
          facade: null,
          rooms: [],
        };

        for (const item of pkg3D.results) {
          const result: RenderResult = {
            model: item.result.model,
            usedFallback: item.result.usedFallback,
            text: item.result.text,
            imageDataUrl: item.result.imageDataUrl,
          };

          if (item.type === "total" && item.result) {
            plan3DResults.total = result;
          } else if (item.type === "facade" && item.result) {
            plan3DResults.facade = result;
          } else if (item.type === "room") {
            plan3DResults.rooms.push({ room: item.room || item.title, result });
          }
        }

        dispatch({ type: "SET_PLAN_3D", payload: plan3DResults });

        // --- Complete ---
        updatePipeline({
          stage: "complete",
          progress: 100,
          stageLabel: "Projeto gerado com sucesso!",
        });
        dispatch({ type: "SET_PHASE", payload: "results" });
      } catch (err) {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Erro inesperado. Tente novamente.";
        const retryAfter =
          err instanceof ApiRequestError ? err.retryAfter ?? null : null;

        updatePipeline({
          stage: "error",
          stageLabel: message,
          error: message,
          retryAfter,
        });
      }
    },
    [dispatch, updatePipeline, state.generationPackage, state.plan2DResult, state.extractedPlanData, state.consistencyLock, state.plan3DResults]
  );

  return { pipeline, runPreSelection, runPostSelection, updatePipeline };
}
