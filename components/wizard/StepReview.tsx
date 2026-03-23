"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStyleById } from "@/lib/styles";
import type { WizardFormData } from "@/lib/validation";
import {
  ArrowLeft,
  Pencil,
  Rocket,
  User,
  MapPin,
  Users,
  Palette,
  Home,
  Droplets,
  Zap,
  Check,
  X,
} from "lucide-react";
import Image from "next/image";

interface StepReviewProps {
  formData: Partial<WizardFormData>;
  onSubmit: () => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="min-w-[120px] shrink-0 font-medium text-[var(--primary)]/60">
        {label}
      </span>
      <span className="text-[var(--primary)]">{value || "—"}</span>
    </div>
  );
}

function BoolIndicator({
  label,
  value,
}: {
  label: string;
  value: boolean | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        value
          ? "bg-green-50 text-green-700"
          : "bg-gray-100 text-gray-400"
      )}
    >
      {value ? (
        <Check className="size-3" />
      ) : (
        <X className="size-3" />
      )}
      {label}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  stepNumber,
  onEdit,
  children,
}: {
  title: string;
  icon: typeof User;
  stepNumber: number;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-[var(--accent)]" />
          {title}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="gap-1 text-xs text-muted-foreground hover:text-[var(--accent)]"
        >
          <Pencil className="size-3" />
          Editar
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

export function StepReview({
  formData,
  onSubmit,
  onBack,
  onGoToStep,
}: StepReviewProps) {
  const style = getStyleById(formData.architecturalStyle ?? "");
  const fd = formData as Record<string, unknown>;

  const address = [
    formData.street,
    formData.number,
    formData.neighborhood,
    formData.city,
    formData.state,
  ]
    .filter(Boolean)
    .join(", ");

  const terrainDimensions = formData.frontMeters
    ? `${formData.frontMeters}m (frente) x ${formData.rightMeters}m (dir.) x ${formData.backMeters}m (fundos) x ${formData.leftMeters}m (esq.)`
    : undefined;

  const floorsLabel =
    formData.floors === "terrea"
      ? "Terrea (1 Pavimento)"
      : formData.floors === "sobrado"
        ? "Sobrado (2 Pavimentos)"
        : formData.floors;

  const structureLabel =
    formData.structure === "concreto"
      ? "Concreto Armado"
      : formData.structure === "metalica"
        ? "Estrutura Metalica"
        : formData.structure === "madeira_vidro"
          ? "Madeira e Vidro"
          : formData.structure;

  const compositionLabel =
    formData.familyComposition === "solteiro"
      ? "Solteiro(a)"
      : formData.familyComposition === "casal"
        ? "Casal"
        : formData.familyComposition === "casal_filhos"
          ? "Casal com Filhos"
          : formData.familyComposition === "multigeracional"
            ? "Multigeracional"
            : formData.familyComposition;

  const selectedRooms = (formData.selectedRooms as string[]) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[var(--primary)]">
          Resumo do Projeto
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revise as informacoes antes de gerar seu projeto. Clique em
          &ldquo;Editar&rdquo; para corrigir qualquer secao.
        </p>
      </div>

      {/* Section 1: Dados Pessoais */}
      <SectionCard
        title="Dados Pessoais"
        icon={User}
        stepNumber={1}
        onEdit={() => onGoToStep(1)}
      >
        <InfoRow label="Nome" value={formData.fullName} />
        <InfoRow label="Documento" value={formData.document} />
        {formData.email && <InfoRow label="Email" value={formData.email} />}
        {formData.contact && (
          <InfoRow label="Contato" value={formData.contact} />
        )}
        <InfoRow label="Objetivo" value={formData.objective} />
        <InfoRow label="Orcamento" value={formData.budgetRange} />
      </SectionCard>

      {/* Section 2: Terreno */}
      <SectionCard
        title="Terreno & Localizacao"
        icon={MapPin}
        stepNumber={2}
        onEdit={() => onGoToStep(2)}
      >
        <InfoRow label="CEP" value={formData.cep} />
        <InfoRow label="Endereco" value={address} />
        <InfoRow label="Dimensoes" value={terrainDimensions} />
        <InfoRow label="Topografia" value={formData.topography} />
        <InfoRow label="Solo" value={formData.soilType} />
        <InfoRow label="Tipo" value={formData.terrainType} />

        <div className="pt-2">
          <span className="text-xs font-medium text-[var(--primary)]/60">
            Infraestrutura
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                formData.hasWater
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              <Droplets className="size-3" />
              Agua
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                formData.hasSewer
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              <Droplets className="size-3" />
              Esgoto
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                formData.hasElectricity
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              <Zap className="size-3" />
              Eletricidade
            </span>
          </div>
        </div>

        <div className="pt-1">
          <span className="text-xs font-medium text-[var(--primary)]/60">
            Vizinhos
          </span>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--primary)]">
            <span>Esq: {formData.leftNeighbor || "—"}</span>
            <span>Dir: {formData.rightNeighbor || "—"}</span>
            <span>Fundos: {formData.backNeighbor || "—"}</span>
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Familia */}
      <SectionCard
        title="Familia & Estilo de Vida"
        icon={Users}
        stepNumber={3}
        onEdit={() => onGoToStep(3)}
      >
        <InfoRow
          label="Moradores"
          value={String(formData.residentsCount ?? "—")}
        />
        <InfoRow label="Composicao" value={compositionLabel} />
        <InfoRow label="Espaco Importante" value={formData.importantSpace} />

        <div className="pt-2">
          <span className="text-xs font-medium text-[var(--primary)]/60">
            Necessidades
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <BoolIndicator label="Pets" value={formData.hasPets} />
            <BoolIndicator
              label="Acessibilidade"
              value={formData.hasSpecialNeeds}
            />
            <BoolIndicator
              label="Familia em Expansao"
              value={formData.expandFamily}
            />
            <BoolIndicator
              label="Home Office"
              value={fd.hasHomeOffice as boolean | undefined}
            />
            <BoolIndicator
              label="Idosos"
              value={fd.hasElderly as boolean | undefined}
            />
          </div>
        </div>

        <div className="pt-2">
          <span className="text-xs font-medium text-[var(--primary)]/60">
            Habitos
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <BoolIndicator
              label="Festas/Visitas"
              value={formData.likesParties}
            />
            <BoolIndicator
              label="Cozinha"
              value={formData.cookingImportance}
            />
            <BoolIndicator
              label="Exercicios"
              value={fd.exercisesAtHome as boolean | undefined}
            />
            <BoolIndicator
              label="Trabalho Remoto"
              value={fd.worksFromHome as boolean | undefined}
            />
            <BoolIndicator
              label="Jardinagem"
              value={fd.likesGardening as boolean | undefined}
            />
          </div>
        </div>

        {typeof fd.otherNeeds === "string" && fd.otherNeeds && (
          <InfoRow
            label="Outras Nec."
            value={fd.otherNeeds}
          />
        )}
        {typeof fd.otherHabits === "string" && fd.otherHabits && (
          <InfoRow
            label="Outros Hab."
            value={fd.otherHabits}
          />
        )}
      </SectionCard>

      {/* Section 4: Estilo */}
      <SectionCard
        title="Estilo Arquitetonico"
        icon={Palette}
        stepNumber={4}
        onEdit={() => onGoToStep(4)}
      >
        <div className="flex items-center gap-4">
          {style && (
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={style.image}
                alt={style.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div>
            <p className="font-semibold text-[var(--primary)]">
              {style?.name ?? formData.architecturalStyle ?? "—"}
            </p>
            {style && (
              <p className="text-xs text-muted-foreground">
                {style.description}
              </p>
            )}
          </div>
        </div>
        <InfoRow label="Estrutura" value={structureLabel} />
        <InfoRow label="Pavimentos" value={floorsLabel} />
      </SectionCard>

      {/* Section 5: Comodos */}
      <SectionCard
        title="Comodos"
        icon={Home}
        stepNumber={5}
        onEdit={() => onGoToStep(5)}
      >
        <InfoRow
          label="Quartos"
          value={String(formData.bedroomCount ?? "—")}
        />
        <InfoRow
          label="Banheiros"
          value={String(formData.bathroomCount ?? "—")}
        />
        {selectedRooms.length > 0 && (
          <div className="pt-1">
            <span className="text-xs font-medium text-[var(--primary)]/60">
              Programa ({selectedRooms.length} comodos)
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedRooms.map((room) => (
                <span
                  key={room}
                  className="rounded-full bg-[var(--primary)]/5 px-3 py-1 text-xs font-medium text-[var(--primary)]"
                >
                  {room}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

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
          onClick={onSubmit}
          className="gap-2"
        >
          <Rocket className="size-4" />
          Gerar Meu Projeto
        </Button>
      </div>
    </div>
  );
}
