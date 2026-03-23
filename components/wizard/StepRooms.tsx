"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stepRoomsSchema, type WizardFormData } from "@/lib/validation";
import { ROOM_CATALOG, type RoomDefinition } from "@/lib/room-definitions";
import { useRoomSuggestions } from "@/hooks/useRoomSuggestions";
import { Sparkles, Plus, Minus, Check, ArrowLeft } from "lucide-react";

interface StepRoomsProps {
  formData: Partial<WizardFormData>;
  updateForm: (data: Partial<WizardFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<RoomDefinition["category"], string> = {
  social: "Areas Sociais",
  intima: "Areas Intimas",
  servico: "Areas de Servico",
  extra: "Areas Extras",
};

const CATEGORY_ORDER: RoomDefinition["category"][] = [
  "social",
  "intima",
  "servico",
  "extra",
];

export function StepRooms({
  formData,
  updateForm,
  onNext,
  onBack,
}: StepRoomsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const objective = formData.objective ?? "";
  const { suggestedRoomIds } = useRoomSuggestions(objective);

  const selectedRooms = formData.selectedRooms ?? [];
  const bedroomCount = formData.bedroomCount ?? 1;
  const bathroomCount = formData.bathroomCount ?? 1;

  // Pre-populate with suggested rooms on first render
  useEffect(() => {
    if (!initialized && selectedRooms.length === 0 && suggestedRoomIds.length > 0) {
      const uniqueRooms = [...new Set(suggestedRoomIds)];
      const bedroomOccurrences = suggestedRoomIds.filter(
        (id) => id === "quarto"
      ).length;
      const bathroomOccurrences = suggestedRoomIds.filter(
        (id) => id === "banheiro_social"
      ).length;

      updateForm({
        selectedRooms: uniqueRooms,
        bedroomCount: Math.max(1, bedroomOccurrences),
        bathroomCount: Math.max(1, bathroomOccurrences),
      });
      setInitialized(true);
    } else if (!initialized) {
      setInitialized(true);
    }
  }, [initialized, selectedRooms.length, suggestedRoomIds, updateForm]);

  // Group rooms by category
  const roomsByCategory = useMemo(() => {
    const grouped: Record<string, RoomDefinition[]> = {};
    for (const category of CATEGORY_ORDER) {
      grouped[category] = ROOM_CATALOG.filter((r) => r.category === category);
    }
    return grouped;
  }, []);

  function toggleRoom(roomId: string) {
    const isSelected = selectedRooms.includes(roomId);
    if (isSelected) {
      updateForm({
        selectedRooms: selectedRooms.filter((id) => id !== roomId),
      });
    } else {
      updateForm({
        selectedRooms: [...selectedRooms, roomId],
      });
    }
  }

  function handleQuantityChange(
    type: "bedroom" | "bathroom",
    delta: number
  ) {
    const room = ROOM_CATALOG.find(
      (r) => r.id === (type === "bedroom" ? "quarto" : "banheiro_social")
    );
    const maxQ = room?.maxQuantity ?? 4;

    if (type === "bedroom") {
      const next = Math.min(maxQ, Math.max(0, bedroomCount + delta));
      updateForm({ bedroomCount: next });
    } else {
      const next = Math.min(maxQ, Math.max(1, bathroomCount + delta));
      updateForm({ bathroomCount: next });
    }
  }

  // Calculate estimated total area
  const estimatedArea = useMemo(() => {
    let total = 0;
    for (const roomId of selectedRooms) {
      const room = ROOM_CATALOG.find((r) => r.id === roomId);
      if (!room) continue;

      if (room.id === "quarto") {
        total += room.defaultArea * bedroomCount;
      } else if (room.id === "banheiro_social") {
        total += room.defaultArea * bathroomCount;
      } else {
        total += room.defaultArea;
      }
    }
    return total;
  }, [selectedRooms, bedroomCount, bathroomCount]);

  function handleValidateAndSubmit() {
    const payload = {
      selectedRooms: formData.selectedRooms ?? [],
      bedroomCount: formData.bedroomCount ?? 1,
      bathroomCount: formData.bathroomCount ?? 1,
    };

    const result = stepRoomsSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onNext();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[var(--primary)]">
          Comodos do Projeto
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione os ambientes da sua casa. Ja sugerimos os mais indicados para
          o seu perfil.
        </p>
      </div>

      {errors.selectedRooms && (
        <p className="text-sm font-medium text-[var(--error)]">
          {errors.selectedRooms}
        </p>
      )}

      {/* Room categories */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => (
          <div key={category} className="space-y-3">
            <h3 className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {roomsByCategory[category]?.map((room) => {
                const isSelected = selectedRooms.includes(room.id);
                const isQuantityRoom =
                  room.id === "quarto" || room.id === "banheiro_social";
                const quantity =
                  room.id === "quarto"
                    ? bedroomCount
                    : room.id === "banheiro_social"
                    ? bathroomCount
                    : 1;
                const maxQ = room.maxQuantity ?? 4;

                return (
                  <div key={room.id} className="flex items-center gap-1">
                    {/* Room Toggle Chip */}
                    <button
                      type="button"
                      onClick={() => toggleRoom(room.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                        isSelected
                          ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/15"
                          : "border-2 border-[var(--primary)]/12 bg-white text-[var(--primary)]/70 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 hover:text-[var(--primary)]"
                      )}
                    >
                      {isSelected && <Check className="size-3.5" />}
                      {room.name}
                      {isSelected && (
                        <Badge
                          variant="accent"
                          className="ml-0.5 h-5 px-1.5 text-[10px] font-bold"
                        >
                          {room.defaultArea}m&sup2;
                        </Badge>
                      )}
                    </button>

                    {/* Quantity Stepper (only for hasQuantity rooms when selected) */}
                    {isQuantityRoom && isSelected && (
                      <div className="ml-1 flex items-center gap-1 rounded-full border-2 border-[var(--primary)]/10 bg-white px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(
                              room.id === "quarto" ? "bedroom" : "bathroom",
                              -1
                            )
                          }
                          disabled={
                            room.id === "quarto"
                              ? bedroomCount <= 0
                              : bathroomCount <= 1
                          }
                          className="flex size-6 items-center justify-center rounded-full text-[var(--primary)]/60 transition-colors hover:bg-[var(--primary)]/5 disabled:opacity-30"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-xs font-bold text-[var(--primary)]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(
                              room.id === "quarto" ? "bedroom" : "bathroom",
                              1
                            )
                          }
                          disabled={quantity >= maxQ}
                          className="flex size-6 items-center justify-center rounded-full text-[var(--primary)]/60 transition-colors hover:bg-[var(--primary)]/5 disabled:opacity-30"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Area Summary */}
      <div className="rounded-2xl border-2 border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Area Total Estimada
            </p>
            <p className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold text-[var(--primary)]">
              {estimatedArea}{" "}
              <span className="text-lg font-normal text-muted-foreground">
                m&sup2;
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {selectedRooms.length} comodo{selectedRooms.length !== 1 ? "s" : ""}{" "}
              selecionado{selectedRooms.length !== 1 ? "s" : ""}
            </p>
            {selectedRooms.includes("quarto") && (
              <p className="text-xs text-muted-foreground">
                {bedroomCount} quarto{bedroomCount !== 1 ? "s" : ""}
              </p>
            )}
            {selectedRooms.includes("banheiro_social") && (
              <p className="text-xs text-muted-foreground">
                {bathroomCount} banheiro{bathroomCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>

        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={handleValidateAndSubmit}
          className="gap-2 px-8"
        >
          <Sparkles className="size-5" />
          Gerar Meu Projeto
        </Button>
      </div>
    </div>
  );
}
