import type { ConsistencyLock } from "@/context/ProjectContext";

/**
 * FNV-1a hash to create a unique visual project signature.
 * Mirrors the pattern from the backend's app.js computeVisualProjectSignature.
 */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return "PROJ-" + hash.toString(16).padStart(8, "0").toUpperCase();
}

export function buildConsistencyLock(
  extractedPlanData: Record<string, unknown> | null,
  plan2DImageDataUrl: string,
  architecturalStyle?: string
): ConsistencyLock {
  const payload = JSON.stringify({
    extractedPlanData,
    style: architecturalStyle || "default",
    timestamp: Date.now(),
  });

  return {
    visualSignature: fnv1a(payload),
    extractedPlanData,
    referencePlanImageDataUrl: plan2DImageDataUrl,
  };
}
