"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  number: number;
  label: string;
}

interface WizardProgressProps {
  currentStep: number;
  steps: WizardStep[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <nav aria-label="Progresso do wizard" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <li
              key={step.number}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              {/* Step circle + label group */}
              <div className="relative flex flex-col items-center">
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isCompleted &&
                      "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md",
                    isCurrent &&
                      "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25 ring-4 ring-[var(--accent)]/15",
                    isFuture &&
                      "border-[var(--neutral-light)] bg-white text-[var(--neutral)]"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Label - visible on all screens for current, hidden on mobile for others */}
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-medium leading-tight transition-colors duration-200",
                    isCurrent
                      ? "block text-[var(--accent-dark)]"
                      : "hidden text-[var(--neutral)] sm:block",
                    isCompleted && "text-[var(--primary)]"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="mx-2 mt-[-1.25rem] flex h-0.5 flex-1 sm:mx-3">
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-all duration-500",
                      isCompleted
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--neutral-light)]/40"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
