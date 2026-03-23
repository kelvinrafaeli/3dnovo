"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { stepFamilySchema, type WizardFormData } from "@/lib/validation";
import {
  Heart,
  Accessibility,
  Baby,
  PartyPopper,
  ChefHat,
  Sofa,
  Bed,
  Users,
  TreePine,
  Monitor,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  UserRound,
  UsersRound,
  Home,
  Building,
  Briefcase,
  UserCheck,
  Dumbbell,
  Laptop,
  Flower2,
  MessageSquare,
} from "lucide-react";

interface StepFamilyProps {
  formData: Partial<WizardFormData>;
  updateForm: (data: Partial<WizardFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FAMILY_COMPOSITIONS = [
  {
    value: "solteiro",
    label: "Solteiro(a)",
    icon: UserRound,
    description: "Moradia individual",
  },
  {
    value: "casal",
    label: "Casal",
    icon: UsersRound,
    description: "Duas pessoas",
  },
  {
    value: "casal_filhos",
    label: "Casal com Filhos",
    icon: Home,
    description: "Familia com criancas",
  },
  {
    value: "multigeracional",
    label: "Multigeracional",
    icon: Building,
    description: "Varias geracoes",
  },
] as const;

const LIFESTYLE_TOGGLES = [
  { key: "hasPets" as const, label: "Animais de Estimacao", icon: Heart },
  {
    key: "hasSpecialNeeds" as const,
    label: "Acessibilidade",
    icon: Accessibility,
  },
  { key: "expandFamily" as const, label: "Familia em Expansao", icon: Baby },
  { key: "hasHomeOffice" as const, label: "Home Office", icon: Briefcase },
  { key: "hasElderly" as const, label: "Idosos na Casa", icon: UserCheck },
] as const;

const HABIT_TOGGLES = [
  {
    key: "likesParties" as const,
    label: "Recebe Visitas/Festas",
    icon: PartyPopper,
  },
  {
    key: "cookingImportance" as const,
    label: "Cozinha e Importante",
    icon: ChefHat,
  },
  {
    key: "exercisesAtHome" as const,
    label: "Exercicios em Casa",
    icon: Dumbbell,
  },
  {
    key: "worksFromHome" as const,
    label: "Trabalha de Casa",
    icon: Laptop,
  },
  {
    key: "likesGardening" as const,
    label: "Gosta de Jardinagem",
    icon: Flower2,
  },
] as const;

const IMPORTANT_SPACES = [
  { value: "cozinha", label: "Cozinha", icon: ChefHat },
  { value: "sala", label: "Sala", icon: Sofa },
  { value: "quarto", label: "Quarto", icon: Bed },
  { value: "area_social", label: "Area Social", icon: Users },
  { value: "varanda", label: "Varanda", icon: TreePine },
  { value: "escritorio", label: "Escritorio", icon: Monitor },
] as const;

export function StepFamily({
  formData,
  updateForm,
  onNext,
  onBack,
}: StepFamilyProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOtherNeeds, setShowOtherNeeds] = useState(
    !!(formData as Record<string, unknown>).otherNeeds
  );
  const [showOtherHabits, setShowOtherHabits] = useState(
    !!(formData as Record<string, unknown>).otherHabits
  );

  const residentsCount = formData.residentsCount ?? 2;
  const familyComposition = formData.familyComposition ?? "";
  const importantSpace = formData.importantSpace ?? "";

  function handleResidentsChange(delta: number) {
    const next = Math.min(20, Math.max(1, residentsCount + delta));
    updateForm({ residentsCount: next });
  }

  function handleToggle(key: keyof WizardFormData) {
    const current = formData[key] as boolean | undefined;
    updateForm({ [key]: !current });
  }

  function handleValidateAndNext() {
    const payload = {
      residentsCount: formData.residentsCount ?? 2,
      familyComposition: formData.familyComposition ?? "",
      hasPets: formData.hasPets ?? false,
      hasSpecialNeeds: formData.hasSpecialNeeds ?? false,
      expandFamily: formData.expandFamily ?? false,
      likesParties: formData.likesParties ?? false,
      cookingImportance: formData.cookingImportance ?? false,
      importantSpace: formData.importantSpace ?? "",
    };

    const result = stepFamilySchema.safeParse(payload);
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
          Familia & Estilo de Vida
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conte-nos sobre quem vai morar na casa para personalizarmos o projeto.
        </p>
      </div>

      {/* Residents Count Stepper */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Numero de Moradores
        </label>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleResidentsChange(-1)}
            disabled={residentsCount <= 1}
            className="h-11 w-11 rounded-xl border-2 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
          >
            <Minus className="size-5" />
          </Button>

          <div className="flex min-w-[80px] flex-col items-center justify-center rounded-xl bg-[var(--primary)]/5 px-6 py-3">
            <span className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold text-[var(--primary)]">
              {residentsCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {residentsCount === 1 ? "pessoa" : "pessoas"}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleResidentsChange(1)}
            disabled={residentsCount >= 20}
            className="h-11 w-11 rounded-xl border-2 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      {/* Family Composition */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Composicao Familiar
        </label>
        {errors.familyComposition && (
          <p className="text-xs text-[var(--error)]">
            {errors.familyComposition}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FAMILY_COMPOSITIONS.map((item) => {
            const Icon = item.icon;
            const selected = familyComposition === item.value;
            return (
              <Card
                key={item.value}
                onClick={() => updateForm({ familyComposition: item.value })}
                className={cn(
                  "group relative cursor-pointer p-4 transition-all duration-200 hover:shadow-md",
                  selected
                    ? "border-2 border-[var(--accent)] bg-[var(--accent)]/5 shadow-md ring-1 ring-[var(--accent)]/30"
                    : "border-2 border-transparent hover:border-[var(--accent)]/40"
                )}
              >
                {selected && (
                  <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl transition-colors",
                      selected
                        ? "bg-[var(--accent)]/15 text-[var(--accent-dark)]"
                        : "bg-[var(--primary)]/5 text-[var(--primary)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent-dark)]"
                    )}
                  >
                    <Icon className="size-6" />
                  </div>
                  <span className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Lifestyle Toggles — Necessidades Especiais */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Necessidades Especiais
        </label>
        <div className="flex flex-wrap gap-3">
          {LIFESTYLE_TOGGLES.map((item) => {
            const Icon = item.icon;
            const active = !!(formData[item.key] as boolean | undefined);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggle(item.key)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                    : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {active && <Check className="size-3.5" />}
              </button>
            );
          })}
          {/* Outros toggle */}
          <button
            type="button"
            onClick={() => {
              setShowOtherNeeds(!showOtherNeeds);
              if (showOtherNeeds) {
                updateForm({ otherNeeds: "" } as Partial<WizardFormData>);
              }
            }}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200",
              showOtherNeeds
                ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
            )}
          >
            <MessageSquare className="size-4" />
            Outros
            {showOtherNeeds && <Check className="size-3.5" />}
          </button>
        </div>
        {showOtherNeeds && (
          <textarea
            placeholder="Descreva outras necessidades especiais..."
            value={
              ((formData as Record<string, unknown>).otherNeeds as string) ?? ""
            }
            onChange={(e) =>
              updateForm({ otherNeeds: e.target.value } as Partial<WizardFormData>)
            }
            rows={2}
            className="w-full rounded-xl border-2 border-[var(--primary)]/10 bg-white px-4 py-3 text-sm text-[var(--primary)] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          />
        )}
      </div>

      {/* Habit Toggles */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Habitos & Rotina
        </label>
        <div className="flex flex-wrap gap-3">
          {HABIT_TOGGLES.map((item) => {
            const Icon = item.icon;
            const active = !!(formData[item.key] as boolean | undefined);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggle(item.key)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                    : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {active && <Check className="size-3.5" />}
              </button>
            );
          })}
          {/* Outros toggle */}
          <button
            type="button"
            onClick={() => {
              setShowOtherHabits(!showOtherHabits);
              if (showOtherHabits) {
                updateForm({ otherHabits: "" } as Partial<WizardFormData>);
              }
            }}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200",
              showOtherHabits
                ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                : "border-2 border-[var(--primary)]/15 bg-white text-[var(--primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
            )}
          >
            <MessageSquare className="size-4" />
            Outros
            {showOtherHabits && <Check className="size-3.5" />}
          </button>
        </div>
        {showOtherHabits && (
          <textarea
            placeholder="Descreva outros habitos ou necessidades de rotina..."
            value={
              ((formData as Record<string, unknown>).otherHabits as string) ?? ""
            }
            onChange={(e) =>
              updateForm({ otherHabits: e.target.value } as Partial<WizardFormData>)
            }
            rows={2}
            className="w-full rounded-xl border-2 border-[var(--primary)]/10 bg-white px-4 py-3 text-sm text-[var(--primary)] placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          />
        )}
      </div>

      {/* Important Space */}
      <div className="space-y-3">
        <label className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-[var(--primary)]">
          Espaco Mais Importante
        </label>
        {errors.importantSpace && (
          <p className="text-xs text-[var(--error)]">
            {errors.importantSpace}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {IMPORTANT_SPACES.map((item) => {
            const Icon = item.icon;
            const selected = importantSpace === item.value;
            return (
              <Card
                key={item.value}
                onClick={() => updateForm({ importantSpace: item.value })}
                className={cn(
                  "group cursor-pointer p-3 transition-all duration-200 hover:shadow-md",
                  selected
                    ? "border-2 border-[var(--accent)] bg-[var(--accent)]/5 shadow-md"
                    : "border-2 border-transparent hover:border-[var(--accent)]/40"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      selected
                        ? "bg-[var(--accent)]/15 text-[var(--accent-dark)]"
                        : "bg-[var(--primary)]/5 text-[var(--primary)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent-dark)]"
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      selected
                        ? "text-[var(--accent-dark)]"
                        : "text-[var(--primary)]"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Card>
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
