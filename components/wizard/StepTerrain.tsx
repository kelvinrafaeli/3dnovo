"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Ruler, Mountain, Droplets } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCepLookup } from "@/hooks/useCepLookup";
import { stepTerrainSchema } from "@/lib/validation";
import type { WizardFormData } from "@/lib/validation";

/* ---------- Types ---------- */

interface StepTerrainProps {
  formData: Partial<WizardFormData>;
  updateForm: (data: Partial<WizardFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/* ---------- Constants ---------- */

const TERRAIN_TYPES = [
  { value: "urbano", label: "Urbano" },
  { value: "condominio", label: "Condominio" },
  { value: "rural", label: "Rural" },
  { value: "esquina", label: "Esquina" },
];

const TOPOGRAPHY_OPTIONS = [
  { value: "plano", label: "Plano" },
  { value: "aclive", label: "Aclive" },
  { value: "declive", label: "Declive" },
  { value: "misto", label: "Misto" },
];

const SOIL_OPTIONS = [
  { value: "argiloso", label: "Argiloso" },
  { value: "arenoso", label: "Arenoso" },
  { value: "silto-argiloso", label: "Silto-argiloso" },
  { value: "rochoso", label: "Rochoso" },
  { value: "misto", label: "Misto" },
];

const NEIGHBOR_OPTIONS = [
  { value: "residencial_baixo", label: "Residencial Baixo" },
  { value: "residencial_alto", label: "Residencial Alto" },
  { value: "comercial", label: "Comercial" },
  { value: "area_livre", label: "Area Livre" },
  { value: "muro_cego", label: "Muro Cego" },
];

/* ---------- Sub-components ---------- */

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--neutral-light)]/20 pb-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-[family-name:var(--font-dm-sans)] text-base font-semibold text-[var(--primary)]">
        {title}
      </h3>
    </div>
  );
}

function PillSelector({
  options,
  value,
  onChange,
  error,
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-sm ring-1 ring-[var(--primary)]/20"
                  : "border-[var(--neutral-light)]/50 bg-white text-[var(--neutral-dark)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.03]"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}

function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md"
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-[var(--primary)]" : "bg-[var(--neutral-light)]/50"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <span className="text-sm font-medium text-[var(--primary)]">
        {label}
      </span>
    </label>
  );
}

/* ---------- Component ---------- */

