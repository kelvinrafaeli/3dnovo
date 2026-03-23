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
  const finishReason = firstCandidate?.finishReason;

  if (finishReason && finishReason !== "STOP") {
    console.warn(`[extractCandidateOutput] finishReason: ${finishReason} (response may be truncated)`);
  }

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
  const expectImage = options.expectImage === true;
  const promptBeforeImage = options.promptBeforeImage === true;

  // Build the prompt text part
  let promptPart;
  if (expectImage) {
    const imageResolution = process.env.IMAGE_OUTPUT_RESOLUTION || "1024x1024";
    promptPart = {
      text: `[OUTPUT IMAGE REQUIREMENTS: Generate the image at ${imageResolution} resolution, highest quality, ultra detailed.]\n\n${promptText}`
    };
  } else {
    promptPart = { text: promptText };
  }

  // Build image parts
  const imageParts = parsedReferenceImages.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.data }
  }));

  // Build reference instruction part
  const instructionPart = (typeof options.referenceInstruction === "string" && options.referenceInstruction.trim())
    ? { text: options.referenceInstruction.trim() }
    : null;

  if (promptBeforeImage) {
    // Prompt FIRST → establishes the output style (3D keywords)
    // Then reference instruction explaining how to use the image
    // Image LAST → treated as secondary layout reference, not style guide
    parts.push(promptPart);
    if (instructionPart) parts.push(instructionPart);
    parts.push(...imageParts);
  } else {
    // Default order: Image first (strongest signal), instruction, then prompt
    parts.push(...imageParts);
    if (instructionPart) parts.push(instructionPart);
    parts.push(promptPart);
  }

  const baseGenerationConfig = expectImage
    ? {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 8192
      }
    : {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 4096
      };

  const payload = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      ...baseGenerationConfig,
      ...(options.generationConfig || {})
    }
  };

  const payloadJson = JSON.stringify(payload);
  const timeoutMs = options.timeoutMs || 90000;
  console.log(`[callGenerateContent] Model: ${model} | Payload size: ${(payloadJson.length / 1024).toFixed(1)}KB | Parts: ${parts.length} | Timeout: ${timeoutMs}ms`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: payloadJson,
      signal: controller.signal
    });
  } catch (fetchError) {
    clearTimeout(timer);
    if (fetchError.name === "AbortError") {
      console.error(`[callGenerateContent] TIMEOUT apos ${timeoutMs}ms para model ${model}`);
      const err = new Error(`Timeout: Gemini (${model}) nao respondeu em ${Math.round(timeoutMs / 1000)}s.`);
      err.status = 408;
      throw err;
    }
    console.error(`[callGenerateContent] Fetch error:`, fetchError.message);
    throw fetchError;
  }
  clearTimeout(timer);

  console.log(`[callGenerateContent] Response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[callGenerateContent] API Error: ${response.status}`, errorBody.slice(0, 500));
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
    data = await callGenerateContent(model, apiKey, promptText, {
      ...options,
      expectImage: true
    });
  } catch (error) {
    const shouldRetryWithFallback = model !== fallbackModel && [404, 429, 500, 503].includes(error.status);

    if (!shouldRetryWithFallback) {
      throw error;
    }

    data = await callGenerateContent(fallbackModel, apiKey, promptText, {
      ...options,
      expectImage: true
    });
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

  const userRequestedPrompt = [
    "Analyze this interior design image and convert all visual information into a highly detailed, structured JSON format.",
    "Focus specifically on isolating individual objects.",
    "For each key object, extract its precise color (using descriptive names or hex codes) and its exact material (e.g., matte leather, brushed steel, oak wood).",
    "Include JSON keys for 'room_style', 'overall_color_palette', and an 'objects' array containing 'name', 'color', 'material', and 'position_in_room'.",
    "Output ONLY valid JSON and format the output as a copyable JSON code block using Markdown."
  ].join(" ");

  const schemaLines = mode === "compact"
    ? [
        "Schema obrigatorio:",
        "{",
        '  "room_style": string|null,',
        '  "overall_color_palette": string[]|string|null,',
        '  "rooms_detected": string[],',
        '  "rooms": [{ "name": string, "dimensions": { "width_m": number|null, "depth_m": number|null, "area_m2": number|null }, "adjacent_to": string[], "position_description": string|null, "bbox_percent": { "x": number, "y": number, "w": number, "h": number } | null }],',
        '  "objects": [{ "name": string, "color": string|null, "material": string|null, "position_in_room": string|null, "room_name": string|null }],',
        '  "confidence": { "score_0_100": number|null, "notes": string|null }',
        "}"
      ]
    : [
        "Schema JSON obrigatorio:",
        "{",
        '  "room_style": string|null,',
        '  "overall_color_palette": string[]|string|null,',
        '  "rooms_detected": string[],',
        '  "rooms": [',
        "    {",
        '      "name": string,',
        '      "dimensions": { "width_m": number|null, "depth_m": number|null, "area_m2": number|null },',
        '      "adjacent_to": string[] (names of rooms sharing a wall or opening),',
        '      "position_description": string|null (e.g. "top-left corner", "center-right", "bottom of the plan next to garage"),',
        '      "bbox_percent": { "x": number, "y": number, "w": number, "h": number } | null',
        '      // bbox_percent = bounding box of this room in the image, as PERCENTAGE (0-100) of image width/height.',
        '      // x,y = top-left corner. w,h = width and height. Example: {"x": 10, "y": 5, "w": 30, "h": 40} means the room starts at 10% from left, 5% from top, spans 30% of width and 40% of height.',
        "    }",
        "  ],",
        '  "objects": [',
        "    {",
        '      "name": string,',
        '      "color": string|null,',
        '      "material": string|null,',
        '      "position_in_room": string|null,',
        '      "room_name": string|null',
        "    }",
        "  ],",
        '  "confidence": { "score_0_100": number|null, "notes": string|null },',
        '  "strict_constraints_for_3d": string[]',
        "}"
      ];

  return [
    userRequestedPrompt,
    "",
    "Regras adicionais obrigatorias:",
    "- Nao invente objetos, cores ou materiais que nao estejam visiveis na imagem.",
    "- Se um dado nao estiver legivel, use null.",
    "- Em objects[].room_name, prefira usar exatamente os nomes do programa de ambientes esperado quando houver correspondencia.",
    "- Em rooms_detected, retorne os comodos detectados na imagem usando nomes limpos e sem duplicidade.",
    "- IMPORTANTE: Para cada room em 'rooms', preencha 'adjacent_to' com os nomes dos comodos que compartilham parede ou abertura.",
    "- IMPORTANTE: Para cada room em 'rooms', preencha 'position_description' descrevendo a posicao do comodo na planta (ex: 'canto superior esquerdo', 'centro direita', 'fundo ao lado da garagem').",
    "- IMPORTANTE: Para cada room, preencha 'bbox_percent' com a bounding box do comodo na imagem em PORCENTAGEM (0-100). x,y = canto superior esquerdo. w,h = largura e altura. Exemplo: se o comodo ocupa o quadrante superior-esquerdo da imagem, bbox seria {\"x\": 5, \"y\": 5, \"w\": 45, \"h\": 45}. Estimar visualmente a partir da imagem.",
    "- Estime 'dimensions' (width_m, depth_m, area_m2) com base nas proporcoes visiveis na planta.",
    ...schemaLines,
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
    expectImage: false,
    referenceImageDataUrl,
    referenceInstruction: [
      "A imagem anexada e a planta 2D humanizada oficial do projeto.",
      "Extraia fielmente estilo do ambiente, paleta de cores, objetos, materiais e posicao de cada objeto no comodo.",
      "Nao invente objetos, cores ou materiais que nao estejam visiveis."
    ].join(" "),
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
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
      expectImage: false,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
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

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeTextList(values) {
  const output = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    const key = normalizeTextKey(normalized);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function findBestRoomNameMatch(rawValue, roomCandidates) {
  const candidates = dedupeTextList(roomCandidates);
  const source = String(rawValue || "").trim();

  if (!source || candidates.length === 0) {
    return null;
  }

  const sourceKey = normalizeTextKey(source);
  let bestRoom = null;
  let bestScore = 0;

  for (const roomName of candidates) {
    const roomKey = normalizeTextKey(roomName);

    if (!roomKey) {
      continue;
    }

    let score = 0;

    if (sourceKey === roomKey) {
      score = 100;
    } else if (sourceKey.includes(roomKey) || roomKey.includes(sourceKey)) {
      score = 80;
    } else {
      const sourceTokens = sourceKey.split(" ").filter(Boolean);
      const matchedTokens = sourceTokens.filter((token) => roomKey.includes(token)).length;
      score = matchedTokens * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRoom = roomName;
    }
  }

  return bestScore >= 20 ? bestRoom : null;
}

function normalizeColorPalette(rawValue) {
  if (Array.isArray(rawValue)) {
    return dedupeTextList(rawValue.map((item) => String(item || "").trim()).filter(Boolean));
  }

  if (typeof rawValue === "string") {
    return dedupeTextList(
      rawValue
        .split(/[\n,;|]/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return [];
}

function normalizeVisualObjects(rawObjects, roomCandidates) {
  const source = Array.isArray(rawObjects) ? rawObjects : [];

  return source
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const name = String(item.name || item.object || item.item || "").trim();

      if (!name) {
        return null;
      }

      const color = String(item.color || item.colour || "").trim() || null;
      const material = String(item.material || item.finish || item.texture || "").trim() || null;
      const positionInRoom = String(
        item.position_in_room || item.position || item.location || ""
      ).trim() || null;
      const explicitRoom = String(item.room_name || item.room || item.environment || "").trim();
      const roomName =
        findBestRoomNameMatch(explicitRoom, roomCandidates) ||
        findBestRoomNameMatch(positionInRoom, roomCandidates) ||
        null;

      return {
        name: name || `objeto_${index + 1}`,
        color,
        material,
        position_in_room: positionInRoom,
        room_name: roomName
      };
    })
    .filter(Boolean);
}

function collectDetectedRooms(rawData, normalizedObjects, roomProgram) {
  const data = rawData && typeof rawData === "object" ? rawData : {};
  const fromSchema = Array.isArray(data.rooms_detected) ? data.rooms_detected : [];
  const fromObjects = normalizedObjects
    .map((item) => String(item?.room_name || "").trim())
    .filter(Boolean);

  return dedupeTextList([
    ...fromSchema,
    ...fromObjects,
    ...(Array.isArray(roomProgram) ? roomProgram : [])
  ]);
}

function mergeRoomsWithDetectedRooms(normalizedRooms, detectedRooms) {
  const rooms = Array.isArray(normalizedRooms) ? [...normalizedRooms] : [];
  const detected = dedupeTextList(detectedRooms);
  const existingKeys = new Set(rooms.map((room) => normalizeTextKey(room?.name || "")).filter(Boolean));

  for (const roomName of detected) {
    const roomKey = normalizeTextKey(roomName);

    if (!roomKey || existingKeys.has(roomKey)) {
      continue;
    }

    existingKeys.add(roomKey);
    rooms.push({
      name: roomName,
      dimensions: { width_m: null, depth_m: null, area_m2: null },
      floor_level: null,
      adjacent_to: [],
      doors: [],
      windows: [],
      notes: "Comodo incluido por consistencia do programa base quando nao retornado na lista estruturada da extracao."
    });
  }

  return rooms;
}

function normalizeRooms(rawRooms, roomProgram, detectedRooms = []) {
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
          position_description: item.position_description ?? null,
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

  const fallbackRoomNames = dedupeTextList(
    Array.isArray(detectedRooms) && detectedRooms.length > 0 ? detectedRooms : roomProgram
  );

  return fallbackRoomNames.map((roomName) => ({
    name: roomName,
    dimensions: { width_m: null, depth_m: null, area_m2: null },
    floor_level: null,
    adjacent_to: [],
    doors: [],
    windows: [],
    notes: "Comodo incluido por programa base quando a extracao nao retornou lista estruturada."
  }));
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function calculateLotAreaFromDimensions(lot, fallbackArea) {
  const front = toNullableNumber(lot?.front_m);
  const back = toNullableNumber(lot?.back_m);
  const right = toNullableNumber(lot?.right_m);
  const left = toNullableNumber(lot?.left_m);

  const directWidth = front ?? back;
  const directDepth = right ?? left;

  if (directWidth !== null && directDepth !== null) {
    return Number((directWidth * directDepth).toFixed(2));
  }

  const avgWidth = front !== null && back !== null ? (front + back) / 2 : null;
  const avgDepth = right !== null && left !== null ? (right + left) / 2 : null;

  if (avgWidth !== null && avgDepth !== null) {
    return Number((avgWidth * avgDepth).toFixed(2));
  }

  return toNullableNumber(fallbackArea);
}

function normalizeExtractedPlanData(rawData, roomProgram) {
  const data = rawData && typeof rawData === "object" ? rawData : {};
  const roomProgramList = Array.isArray(roomProgram) ? roomProgram : [];
  const roomCandidates = dedupeTextList([
    ...roomProgramList,
    ...(Array.isArray(data.rooms_detected) ? data.rooms_detected : []),
    ...(Array.isArray(data.rooms)
      ? data.rooms.map((room) => (typeof room === "string" ? room : room?.name))
      : [])
  ]);
  const normalizedObjects = normalizeVisualObjects(data.objects, roomCandidates);
  const detectedRooms = collectDetectedRooms(data, normalizedObjects, roomProgramList);
  const normalizedRoomStyle = String(
    data.room_style ?? data.overall?.style ?? data.style ?? ""
  ).trim() || null;
  const normalizedColorPalette = normalizeColorPalette(data.overall_color_palette);

  const strictConstraints = Array.isArray(data.strict_constraints_for_3d)
    ? data.strict_constraints_for_3d
    : [
        "Ser fiel e rigorosamente igual a planta 2D.",
        "Nao inventar portas e janelas.",
        "Nao alterar geometria principal sem evidencias na planta.",
        "Calcular a area total do lote por largura x profundidade, sem inventar m2.",
        "Usar apenas objetos, cores e materiais presentes no JSON extraido da imagem 2D."
      ];

  const normalizedLot =
    data.lot && typeof data.lot === "object"
      ? {
          front_m: data.lot.front_m ?? null,
          back_m: data.lot.back_m ?? null,
          left_m: data.lot.left_m ?? null,
          right_m: data.lot.right_m ?? null
        }
      : { front_m: null, back_m: null, left_m: null, right_m: null };

  const normalizedTotalArea = calculateLotAreaFromDimensions(
    normalizedLot,
    data?.overall?.total_area_m2 ?? null
  );
  const normalizedRooms = normalizeRooms(data.rooms || data.comodos, roomProgramList, detectedRooms);
  const mergedRooms = mergeRoomsWithDetectedRooms(normalizedRooms, detectedRooms);

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
    room_style: normalizedRoomStyle,
    overall_color_palette: normalizedColorPalette,
    rooms_detected: detectedRooms,
    objects: normalizedObjects,
    overall:
      data.overall && typeof data.overall === "object"
        ? {
            style: data.overall.style ?? normalizedRoomStyle,
            north_orientation: data.overall.north_orientation ?? null,
            total_area_m2: normalizedTotalArea
          }
        : {
            style: normalizedRoomStyle,
            north_orientation: null,
            total_area_m2: normalizedTotalArea
          },
    lot: normalizedLot,
    rooms: mergedRooms,
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

  console.log("[extractPlanDataFrom2D] Iniciando extracao");
  console.log("[extractPlanDataFrom2D] Model:", model, "| Fallback:", fallbackModel);
  console.log("[extractPlanDataFrom2D] Image URL length:", referenceImageDataUrl.length);
  console.log("[extractPlanDataFrom2D] Room program:", roomProgram);
  console.log("[extractPlanDataFrom2D] API key present:", !!apiKey);

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY nao configurada. Defina no arquivo .env");
  }

  const parsedImage = parseDataUrl(referenceImageDataUrl);
  console.log("[extractPlanDataFrom2D] Parsed image:", parsedImage ? `${parsedImage.mimeType} (${parsedImage.data.length} chars)` : "FALHOU");

  if (!parsedImage) {
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
