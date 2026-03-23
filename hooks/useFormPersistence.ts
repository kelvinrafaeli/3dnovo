"use client";

import { useEffect, useState } from "react";
import type { WizardFormData } from "@/lib/validation";
import { FORM_KEY } from "@/context/ProjectContext";

const STORAGE_KEY = FORM_KEY;

/**
 * Reads the persisted form data from localStorage WITHOUT auto-applying it.
 * Returns whether there is saved data and helpers to load or discard it.
 */
export function useFormPersistence(
  formData: Partial<WizardFormData>,
  setFormData: (data: Partial<WizardFormData>) => void
) {
  const [hasSavedData, setHasSavedData] = useState(false);
  const [savedData, setSavedData] = useState<Partial<WizardFormData> | null>(null);

  // Detect saved data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WizardFormData>;
        if (parsed && Object.keys(parsed).length > 0) {
          setSavedData(parsed);
          setHasSavedData(true);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep localStorage in sync as form data changes (ProjectContext also does this,
  // but we keep it here as a secondary safeguard)
  useEffect(() => {
    try {
      if (Object.keys(formData).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      }
    } catch {
      // ignore
    }
  }, [formData]);

  function loadSaved() {
    if (savedData) {
      setFormData(savedData);
    }
    setHasSavedData(false);
  }

  function startFresh() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSavedData(null);
    setHasSavedData(false);
  }

  function clear() {
    startFresh();
  }

  return { hasSavedData, loadSaved, startFresh, clear };
}