export function StepTerrain({
  formData,
  updateForm,
  onNext,
  onBack,
}: StepTerrainProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { lookup, loading: cepLoading, error: cepError } = useCepLookup();

  /* Calculated area */
  const estimatedArea = useMemo(() => {
    const front = Number(formData.frontMeters) || 0;
    const back = Number(formData.backMeters) || 0;
    const right = Number(formData.rightMeters) || 0;
    const left = Number(formData.leftMeters) || 0;
    if (front <= 0 && back <= 0 && right <= 0 && left <= 0) return 0;
    return ((front + back) / 2) * ((right + left) / 2);
  }, [formData.frontMeters, formData.backMeters, formData.rightMeters, formData.leftMeters]);

  /* CEP lookup handler */
  async function handleCepLookup() {
    const result = await lookup(formData.cep ?? "");
    if (result) {
      updateForm({
        street: result.street,
        neighborhood: result.neighborhood,
        city: result.city,
        state: result.state,
      });
    }
  }

  /* Validation */
  function handleNext() {
    const payload = {
      cep: formData.cep ?? "",
      street: formData.street ?? "",
      number: formData.number ?? "",
      neighborhood: formData.neighborhood ?? "",
      city: formData.city ?? "",
      state: formData.state ?? "",
      terrainType: formData.terrainType ?? "",
      frontMeters: formData.frontMeters ?? 0,
      backMeters: formData.backMeters ?? 0,
      rightMeters: formData.rightMeters ?? 0,
      leftMeters: formData.leftMeters ?? 0,
      topography: formData.topography ?? "",
      soilType: formData.soilType ?? "",
      leftNeighbor: formData.leftNeighbor ?? "",
      rightNeighbor: formData.rightNeighbor ?? "",
      backNeighbor: formData.backNeighbor ?? "",
      hasWater: formData.hasWater ?? false,
      hasSewer: formData.hasSewer ?? false,
      hasElectricity: formData.hasElectricity ?? false,
    };

    const result = stepTerrainSchema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onNext();
  }

  /* Helpers */
  function textField(key: keyof WizardFormData) {
    return {
      value: (formData[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        updateForm({ [key]: e.target.value });
        if (errors[key]) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      },
    };
  }

  function numberField(key: keyof WizardFormData) {
    return {
      value: (formData[key] as number) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === "" ? undefined : Number(e.target.value);
        updateForm({ [key]: val } as Partial<WizardFormData>);
        if (errors[key]) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      },
    };
  }

  function clearError(key: string) {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h2 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[var(--primary)]">
          Terreno & Localizacao
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral)]">
          Informe os dados do terreno onde deseja construir.
        </p>
      </div>

      {/* ═══════════ Section: Localizacao ═══════════ */}
      <section className="space-y-4">
        <SectionHeader icon={MapPin} title="Localizacao" />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* CEP + Buscar */}
          <div className="sm:col-span-2">
            <Label htmlFor="cep">
              CEP <span className="text-[var(--error)]">*</span>
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="cep"
                placeholder="00000-000"
                className={cn("flex-1", errors.cep && "border-[var(--error)]")}
                {...textField("cep")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCepLookup}
                disabled={cepLoading}
                className="shrink-0 gap-2"
              >
                <Search className="h-4 w-4" />
                {cepLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {errors.cep && (
              <p className="mt-1 text-xs text-[var(--error)]">{errors.cep}</p>
            )}
            {cepError && (
              <p className="mt-1 text-xs text-[var(--error)]">{cepError}</p>
            )}
          </div>

          {/* Street (readonly) */}
          <div className="sm:col-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              readOnly
              className="mt-1.5 bg-[var(--surface-alt)] opacity-80"
              value={formData.street ?? ""}
              placeholder="Preenchido automaticamente"
            />
            {errors.street && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.street}
              </p>
            )}
          </div>

          {/* Number */}
          <div>
            <Label htmlFor="number">
              Numero <span className="text-[var(--error)]">*</span>
            </Label>
            <Input
              id="number"
              placeholder="123"
              className={cn(
                "mt-1.5",
                errors.number && "border-[var(--error)]"
              )}
              {...textField("number")}
            />
            {errors.number && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.number}
              </p>
            )}
          </div>

          {/* Neighborhood (readonly) */}
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              readOnly
              className="mt-1.5 bg-[var(--surface-alt)] opacity-80"
              value={formData.neighborhood ?? ""}
              placeholder="Preenchido automaticamente"
            />
            {errors.neighborhood && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.neighborhood}
              </p>
            )}
          </div>

          {/* City (readonly) */}
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              readOnly
              className="mt-1.5 bg-[var(--surface-alt)] opacity-80"
              value={formData.city ?? ""}
              placeholder="Preenchido automaticamente"
            />
            {errors.city && (
              <p className="mt-1 text-xs text-[var(--error)]">{errors.city}</p>
            )}
          </div>

          {/* State (readonly) */}
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              readOnly
              className="mt-1.5 bg-[var(--surface-alt)] opacity-80"
              value={formData.state ?? ""}
              placeholder="UF"
            />
            {errors.state && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.state}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ Section: Tipo de Terreno ═══════════ */}
      <section className="space-y-4">
        <SectionHeader icon={MapPin} title="Tipo de Terreno" />
        <div>
          <Label className="mb-2 block text-sm">
            Tipo <span className="text-[var(--error)]">*</span>
          </Label>
          <PillSelector
            options={TERRAIN_TYPES}
            value={formData.terrainType}
            onChange={(v) => {
              updateForm({ terrainType: v });
              clearError("terrainType");
            }}
            error={errors.terrainType}
          />
        </div>
      </section>

      {/* ═══════════ Section: Dimensoes ═══════════ */}
      <section className="space-y-4">
        <SectionHeader icon={Ruler} title="Dimensoes do Lote" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="frontMeters">
              Frente (m) <span className="text-[var(--error)]">*</span>
            </Label>
            <Input
              id="frontMeters"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={cn(
                "mt-1.5",
                errors.frontMeters && "border-[var(--error)]"
              )}
              {...numberField("frontMeters")}
            />
            {errors.frontMeters && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.frontMeters}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="backMeters">
              Fundos (m) <span className="text-[var(--error)]">*</span>
            </Label>
            <Input
              id="backMeters"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={cn(
                "mt-1.5",
                errors.backMeters && "border-[var(--error)]"
              )}
              {...numberField("backMeters")}
            />
            {errors.backMeters && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.backMeters}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="leftMeters">
              Esquerda (m) <span className="text-[var(--error)]">*</span>
            </Label>
            <Input
              id="leftMeters"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={cn(
                "mt-1.5",
                errors.leftMeters && "border-[var(--error)]"
              )}
              {...numberField("leftMeters")}
            />
            {errors.leftMeters && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.leftMeters}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="rightMeters">
              Direita (m) <span className="text-[var(--error)]">*</span>
            </Label>
            <Input
              id="rightMeters"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={cn(
                "mt-1.5",
                errors.rightMeters && "border-[var(--error)]"
              )}
              {...numberField("rightMeters")}
            />
            {errors.rightMeters && (
              <p className="mt-1 text-xs text-[var(--error)]">
                {errors.rightMeters}
              </p>
            )}
          </div>
        </div>

        {/* Calculated area */}
        {estimatedArea > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--accent)]/10 px-4 py-3">
            <Ruler className="h-4 w-4 text-[var(--accent-dark)]" />
            <span className="text-sm font-semibold text-[var(--accent-dark)]">
              Area estimada: {estimatedArea.toFixed(1)} m&sup2;
            </span>
          </div>
        )}
      </section>

      {/* ═══════════ Section: Caracteristicas ═══════════ */}
      <section className="space-y-5">
        <SectionHeader icon={Mountain} title="Caracteristicas" />

        <div>
          <Label className="mb-2 block text-sm">
            Topografia <span className="text-[var(--error)]">*</span>
          </Label>
          <PillSelector
            options={TOPOGRAPHY_OPTIONS}
            value={formData.topography}
            onChange={(v) => {
              updateForm({ topography: v });
              clearError("topography");
            }}
            error={errors.topography}
          />
        </div>

        <div>
          <Label className="mb-2 block text-sm">
            Tipo de Solo <span className="text-[var(--error)]">*</span>
          </Label>
          <PillSelector
            options={SOIL_OPTIONS}
            value={formData.soilType}
            onChange={(v) => {
              updateForm({ soilType: v });
              clearError("soilType");
            }}
            error={errors.soilType}
          />
        </div>
      </section>

      {/* ═══════════ Section: Vizinhanca ═══════════ */}
      <section className="space-y-4">
        <SectionHeader icon={MapPin} title="Vizinhanca" />

        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["leftNeighbor", "Vizinho Esquerda"],
              ["rightNeighbor", "Vizinho Direita"],
              ["backNeighbor", "Vizinho Fundos"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>
                {label} <span className="text-[var(--error)]">*</span>
              </Label>
              <select
                id={key}
                value={(formData[key] as string) ?? ""}
                onChange={(e) => {
                  updateForm({ [key]: e.target.value } as Partial<WizardFormData>);
                  clearError(key);
                }}
                className={cn(
                  "mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  errors[key] && "border-[var(--error)]"
                )}
              >
                <option value="">Selecionar...</option>
                {NEIGHBOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors[key] && (
                <p className="mt-1 text-xs text-[var(--error)]">
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ Section: Infraestrutura ═══════════ */}
      <section className="space-y-4">
        <SectionHeader icon={Droplets} title="Infraestrutura" />

        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleSwitch
            id="hasWater"
            label="Agua encanada"
            checked={formData.hasWater ?? false}
            onChange={(v) => updateForm({ hasWater: v })}
          />
          <ToggleSwitch
            id="hasSewer"
            label="Rede de esgoto"
            checked={formData.hasSewer ?? false}
            onChange={(v) => updateForm({ hasSewer: v })}
          />
          <ToggleSwitch
            id="hasElectricity"
            label="Energia eletrica"
            checked={formData.hasElectricity ?? false}
            onChange={(v) => updateForm({ hasElectricity: v })}
          />
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" size="lg" onClick={onBack}>
          Voltar
        </Button>
        <Button variant="accent" size="lg" onClick={handleNext}>
          Proximo
        </Button>
      </div>
    </div>
  );
}
