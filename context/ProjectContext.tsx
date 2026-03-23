"use client";

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type { WizardFormData } from "@/lib/validation";

// --- Types ---

export interface GenerationPackage {
  generatedAt: string;
  summary: Record<string, unknown>;
  roomProgram: string[];
  formData: Record<string, unknown>;
  prompts: {
    plan2DTechnical: { prompt: string };
    plan2DRenderNanoBanana2: { prompt: string };
    plan3DTotal: { prompt: string };
    plan3DRooms: Array<{ room: string; prompt: string }>;
    facade3D: { prompt: string };
  };
}

export interface RenderResult {
  model: string;
  usedFallback: boolean;
  text: string;
  imageDataUrl: string;
}

export interface ExtractionResult {
  model: string;
  usedFallback: boolean;
  extractedPlanData: Record<string, unknown>;
  rawText: string | null;
}

export interface Plan3DResults {
  total: RenderResult | null;
  facade: RenderResult | null;
  rooms: Array<{
    room: string;
    result: RenderResult;
  }>;
}

export interface ConsistencyLock {
  visualSignature: string;
  extractedPlanData: Record<string, unknown> | null;
  referencePlanImageDataUrl: string;
}

export type ProjectPhase = "wizard" | "generating" | "results";

export interface ProjectState {
  formData: Partial<WizardFormData>;
  generationPackage: GenerationPackage | null;
  plan2DResult: RenderResult | null;
  extractedPlanData: ExtractionResult | null;
  plan3DResults: Plan3DResults | null;
  consistencyLock: ConsistencyLock | null;
  selectedRooms: string[];
  currentPhase: ProjectPhase;
}

// --- Actions ---

type ProjectAction =
  | { type: "UPDATE_FORM"; payload: Partial<WizardFormData> }
  | { type: "SET_PHASE"; payload: ProjectPhase }
  | { type: "SET_GENERATION_PACKAGE"; payload: GenerationPackage }
  | { type: "SET_PLAN_2D"; payload: RenderResult }
  | { type: "SET_EXTRACTION"; payload: ExtractionResult }
  | { type: "SET_PLAN_3D"; payload: Plan3DResults }
  | { type: "SET_CONSISTENCY_LOCK"; payload: ConsistencyLock }
  | { type: "UPDATE_ROOM_3D"; payload: { roomIndex: number; result: RenderResult } }
  | { type: "SET_SELECTED_ROOMS"; payload: string[] }
  | { type: "RESTORE_PIPELINE"; payload: Partial<ProjectState> }
  | { type: "RESET" };

// --- Reducer ---

const initialState: ProjectState = {
  formData: {},
  generationPackage: null,
  plan2DResult: null,
  extractedPlanData: null,
  plan3DResults: null,
  consistencyLock: null,
  selectedRooms: [],
  currentPhase: "wizard",
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "UPDATE_FORM":
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case "SET_PHASE":
      return { ...state, currentPhase: action.payload };
    case "SET_GENERATION_PACKAGE":
      return { ...state, generationPackage: action.payload };
    case "SET_PLAN_2D":
      return { ...state, plan2DResult: action.payload };
    case "SET_EXTRACTION":
      return { ...state, extractedPlanData: action.payload };
    case "SET_PLAN_3D":
      return { ...state, plan3DResults: action.payload };
    case "SET_CONSISTENCY_LOCK":
      return { ...state, consistencyLock: action.payload };
    case "SET_SELECTED_ROOMS":
      return { ...state, selectedRooms: action.payload };
    case "UPDATE_ROOM_3D": {
      if (!state.plan3DResults) return state;
      const rooms = [...state.plan3DResults.rooms];
      rooms[action.payload.roomIndex] = {
        ...rooms[action.payload.roomIndex],
        result: action.payload.result,
      };
      return { ...state, plan3DResults: { ...state.plan3DResults, rooms } };
    }
    case "RESTORE_PIPELINE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// --- Context ---

const ProjectContext = createContext<{
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
} | null>(null);

export const FORM_KEY = "construlink-wizard";
export const PIPELINE_KEY = "construlink-pipeline";

/** Clears all Construlink localStorage data */
export function clearProjectStorage() {
  try {
    localStorage.removeItem(FORM_KEY);
    localStorage.removeItem(PIPELINE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Saves pipeline state (generationPackage, plan2DResult, extraction, etc.)
 * Tries full save first; if quota exceeded, saves without image data.
 */
function savePipelineState(state: ProjectState) {
  const data = {
    generationPackage: state.generationPackage,
    plan2DResult: state.plan2DResult,
    extractedPlanData: state.extractedPlanData,
    consistencyLock: state.consistencyLock,
    plan3DResults: state.plan3DResults,
    selectedRooms: state.selectedRooms,
    currentPhase: state.currentPhase,
  };

  try {
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded — try saving without large image data
    try {
      const lite = {
        ...data,
        plan2DResult: null,
        plan3DResults: null,
        consistencyLock: data.consistencyLock
          ? { ...data.consistencyLock, referencePlanImageDataUrl: "" }
          : null,
      };
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(lite));
    } catch {
      // ignore — can't save
    }
  }
}

function loadPipelineState(): Partial<ProjectState> | null {
  try {
    const stored = localStorage.getItem(PIPELINE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // On mount, restore formData AND pipeline state from localStorage
  useEffect(() => {
    // Restore form data
    try {
      const stored = localStorage.getItem(FORM_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Object.keys(parsed).length > 0) {
          dispatch({ type: "UPDATE_FORM", payload: parsed });
        }
      }
    } catch {
      // ignore
    }

    // Restore pipeline state (generationPackage, plan2DResult, etc.)
    const pipelineState = loadPipelineState();
    if (pipelineState) {
      dispatch({ type: "RESTORE_PIPELINE", payload: pipelineState });
    }
  }, []);

  // Persist formData whenever it changes
  useEffect(() => {
    try {
      if (Object.keys(state.formData).length > 0) {
        localStorage.setItem(FORM_KEY, JSON.stringify(state.formData));
      }
    } catch {
      // ignore
    }
  }, [state.formData]);

  // Persist pipeline state whenever relevant parts change
  useEffect(() => {
    if (
      state.generationPackage ||
      state.plan2DResult ||
      state.extractedPlanData ||
      state.plan3DResults
    ) {
      savePipelineState(state);
    }
  }, [
    state.generationPackage,
    state.plan2DResult,
    state.extractedPlanData,
    state.consistencyLock,
    state.plan3DResults,
    state.selectedRooms,
    state.currentPhase,
  ]);

  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
