import { apiFetch } from "./client";
import type {
  GenerateRequest,
  GenerateResponse,
  Render2DRequest,
  Render2DRawResponse,
  RenderResponse,
  Extract2DRequest,
  Extract2DRawResponse,
  ExtractResponse,
  Render3DPackageRequest,
  Render3DPackageRawResponse,
  Render3DPackageResponse,
  Render3DItemRequest,
  Render3DItemRawResponse,
} from "./types";

export const planApi = {
  /** Generate the full prompt package from form data */
  async generate(formData: GenerateRequest): Promise<GenerateResponse> {
    return apiFetch<GenerateResponse>("/plan/generate", { body: formData });
  },

  /** Render the 2D humanized floor plan */
  async render2D(promptText: string): Promise<RenderResponse> {
    const raw = await apiFetch<Render2DRawResponse>("/plan/render-2d", {
      body: { prompt: promptText } as Render2DRequest,
      timeout: 120000,
    });
    return raw.result;
  },

  /** Extract structured data from the 2D plan image */
  async extract2DData(
    plan2DImageDataUrl: string,
    roomProgram: string[],
    plan2DPrompt: string
  ): Promise<ExtractResponse> {
    const raw = await apiFetch<Extract2DRawResponse>("/plan/extract-2d-data", {
      body: {
        referencePlanImageDataUrl: plan2DImageDataUrl,
        roomProgram,
        plan2DPrompt,
      } as Extract2DRequest,
      timeout: 120000,
    });
    return raw.extraction;
  },

  /** Render the full 3D package (total + facade + rooms) */
  async render3DPackage(params: {
    prompts: {
      plan3DTotal: { prompt: string };
      plan3DRooms: Array<{ room: string; prompt: string }>;
      facade3D: { prompt: string };
      plan2DRenderNanoBanana2: { prompt: string };
    };
    plan2DImageDataUrl: string;
    extractedPlanData: Record<string, unknown>;
    projectConsistencyLock: string | null;
    roomProgram: string[];
    maxRooms?: number;
  }): Promise<Render3DPackageResponse> {
    const body: Render3DPackageRequest = {
      totalPrompt: params.prompts.plan3DTotal.prompt,
      facadePrompt: params.prompts.facade3D.prompt,
      referencePlanImageDataUrl: params.plan2DImageDataUrl,
      referencePlanPrompt: params.prompts.plan2DRenderNanoBanana2.prompt,
      extractedPlanData: params.extractedPlanData,
      consistencyLock: params.projectConsistencyLock,
      roomProgram: params.roomProgram,
      roomPrompts: params.prompts.plan3DRooms,
      maxRooms: params.maxRooms,
    };

    const raw = await apiFetch<Render3DPackageRawResponse>("/plan/render-3d-package", {
      body,
      timeout: 300000,
    });

    // Normalize the object-based results into the array format the pipeline expects
    const results: Render3DPackageResponse["results"] = [];

    if (raw.results.total?.result) {
      results.push({ type: "total", title: "Volume total da casa", result: raw.results.total.result });
    }
    if (raw.results.facade?.result?.imageDataUrl) {
      results.push({ type: "facade", title: "Fachada principal", result: raw.results.facade.result });
    }
    for (const roomItem of raw.results.rooms ?? []) {
      if (roomItem.result) {
        results.push({ type: "room", title: roomItem.room, room: roomItem.room, result: roomItem.result });
      }
    }

    return { results };
  },

  /** Render or regenerate a single 3D item */
  async render3DItem(params: {
    label: string;
    prompt: string;
    referencePlanImageDataUrl?: string;
    referencePlanPrompt?: string;
    extractedPlanData?: Record<string, unknown>;
    consistencyLock?: string;
    roomProgram?: string[];
    additionalReferenceImageDataUrls?: string[];
  }): Promise<RenderResponse> {
    const body: Render3DItemRequest = {
      prompt: params.prompt,
      label: params.label,
      referencePlanImageDataUrl: params.referencePlanImageDataUrl,
      referencePlanPrompt: params.referencePlanPrompt,
      extractedPlanData: params.extractedPlanData,
      consistencyLock: params.consistencyLock,
      roomProgram: params.roomProgram,
      additionalReferenceImageDataUrls: params.additionalReferenceImageDataUrls,
    };
    const raw = await apiFetch<Render3DItemRawResponse>("/plan/render-3d-item", {
      body,
      timeout: 120000,
    });
    return raw.result;
  },

  /** Health check */
  async health(): Promise<{ ok: boolean; service: string }> {
    return apiFetch("/health", { method: "GET" });
  },
};
