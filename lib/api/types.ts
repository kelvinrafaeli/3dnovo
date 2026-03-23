// --- Request types ---

export interface GenerateRequest {
  fullName: string;
  document: string;
  budgetRange: string;
  objective: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  terrainType: string;
  frontMeters: number;
  backMeters: number;
  rightMeters: number;
  leftMeters: number;
  topography: string;
  soilType: string;
  leftNeighbor: string;
  rightNeighbor: string;
  backNeighbor: string;
  hasWater: boolean;
  hasSewer: boolean;
  hasElectricity: boolean;
  architecturalStyle?: string;
}

/** Backend expects `prompt` (not `promptText`) */
export interface Render2DRequest {
  prompt: string;
}

/** Backend expects `referencePlanImageDataUrl` (not `plan2DImageDataUrl`) */
export interface Extract2DRequest {
  referencePlanImageDataUrl: string;
  roomProgram: string[];
  plan2DPrompt: string;
}

/** Backend expects flat fields, not a nested prompts object */
export interface Render3DPackageRequest {
  totalPrompt: string;
  facadePrompt: string;
  referencePlanImageDataUrl: string;
  referencePlanPrompt: string;
  extractedPlanData: Record<string, unknown>;
  consistencyLock: string | null;
  roomProgram: string[];
  roomPrompts: Array<{ room: string; prompt: string }>;
  maxRooms?: number;
}

/** Backend expects `prompt` + `label` (not `promptText` + `title`) */
export interface Render3DItemRequest {
  prompt: string;
  label: string;
  renderKind?: string;
  referencePlanImageDataUrl?: string;
  referencePlanPrompt?: string;
  extractedPlanData?: Record<string, unknown>;
  consistencyLock?: string;
  roomProgram?: string[];
  additionalReferenceImageDataUrls?: string[];
}

// --- Response types ---

/** Raw response from /api/plan/generate — prompts are plain strings from the backend */
export interface GenerateResponse {
  generatedAt: string;
  summary: Record<string, unknown>;
  roomProgram: string[];
  formData: Record<string, unknown>;
  prompts: {
    plan2DTechnical: string;
    plan2DRenderNanoBanana2: string;
    plan3DTotal: string;
    plan3DRooms: Array<{ room: string; prompt: string }>;
    facade3D: string;
  };
}

export interface RenderResult {
  model: string;
  usedFallback: boolean;
  usedReferenceImage?: boolean;
  text: string;
  imageDataUrl: string;
  fallbackType?: string;
  retryAfterSeconds?: number;
}

/** Backend wraps the result: `{ ok: true, result: RenderResult }` */
export interface Render2DRawResponse {
  ok: boolean;
  result: RenderResult;
}

/** Kept for backward compat in the hook */
export type RenderResponse = RenderResult;

export interface ExtractionResult {
  model: string;
  usedFallback: boolean;
  extractedPlanData: Record<string, unknown>;
  rawText: string | null;
}

/** Backend wraps extraction: `{ ok: true, extraction: ExtractionResult }` */
export interface Extract2DRawResponse {
  ok: boolean;
  extraction: ExtractionResult;
}

/** Kept for backward compat in the hook */
export type ExtractResponse = ExtractionResult;

/** Backend returns results as an object, not an array */
export interface Render3DPackageRawResponse {
  ok: boolean;
  partial: boolean;
  summary: { requestedRooms: number; renderedRooms: number };
  results: {
    total: { ok: boolean; result: RenderResult };
    facade: { ok: boolean; skipped?: boolean; result: RenderResult };
    rooms: Array<{ room: string; ok: boolean; result: RenderResult }>;
  };
}

/** Normalized response for the pipeline hook */
export interface Render3DPackageResponse {
  results: Array<{
    type: "total" | "facade" | "room";
    title: string;
    room?: string;
    result: RenderResult;
  }>;
}

/** Backend returns `{ ok: true, label, result: RenderResult }` */
export interface Render3DItemRawResponse {
  ok: boolean;
  label: string;
  result: RenderResult;
}
