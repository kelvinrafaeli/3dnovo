"use client";

import { useState } from "react";
import {
  Home,
  Key,
  Building2,
  Layers,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stepPersonalSchema } from "@/lib/validation";
import type { WizardFormData } from "@/lib/validation";

/* ---------- Types ---------- */

interface StepPersonalProps {
  formData: Partial<WizardFormData>;
  updateForm: (data: Partial<WizardFormData>) => void;
  onNext: () => void;
}

interface BudgetOption {
  value: string;
  label: string;
}

interface ObjectiveOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

/* ---------- Constants ---------- */

const BUDGET_OPTIONS: BudgetOption[] = [
  { value: "ate_300k", label: "Ate R$ 300mil" },
  { value: "300k_600k", label: "R$ 300mil - 600mil" },
  { value: "600k_1m", label: "R$ 600mil - 1 milhao" },
  { value: "1m_2m", label: "R$ 1 - 2 milhoes" },
  { value: "acima_2m", label: "Acima de R$ 2 milhoes" },
];

const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  { value: "residencial_familiar", label: "Residencial Familiar", icon: Home },
  { value: "aluguel", label: "Aluguel", icon: Key },
  { value: "comercial", label: "Comercial", icon: Building2 },
  { value: "misto", label: "Misto", icon: Layers },
  { value: "investimento", label: "Investimento", icon: TrendingUp },
];

/* ---------- Component ---------- */

export function StepPersonal({
  formData,
  updateForm,
  onNext,
}: StepPersonalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleNext() {
    const result = stepPersonalSchema.safeParse({
      fullName: formData.fullName ?? "",
      document: formData.document ?? "",
      email: formData.email ?? "",
      contact: formData.contact ?? "",
      budgetRange: formData.budgetRange ?? "",
      objective: formData.objective ?? "",
    });

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

  function field(key: keyof WizardFormData) {
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

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h2 className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold text-[var(--primary)]">
          Dados Pessoais & Objetivo
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral)]">
          Conte-nos sobre voce e o que deseja construir.
        </p>
      </div>

      {/* ── Personal fields ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <Label htmlFor="fullName">
            Nome completo <span className="text-[var(--error)]">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="Seu nome completo"
            className={cn("mt-1.5", errors.fullName && "border-[var(--error)]")}
            {...field("fullName")}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-[var(--error)]">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Document */}
        <div>
          <Label htmlFor="document">
            CPF/CNPJ <span className="text-[var(--error)]">*</span>
          </Label>
          <Input
            id="document"
            placeholder="000.000.000-00"
            className={cn("mt-1.5", errors.document && "border-[var(--error)]")}
            {...field("document")}
          />
          {errors.document && (
            <p className="mt-1 text-xs text-[var(--error)]">
              {errors.document}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className={cn("mt-1.5", errors.email && "border-[var(--error)]")}
            {...field("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-[var(--error)]">{errors.email}</p>
          )}
        </div>

        {/* Contact / WhatsApp */}
        <div>
          <Label htmlFor="contact">WhatsApp</Label>
          <Input
            id="contact"
            placeholder="(11) 99999-9999"
            className="mt-1.5"
            {...field("contact")}
          />
        </div>
      </div>

      {/* ── Budget Range ── */}
      <div>
        <Label className="mb-3 block text-sm font-semibold text-[var(--primary)]">
          Faixa de Orcamento <span className="text-[var(--error)]">*</span>
        </Label>
        <div className="flex flex-wrap gap-2.5">
          {BUDGET_OPTIONS.map((opt) => {
            const selected = formData.budgetRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  updateForm({ budgetRange: opt.value });
                  if (errors.budgetRange) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.budgetRange;
                      return next;
                    });
                  }
                }}
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
        {errors.budgetRange && (
          <p className="mt-1.5 text-xs text-[var(--error)]">
            {errors.budgetRange}
          </p>
        )}
      </div>

      {/* ── Objective ── */}
      <div>
        <Label className="mb-3 block text-sm font-semibold text-[var(--primary)]">
          Objetivo Principal <span className="text-[var(--error)]">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {OBJECTIVE_OPTIONS.map((opt) => {
            const selected = formData.objective === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  updateForm({ objective: opt.value });
                  if (errors.objective) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.objective;
                      return next;
                    });
                  }
                }}
                className={cn(
                  "group flex flex-col items-center gap-2.5 rounded-xl border-2 px-4 py-5 text-center transition-all duration-200",
                  selected
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-md shadow-[var(--primary)]/10"
                    : "border-transparent bg-white shadow-sm hover:border-[var(--primary)]/30 hover:shadow-md"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
                    selected
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-alt)] text-[var(--neutral)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold leading-tight transition-colors",
                    selected
                      ? "text-[var(--primary)]"
                      : "text-[var(--neutral-dark)]"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        {errors.objective && (
          <p className="mt-1.5 text-xs text-[var(--error)]">
            {errors.objective}
          </p>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end pt-2">
        <Button variant="accent" size="lg" onClick={handleNext}>
          Proximo
        </Button>
      </div>
    </div>
  );
}
