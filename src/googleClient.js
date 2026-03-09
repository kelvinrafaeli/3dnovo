function parseRetryDelayToSeconds(retryDelay) {
  if (typeof retryDelay !== "string" || retryDelay.length === 0) {
    return null;
  }

  const secondsMatch = retryDelay.match(/(\d+(?:\.\d+)?)s/i);

  if (secondsMatch) {
    return Math.ceil(Number(secondsMatch[1]));
  }

  const numeric = Number(retryDelay);
  return Number.isFinite(numeric) ? Math.ceil(numeric) : null;
}

function extractCandidateOutput(data) {
  const firstCandidate = data.candidates?.[0];
  const parts = firstCandidate?.content?.parts || [];

  const imagePart = parts.find(
    (part) => part.inlineData && part.inlineData.mimeType?.startsWith("image/")
  );

  const text = parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return {
    text: text || null,
    imageDataUrl: imagePart
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : null
  };
}

function sanitizeJsonCandidate(candidate) {
  return String(candidate || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function extractJsonFromModelText(rawText) {
  const text = String(rawText || "").trim();

  if (!text) {
    return null;
  }

  const candidates = [text];

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    const sanitized = sanitizeJsonCandidate(candidate);

    try {
      return JSON.parse(sanitized);
    } catch (_error) {
      continue;
    }
  }

  return null;
}

function parseDataUrl(dataUrl) {
  const value = String(dataUrl || "").trim();

  if (!value.startsWith("data:")) {
    return null;
  }

  const match = value.match(/^data:([^;]+);base64,(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

function collectReferenceImages(options = {}) {
  const rawImages = [];

  if (options.referenceImageDataUrl) {
    rawImages.push(options.referenceImageDataUrl);
  }

  if (Array.isArray(options.referenceImageDataUrls)) {
    rawImages.push(...options.referenceImageDataUrls);
  }

  const dedup = new Set();
  const parsed = [];

  for (const rawImage of rawImages) {
    const normalized = String(rawImage || "").trim();

    if (!normalized || dedup.has(normalized)) {
      continue;
    }

    const parsedImage = parseDataUrl(normalized);
    if (!parsedImage) {
      continue;
    }

    dedup.add(normalized);
    parsed.push(parsedImage);
  }

  return parsed;
}

function createGoogleApiError(statusCode, rawBody) {
  let parsed;

  try {
    parsed = JSON.parse(rawBody);
  } catch (_error) {
    parsed = null;
  }

  const apiError = parsed?.error || {};
  const retryInfo = Array.isArray(apiError.details)
    ? apiError.details.find(
        (detail) => detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
      )
    : null;

  const retryAfterSeconds = parseRetryDelayToSeconds(retryInfo?.retryDelay);
  const message = apiError.message || `Erro na API Google (${statusCode}).`;

  const error = new Error(message);
  error.status = statusCode;
  error.apiStatus = apiError.status || null;
  error.retryAfterSeconds = retryAfterSeconds;
  error.quotaExceeded = statusCode === 429 || apiError.status === "RESOURCE_EXHAUSTED";
  error.raw = parsed || rawBody;

  return error;
}

async function callGenerateContent(model, apiKey, promptText, options = {}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const parts = [];
  const parsedReferenceImages = collectReferenceImages(options);

  for (const parsedReferenceImage of parsedReferenceImages) {
    parts.push({
      inlineData: {
        mimeType: parsedReferenceImage.mimeType,
        data: parsedReferenceImage.data
      }
    });
  }

  if (typeof options.referenceInstruction === "string" && options.referenceInstruction.trim()) {
    parts.push({ text: options.referenceInstruction.trim() });
  }

  parts.push({ text: promptText });

  const payload = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 4096,
      ...(options.generationConfig || {})
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw createGoogleApiError(response.status, errorBody);
  }

  return response.json();
}

async function renderWithNanoBanana2(promptText, options = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = process.env.NANO_BANANA_MODEL || "gemini-3.1-flash-image-preview";
  const fallbackModel = process.env.FALLBACK_MODEL || "gemini-2.5-flash-image";

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY nao configurada. Defina no arquivo .env");
  }

  let data;
  let usedModel = model;
  let usedFallback = false;
  const referenceImageCount = collectReferenceImages(options).length;
  const usedReferenceImage = referenceImageCount > 0;

  try {
    data = await callGenerateContent(model, apiKey, promptText, options);
  } catch (error) {
    const shouldRetryWithFallback =
      model !== fallbackModel && [400, 404, 429].includes(error.status);

    if (!shouldRetryWithFallback) {
      throw error;
    }

    data = await callGenerateContent(fallbackModel, apiKey, promptText, options);
    usedModel = fallbackModel;
    usedFallback = true;
  }

  const output = extractCandidateOutput(data);

  return {
    model: usedModel,
    usedFallback,
    usedReferenceImage,
    usedReferenceImageCount: referenceImageCount,
    text: output.text,
    imageDataUrl: output.imageDataUrl
  };
}

function buildPlanExtractionPrompt(roomProgram, plan2DPrompt, mode = "full") {
  const roomList = Array.isArray(roomProgram) && roomProgram.length > 0
    ? roomProgram.map((room) => `- ${room}`).join("\n")
    : "- Nao informado";

  if (mode === "compact") {
    return [
      "Analise a imagem da planta 2D anexada.",
      "Retorne SOMENTE JSON valido, sem markdown.",
      "Se algum dado nao estiver legivel, use null.",
      "Schema obrigatorio:",
      "{",
      '  "confidence": { "score_0_100": number|null, "notes": string|null },',
      '  "lot": { "front_m": number|null, "back_m": number|null, "left_m": number|null, "right_m": number|null },',
      '  "rooms": [{ "name": string, "dimensions": { "width_m": number|null, "depth_m": number|null, "area_m2": number|null }, "doors": [], "windows": [], "notes": string|null }],',
      '  "dimensions_and_quotas": string[],',
      '  "strict_constraints_for_3d": string[]',
      "}",
      "",
      "Programa de ambientes esperado:",
      roomList,
      "",
      plan2DPrompt ? `Prompt original da planta 2D:\n${plan2DPrompt}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Analise a imagem da planta 2D anexada e extraia todos os dados tecnicos possiveis com maxima fidelidade.",
    "Nao invente informacao nao visivel; quando nao for legivel, preencha null e descreva em observacoes.",
    "Retorne SOMENTE JSON valido, sem markdown.",
    "Schema JSON obrigatorio:",
    "{",
    '  "confidence": { "score_0_100": number, "notes": string },',
    '  "overall": { "style": string, "north_orientation": string|null, "total_area_m2": number|null },',
    '  "lot": { "front_m": number|null, "back_m": number|null, "left_m": number|null, "right_m": number|null },',
    '  "rooms": [',
    "    {",
    '      "name": string,',
    '      "dimensions": { "width_m": number|null, "depth_m": number|null, "area_m2": number|null },',
    '      "floor_level": string|null,',
    '      "adjacent_to": string[],',
    '      "doors": [{ "id": string, "width_m": number|null, "position": string|null, "opens_to": string|null }],',
    '      "windows": [{ "id": string, "width_m": number|null, "height_m": number|null, "position": string|null }],',
    '      "notes": string|null',
    "    }",
    "  ],",
    '  "openings_global": {',
    '    "doors_total": number|null,',
    '    "windows_total": number|null,',
    '    "rules": string[]',
    "  },",
    '  "wall_rules": { "thickness_cm": number[]|null, "load_bearing_notes": string|null },',
    '  "dimensions_and_quotas": string[],',
    '  "strict_constraints_for_3d": string[]',
    "}",
    "",
    "Programa de ambientes esperado:",
    roomList,
    "",
    plan2DPrompt ? `Prompt original da planta 2D:\n${plan2DPrompt}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function attemptExtractJsonWithModel({
  modelName,
  apiKey,
  prompt,
  referenceImageDataUrl
}) {
  const extractionData = await callGenerateContent(modelName, apiKey, prompt, {
    referenceImageDataUrl,
    referenceInstruction:
      "A imagem anexada e a planta 2D oficial. Extraia medidas, cotas, comodos, portas e janelas com fidelidade tecnica.",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });

  const output = extractCandidateOutput(extractionData);
  let extractedPlanData = extractJsonFromModelText(output.text);

  if (!extractedPlanData && output.text) {
    const repairPrompt = [
      "Converta o conteudo abaixo para JSON ESTRITAMENTE valido.",
      "Regras:",
      "- nao use markdown",
      "- nao adicione comentarios",
      "- preserve os campos e valores",
      "- retorne somente JSON",
      "",
      output.text
    ].join("\n");

    const repairData = await callGenerateContent(modelName, apiKey, repairPrompt, {
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    });
    const repairedOutput = extractCandidateOutput(repairData);
    extractedPlanData = extractJsonFromModelText(repairedOutput.text);
  }

  return {
    extractedPlanData,
    outputText: output.text
  };
}

function normalizeRooms(rawRooms, roomProgram) {
  const source = Array.isArray(rawRooms) ? rawRooms : [];
  const normalizedFromSource = source
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          dimensions: { width_m: null, depth_m: null, area_m2: null },
          floor_level: null,
          adjacent_to: [],
          doors: [],
          windows: [],
          notes: null
        };
      }

      if (item && typeof item === "object") {
        return {
          name: String(item.name || item.nome || "Comodo").trim(),
          dimensions: {
            width_m: item.dimensions?.width_m ?? item.dimensoes?.largura_m ?? null,
            depth_m: item.dimensions?.depth_m ?? item.dimensoes?.profundidade_m ?? null,
            area_m2: item.dimensions?.area_m2 ?? item.dimensoes?.area_m2 ?? null
          },
          floor_level: item.floor_level ?? item.piso ?? null,
          adjacent_to: Array.isArray(item.adjacent_to) ? item.adjacent_to : [],
          doors: Array.isArray(item.doors) ? item.doors : [],
          windows: Array.isArray(item.windows) ? item.windows : [],
          notes: item.notes ?? item.observacoes ?? null
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((room) => room.name);

  if (normalizedFromSource.length > 0) {
    return normalizedFromSource;
  }

  return (Array.isArray(roomProgram) ? roomProgram : []).map((roomName) => ({
    name: roomName,
    dimensions: { width_m: null, depth_m: null, area_m2: null },
    floor_level: null,
    adjacent_to: [],
    doors: [],
    windows: [],
    notes: "Comodo incluido por programa base quando a extracao nao retornou lista estruturada."
  }));
}

function normalizeExtractedPlanData(rawData, roomProgram) {
  const data = rawData && typeof rawData === "object" ? rawData : {};

  const strictConstraints = Array.isArray(data.strict_constraints_for_3d)
    ? data.strict_constraints_for_3d
    : [
        "Ser fiel e rigorosamente igual a planta 2D.",
        "Nao inventar portas e janelas.",
        "Nao alterar geometria principal sem evidencias na planta."
      ];

  const normalized = {
    confidence:
      data.confidence && typeof data.confidence === "object"
        ? {
            score_0_100: Number.isFinite(Number(data.confidence.score_0_100))
              ? Number(data.confidence.score_0_100)
              : null,
            notes: data.confidence.notes ?? null
          }
        : { score_0_100: null, notes: null },
    overall:
      data.overall && typeof data.overall === "object"
        ? {
            style: data.overall.style ?? null,
            north_orientation: data.overall.north_orientation ?? null,
            total_area_m2: Number.isFinite(Number(data.overall.total_area_m2))
              ? Number(data.overall.total_area_m2)
              : null
          }
        : { style: null, north_orientation: null, total_area_m2: null },
    lot:
      data.lot && typeof data.lot === "object"
        ? {
            front_m: data.lot.front_m ?? null,
            back_m: data.lot.back_m ?? null,
            left_m: data.lot.left_m ?? null,
            right_m: data.lot.right_m ?? null
          }
        : { front_m: null, back_m: null, left_m: null, right_m: null },
    rooms: normalizeRooms(data.rooms || data.comodos, roomProgram),
    openings_global:
      data.openings_global && typeof data.openings_global === "object"
        ? {
            doors_total: data.openings_global.doors_total ?? null,
            windows_total: data.openings_global.windows_total ?? null,
            rules: Array.isArray(data.openings_global.rules) ? data.openings_global.rules : []
          }
        : { doors_total: null, windows_total: null, rules: [] },
    wall_rules:
      data.wall_rules && typeof data.wall_rules === "object"
        ? {
            thickness_cm: Array.isArray(data.wall_rules.thickness_cm)
              ? data.wall_rules.thickness_cm
              : null,
            load_bearing_notes: data.wall_rules.load_bearing_notes ?? null
          }
        : { thickness_cm: null, load_bearing_notes: null },
    dimensions_and_quotas: Array.isArray(data.dimensions_and_quotas)
      ? data.dimensions_and_quotas
      : [],
    strict_constraints_for_3d: strictConstraints
  };

  return normalized;
}

async function extractPlanDataFrom2D(options = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = process.env.PLAN_EXTRACT_MODEL || "gemini-2.5-pro";
  const fallbackModel = process.env.PLAN_EXTRACT_FALLBACK_MODEL || "gemini-2.5-flash";
  const referenceImageDataUrl = String(options.referenceImageDataUrl || "").trim();
  const roomProgram = Array.isArray(options.roomProgram) ? options.roomProgram : [];
  const plan2DPrompt = String(options.plan2DPrompt || "").trim();

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY nao configurada. Defina no arquivo .env");
  }

  if (!parseDataUrl(referenceImageDataUrl)) {
    throw new Error("Imagem 2D de referencia invalida para extracao.");
  }

  const promptVariants = [
    buildPlanExtractionPrompt(roomProgram, plan2DPrompt, "full"),
    buildPlanExtractionPrompt(roomProgram, plan2DPrompt, "compact")
  ];
  const modelVariants = model === fallbackModel ? [model] : [model, fallbackModel];

  let lastPreview = "";
  let lastError = null;
  let extractedPlanData = null;
  let usedModel = model;
  let usedFallback = false;

  for (const modelName of modelVariants) {
    for (const prompt of promptVariants) {
      try {
        const attempt = await attemptExtractJsonWithModel({
          modelName,
          apiKey,
          prompt,
          referenceImageDataUrl
        });

        if (attempt.extractedPlanData) {
          extractedPlanData = attempt.extractedPlanData;
          usedModel = modelName;
          usedFallback = modelName !== model;
          break;
        }

        lastPreview = String(attempt.outputText || "")
          .replace(/\s+/g, " ")
          .slice(0, 260);
      } catch (error) {
        lastError = error;
      }
    }

    if (extractedPlanData) {
      break;
    }
  }

  if (!extractedPlanData) {
    if (lastError && !lastPreview) {
      throw lastError;
    }

    throw new Error(
      `Nao foi possivel converter a extracao da planta 2D para JSON estruturado.${lastPreview ? ` Preview: ${lastPreview}` : ""}`
    );
  }

  return {
    model: usedModel,
    usedFallback,
    extractedPlanData: normalizeExtractedPlanData(extractedPlanData, roomProgram),
    rawText: null
  };
}

module.exports = {
  renderWithNanoBanana2,
  extractPlanDataFrom2D
};
