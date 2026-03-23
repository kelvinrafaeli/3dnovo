"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomSelectorProps {
  availableRooms: Array<{ room: string; area?: number }>;
  selectedRooms: string[];
  onToggle: (room: string) => void;
  onConfirm: () => void;
}

export function RoomSelector({
  availableRooms,
  selectedRooms,
  onToggle,
  onConfirm,
}: RoomSelectorProps) {
  const allSelected = selectedRooms.length === availableRooms.length;

  const handleToggleAll = () => {
    if (allSelected) {
      // Clear all — trigger toggle for each selected
      selectedRooms.forEach((r) => onToggle(r));
    } else {
      // Select all missing
      availableRooms.forEach((r) => {
        if (!selectedRooms.includes(r.room)) onToggle(r.room);
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold text-[var(--primary)]">
              Selecione os comodos para renderizar
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedRooms.length} de {availableRooms.length} selecionados
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleToggleAll}>
            {allSelected ? "Limpar Selecao" : "Selecionar Todos"}
          </Button>
        </div>

        {/* Room grid */}
        <div className="grid grid-cols-2 gap-3">
          {availableRooms.map((r) => {
            const isSelected = selectedRooms.includes(r.room);
            return (
              <button
                key={r.room}
                type="button"
                onClick={() => onToggle(r.room)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--primary)]/10 bg-white hover:border-[var(--primary)]/25"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--primary)]/20 bg-white"
                  )}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-[var(--primary)]" : "text-[var(--primary)]/70"
                    )}
                  >
                    {r.room}
                  </p>
                  {r.area != null && r.area > 0 && (
                    <p className="text-xs text-muted-foreground">{r.area.toFixed(1)} m²</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <Button
          variant="accent"
          size="lg"
          className="w-full gap-2"
          disabled={selectedRooms.length === 0}
          onClick={onConfirm}
        >
          <Sparkles className="h-4 w-4" />
          Renderizar Selecionados ({selectedRooms.length})
        </Button>
      </CardContent>
    </Card>
  );
}
