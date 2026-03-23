"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { stepStyleSchema, type WizardFormData } from "@/lib/validation";
import {
  ARCHITECTURAL_STYLES,
  STYLE_CATEGORIES,
  type StyleCategory,
} from "@/lib/styles";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import Image from "next/image";

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
  const [activeCategory, setActiveCategory] = useState<StyleCategory>("moderno");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedStyle = formData.architecturalStyle ?? "";
  const selectedStructure = formData.structure ?? "";
  const selectedFloors = formData.floors ?? "";

  const filteredStyles = useMemo(() => {
    let styles = ARCHITECTURAL_STYLES.filter(
      (s) => s.category === activeCategory
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      styles = ARCHITECTURAL_STYLES.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return styles;
  }, [activeCategory, searchQuery]);

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

      {/* Style Selection */}
      <div className="space-y-4">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Selecionar Estilo
        </label>
        {errors.architecturalStyle && (
          <p className="text-xs text-[var(--error)]">
            {errors.architecturalStyle}
          </p>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar estilo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--primary)]/10 bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--primary)] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          />
        </div>

        {/* Category Tabs */}
        {!searchQuery.trim() && (
          <div className="flex gap-1 rounded-xl bg-[var(--primary)]/5 p-1">
            {STYLE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer",
                  activeCategory === cat.id
                    ? "bg-white text-[var(--primary)] shadow-sm"
                    : "text-[var(--primary)]/50 hover:text-[var(--primary)]/70"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Styles Grid with Images */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredStyles.map((style) => {
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
                    ? "ring-2 ring-[var(--accent)] shadow-lg shadow-[var(--accent)]/15"
                    : "hover:shadow-lg"
                )}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--primary)]/5">
                  <Image
                    src={style.image}
                    alt={style.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, 33vw"
                    unoptimized
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Selected Badge */}
                  {selected && (
                    <div className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-[var(--accent)] shadow-md">
                      <Check className="size-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="p-3">
                  <h3
                    className={cn(
                      "text-center text-sm font-semibold",
                      selected
                        ? "text-[var(--accent-dark)]"
                        : "text-[var(--primary)]"
                    )}
                  >
                    {style.name}
                  </h3>
                  <p className="mt-0.5 text-center text-[10px] text-muted-foreground line-clamp-1">
                    {style.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredStyles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum estilo encontrado para &ldquo;{searchQuery}&rdquo;
          </p>
        )}
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
                  "cursor-pointer rounded-full px-6 py-3 text-sm font-medium transition-all duration-200",
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
                  "cursor-pointer rounded-full px-6 py-3 text-sm font-medium transition-all duration-200",
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
