"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject, clearProjectStorage, FORM_KEY } from "@/context/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WizardProgress, type WizardStep } from "./WizardProgress";
import { StepPersonal } from "./StepPersonal";
import { StepTerrain } from "./StepTerrain";
import { StepFamily } from "./StepFamily";
import { StepStyle } from "./StepStyle";
import { StepRooms } from "./StepRooms";
import type { WizardFormData } from "@/lib/validation";
import { History, PenLine } from "lucide-react";

/* ---------- Constants ---------- */

const WIZARD_STEPS: WizardStep[] = [
  { number: 1, label: "Pessoal" },
  { number: 2, label: "Terreno" },
  { number: 3, label: "Familia" },
  { number: 4, label: "Estilo" },
  { number: 5, label: "Comodos" },
];

const TOTAL_STEPS = WIZARD_STEPS.length;
const STORAGE_KEY = FORM_KEY;

/* ---------- Resume Banner ---------- */

function ResumeBanner({
  onContinue,
  onStartFresh,
}: {
  onContinue: () => void;
  onStartFresh: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardContent className="p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <History className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <h2 className="mb-2 font-[family-name:var(--font-dm-sans)] text-xl font-bold text-[var(--primary)]">
            Preenchimento anterior encontrado
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Encontramos dados de um projeto anterior. Deseja continuar de onde parou ou iniciar um novo preenchimento?
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="accent"
              className="flex-1 gap-2"
              onClick={onContinue}
            >
              <History className="h-4 w-4" />
              Continuar de onde parei
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={onStartFresh}
            >
              <PenLine className="h-4 w-4" />
              Iniciar do zero
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Main Wizard ---------- */

export function Wizard() {
  const router = useRouter();
  const { state, dispatch } = useProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [showResume, setShowResume] = useState(false);

  const formData = state.formData;

  // Detect saved data on mount: if context already loaded data from localStorage,
  // AND the user just arrived at the wizard (not returning from generate),
  // show the resume dialog.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WizardFormData>;
        if (parsed && Object.keys(parsed).length > 0) {
          setShowResume(true);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = useCallback(
    (partial: Partial<WizardFormData>) => {
      dispatch({ type: "UPDATE_FORM", payload: partial });
    },
    [dispatch]
  );

  const handleContinue = useCallback(() => {
    // Data is already loaded in context from ProjectProvider init — just dismiss
    setShowResume(false);
  }, []);

  const handleStartFresh = useCallback(() => {
    clearProjectStorage();
    dispatch({ type: "RESET" });
    setShowResume(false);
  }, [dispatch]);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(() => {
    dispatch({ type: "SET_PHASE", payload: "generating" });
    router.push("/generate");
  }, [dispatch, router]);

  function renderStep() {
    const shared = { formData, updateForm };
    switch (currentStep) {
      case 1:
        return <StepPersonal {...shared} onNext={goNext} />;
      case 2:
        return <StepTerrain {...shared} onNext={goNext} onBack={goBack} />;
      case 3:
        return <StepFamily {...shared} onNext={goNext} onBack={goBack} />;
      case 4:
        return <StepStyle {...shared} onNext={goNext} onBack={goBack} />;
      case 5:
        return <StepRooms {...shared} onNext={handleSubmit} onBack={goBack} />;
      default:
        return null;
    }
  }

  return (
    <>
      {showResume && (
        <ResumeBanner onContinue={handleContinue} onStartFresh={handleStartFresh} />
      )}

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-[var(--neutral)]">
          Etapa {currentStep} de {TOTAL_STEPS}
        </p>

        <div className="mb-8">
          <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />
        </div>

        <Card className="border-0 shadow-lg shadow-[var(--primary)]/[0.04]">
          <CardContent className="p-6 sm:p-8">{renderStep()}</CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-[var(--neutral-light)]">
          Construlink &mdash; Design Arquitetonico Inteligente
        </p>
      </div>
    </>
  );
}
