"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { stepStyleSchema, type WizardFormData } from "@/lib/validation";
import { ARCHITECTURAL_STYLES } from "@/lib/styles";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface StepStyleProps {
  formData: Partial<WizardFormData>;
  updateForm: (data: Partial<WizardFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const STRUCTURE_OPTIONS = [
  { value: "concreto", label: "Concreto Armado" },
  { value: "metalica", label: "Estrutura Metalica" },
  { value: "madeira_vidro", label: "Madeira e Vidro" },
] as const;

const FLOOR_OPTIONS = [
  { value: "terrea", label: "Terrea (1 Pavimento)" },
  { value: "sobrado", label: "Sobrado (2 Pavimentos)" },
] as const;

export function StepStyle({
  formData,
  updateForm,
  onNext,
  onBack,
}: StepStyleProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStyle = formData.architecturalStyle ?? "";
  const selectedStructure = formData.structure ?? "";
  const selectedFloors = formData.floors ?? "";

  function handleValidateAndNext() {
    const payload = {
      architecturalStyle: formData.architecturalStyle ?? "",
      structure: formData.structure ?? "",
      floors: formData.floors ?? "",
    };

    const result = stepStyleSchema.safeParse(payload);
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
          Estilo Arquitetonico
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha a identidade visual do seu projeto. O estilo define materiais,
          cores e a atmosfera da sua casa.
        </p>
      </div>

      {/* Architectural Styles Grid */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Estilo da Casa
        </label>
        {errors.architecturalStyle && (
          <p className="text-xs text-[var(--error)]">
            {errors.architecturalStyle}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ARCHITECTURAL_STYLES.map((style) => {
            const selected = selectedStyle === style.id;
            return (
              <Card
                key={style.id}
                onClick={() =>
                  updateForm({ architecturalStyle: style.id })
                }
                className={cn(
                  "group relative cursor-pointer overflow-hidden transition-all duration-300",
                  selected
                    ? "ring-2 ring-[var(--accent)] scale-[1.02] shadow-lg shadow-[var(--accent)]/15"
                    : "hover:shadow-lg hover:scale-[1.01]"
                )}
              >
                {/* Gradient Background */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity",
                    style.gradient,
                    selected ? "opacity-80" : "group-hover:opacity-70"
                  )}
                />

                {/* Selected Badge */}
                {selected && (
                  <div className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-full bg-[var(--accent)] shadow-md">
                    <Check className="size-4 text-white" />
                  </div>
                )}

                {/* Content */}
                <div className="relative z-[1] p-6">
                  <div className="flex items-start gap-3">
                    {/* Accent Color Indicator */}
                    <div
                      className="mt-1 size-4 shrink-0 rounded-full ring-2 ring-white/80 shadow-sm"
                      style={{ backgroundColor: style.accentColor }}
                    />
                    <div className="flex-1">
                      <h3 className="font-[family-name:var(--font-dm-sans)] text-xl font-bold text-[var(--primary)]">
                        {style.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-[var(--primary)]/70">
                        {style.description}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-[var(--primary)]/50">
                        {style.longDescription}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Accent Bar */}
                <div
                  className={cn(
                    "h-1 w-full transition-all duration-300",
                    selected
                      ? "bg-[var(--accent)]"
                      : "bg-transparent group-hover:bg-[var(--accent)]/30"
                  )}
                />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Structure */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Tipo de Estrutura
        </label>
        {errors.structure && (
          <p className="text-xs text-[var(--error)]">{errors.structure}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {STRUCTURE_OPTIONS.map((option) => {
            const selected = selectedStructure === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateForm({ structure: option.value })}
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-medium transition-all duration-200",
                  selected
                    ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                    : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                )}
              >
                {selected && <Check className="mr-2 inline size-3.5" />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floors */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Pavimentos
        </label>
        {errors.floors && (
          <p className="text-xs text-[var(--error)]">{errors.floors}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {FLOOR_OPTIONS.map((option) => {
            const selected = selectedFloors === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateForm({ floors: option.value })}
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-medium transition-all duration-200",
                  selected
                    ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                    : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                )}
              >
                {selected && <Check className="mr-2 inline size-3.5" />}
                {option.label}
              </button>
            );
          })}
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
          onClick={handleValidateAndNext}
          className="gap-2"
        >
          Continuar
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
