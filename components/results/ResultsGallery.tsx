"use client";

import { useState } from "react";
import { useProject, clearProjectStorage } from "@/context/ProjectContext";
import { ImageCard } from "./ImageCard";
import { RoomDetailView } from "./RoomDetailView";
import { Plan2DPreview } from "@/components/generation/Plan2DPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { planApi } from "@/lib/api/plan";
import type { RenderResult } from "@/context/ProjectContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Home, Box, FileDown } from "lucide-react";
import { generateProjectReport } from "@/lib/generateReport";
import { cn } from "@/lib/utils";

type TabId = "overview" | "rooms";

const TABS: { id: TabId; label: string; icon: typeof Eye }[] = [
  { id: "overview", label: "Visao Geral", icon: Eye },
  { id: "rooms", label: "Comodos", icon: Home },
];

interface DetailState {
  title: string;
  imageDataUrl: string;
  model?: string;
  usedFallback?: boolean;
  roomIndex?: number;
}

export function ResultsGallery() {
  const { state, dispatch } = useProject();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { plan2DResult, plan3DResults, generationPackage, consistencyLock } = state;

  function handleNewProject() {
    clearProjectStorage();
    dispatch({ type: "RESET" });
    router.push("/wizard");
  }

  const hasResults = plan2DResult || plan3DResults;

  async function handleRegenerate(roomIndex: number) {
    if (!plan3DResults || !generationPackage) return;
    const room = plan3DResults.rooms[roomIndex];
    if (!room) return;

    setRegeneratingIndex(roomIndex);
    try {
      const roomPrompt = generationPackage.prompts.plan3DRooms.find(
        (r) => r.room === room.room
      );
      const res = await planApi.render3DItem({
        label: room.room,
        prompt: roomPrompt?.prompt || `Render 3D do comodo: ${room.room}`,
        referencePlanImageDataUrl: plan2DResult?.imageDataUrl,
        extractedPlanData: state.extractedPlanData?.extractedPlanData,
        consistencyLock: consistencyLock?.visualSignature,
        roomProgram: generationPackage.roomProgram,
      });

      const newResult: RenderResult = {
        model: res.model,
        usedFallback: res.usedFallback,
        text: res.text,
        imageDataUrl: res.imageDataUrl,
      };

      dispatch({
        type: "UPDATE_ROOM_3D",
        payload: { roomIndex, result: newResult },
      });

      // Update detail view if open
      if (detail && detail.roomIndex === roomIndex) {
        setDetail({
          ...detail,
          imageDataUrl: newResult.imageDataUrl,
          model: newResult.model,
          usedFallback: newResult.usedFallback,
        });
      }
    } catch {
      // Error handling is silent for MVP
    } finally {
      setRegeneratingIndex(null);
    }
  }

  async function handleEdit(roomIndex: number, editInstruction: string) {
    if (!plan3DResults || !generationPackage) return;
    const room = plan3DResults.rooms[roomIndex];
    if (!room) return;

    setEditingIndex(roomIndex);
    try {
      const roomPrompt = generationPackage.prompts.plan3DRooms.find(
        (r) => r.room === room.room
      );
      const basePrompt = roomPrompt?.prompt || `Render 3D do comodo: ${room.room}`;

      const editedPrompt = [
        basePrompt,
        "",
        "--- INSTRUCOES DE EDICAO ---",
        "A imagem 3D ja renderizada esta anexada como referencia adicional.",
        "Mantenha o mesmo angulo de camera, composicao geral e elementos nao mencionados.",
        "Aplique SOMENTE as alteracoes descritas abaixo:",
        editInstruction,
        "--- FIM DAS INSTRUCOES DE EDICAO ---",
      ].join("\n");

      const res = await planApi.render3DItem({
        label: room.room,
        prompt: editedPrompt,
        referencePlanImageDataUrl: plan2DResult?.imageDataUrl,
        extractedPlanData: state.extractedPlanData?.extractedPlanData,
        consistencyLock: consistencyLock?.visualSignature,
        roomProgram: generationPackage.roomProgram,
        additionalReferenceImageDataUrls: [room.result.imageDataUrl],
      });

      const newResult: RenderResult = {
        model: res.model,
        usedFallback: res.usedFallback,
        text: res.text,
        imageDataUrl: res.imageDataUrl,
      };

      dispatch({
        type: "UPDATE_ROOM_3D",
        payload: { roomIndex, result: newResult },
      });

      if (detail && detail.roomIndex === roomIndex) {
        setDetail({
          ...detail,
          imageDataUrl: newResult.imageDataUrl,
          model: newResult.model,
          usedFallback: newResult.usedFallback,
        });
      }
    } catch {
      // Error handling is silent for MVP
    } finally {
      setEditingIndex(null);
    }
  }

  if (!hasResults) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[var(--primary)]">
          Nenhum resultado encontrado
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gere um projeto primeiro para ver os resultados.
        </p>
        <Button
          variant="accent"
          size="lg"
          onClick={handleNewProject}
          className="mt-6 gap-2"
        >
          Iniciar Novo Projeto
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewProject}
            className="mb-2 -ml-2 gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Novo projeto
          </Button>
          <h1 className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold text-[var(--primary)]">
            Seu Projeto
          </h1>
          {generationPackage?.summary && (
            <p className="mt-1 text-sm text-muted-foreground">
              {String(generationPackage.summary.location || "")} &bull;{" "}
              {generationPackage.summary.estimatedAreaM2 as number}m&sup2;
            </p>
          )}
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => generateProjectReport(state)}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Gerar Relatorio
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl bg-[var(--primary)]/5 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-[var(--primary)]/50 hover:text-[var(--primary)]/70"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {plan2DResult && <Plan2DPreview result={plan2DResult} />}

          {/* 3D Top-Down View */}
          {plan3DResults?.total && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Box className="h-4 w-4 text-[var(--accent)]" />
                    Vista 3D Isometrica (sem telhado)
                  </CardTitle>
                  <Badge
                    variant={plan3DResults.total.usedFallback ? "secondary" : "accent"}
                  >
                    {plan3DResults.total.usedFallback
                      ? "Fallback SVG"
                      : plan3DResults.total.model}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan3DResults.total.imageDataUrl}
                  alt="Vista 3D Isometrica sem telhado"
                  className="w-full cursor-pointer rounded-lg border border-border/40 transition-transform hover:scale-[1.01]"
                  onClick={() =>
                    setDetail({
                      title: "Vista 3D Isometrica (sem telhado)",
                      imageDataUrl: plan3DResults.total!.imageDataUrl,
                      model: plan3DResults.total!.model,
                      usedFallback: plan3DResults.total!.usedFallback,
                    })
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plan3DResults?.rooms.map((room, i) => (
            <ImageCard
              key={`${room.room}-${i}`}
              title={room.room}
              imageDataUrl={room.result.imageDataUrl}
              model={room.result.model}
              usedFallback={room.result.usedFallback}
              isRegenerating={regeneratingIndex === i}
              onRegenerate={() => handleRegenerate(i)}
              onExpand={() =>
                setDetail({
                  title: room.room,
                  imageDataUrl: room.result.imageDataUrl,
                  model: room.result.model,
                  usedFallback: room.result.usedFallback,
                  roomIndex: i,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <RoomDetailView
          title={detail.title}
          imageDataUrl={detail.imageDataUrl}
          model={detail.model}
          usedFallback={detail.usedFallback}
          onClose={() => setDetail(null)}
          onRegenerate={
            detail.roomIndex !== undefined
              ? () => handleRegenerate(detail.roomIndex!)
              : undefined
          }
          isRegenerating={
            detail.roomIndex !== undefined
              ? regeneratingIndex === detail.roomIndex
              : false
          }
          onEdit={
            detail.roomIndex !== undefined
              ? (text: string) => handleEdit(detail.roomIndex!, text)
              : undefined
          }
          isEditing={
            detail.roomIndex !== undefined
              ? editingIndex === detail.roomIndex
              : false
          }
        />
      )}
    </div>
  );
}
