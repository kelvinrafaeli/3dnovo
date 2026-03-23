require("dotenv").config();

const express = require("express");
const path = require("path");

const { createGenerationPackage } = require("./planEngine");
const { renderWithNanoBanana2, extractPlanDataFrom2D } = require("./googleClient");
const { createLocalBlueprintFallback } = require("./localRenderFallback");
const { createLocal3DFallback } = require("./local3dFallback");

const app = express();
const port = Number(process.env.PORT || 3000);

function parseSizeToBytes(rawSize) {
  const match = String(rawSize || "")
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);

  if (!match) {
    return null;
  }

  const numeric = Number(match[1]);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const unit = (match[2] || "b").toLowerCase();
  const factorByUnit = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const factor = factorByUnit[unit];
  if (!factor) {
    return null;
  }

  return Math.floor(numeric * factor);
}

function resolveJsonBodyLimit(rawLimit) {
  const minimumBytes = 40 * 1024 * 1024;
  const defaultLimit = "60mb";

  if (!rawLimit) {
    return defaultLimit;
  }

  const parsed = parseSizeToBytes(rawLimit);

  if (!parsed) {
    return defaultLimit;
  }

  if (parsed < minimumBytes) {
    return "40mb";
  }

  return String(rawLimit);
}

const jsonBodyLimit = resolveJsonBodyLimit(process.env.JSON_BODY_LIMIT);

const strict3DRules = [
  "LAYOUT FIDELITY: Match wall positions, door locations, and window placements exactly as shown in the reference floor plan.",
  "Do NOT add, move, or remove walls from the reference layout.",
  "Do NOT invent rooms, doors, or windows not present in the reference.",
  "Use ONLY the objects, colors, and materials listed in the extracted JSON data.",
  "CLEAN IMAGE: No text labels, no dimensions, no side panels, no tables, no stamps, no watermarks, no metadata blocks.",
  "OUTPUT FORMAT: The final image must be a 3D VISUALIZATION ONLY. Never show 2D floor plans, blueprints, or technical overlays.",
  "Maintain the roofing style, external volumetry, and outdoor area logic from the base project."
];

app.use(express.json({ limit: jsonBodyLimit }));

// CORS — allow Next.js dev server to call backend directly
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "..", "public-legacy")));

// Log all incoming API requests
app.use("/api", (req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path} | Body size: ${JSON.stringify(req.body || {}).length} bytes`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "3dnovo-plan-service" });
});

// --- Style example image for 3D isometric renders ---
const DEFAULT_3D_STYLE_EXAMPLE_URL = "https://i.pinimg.com/736x/01/c2/ac/01c2acab791234904578e0af7bfb5a01.jpg";
const imageCache = new Map();

async function fetchImageAsDataUrl(url) {
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
  imageCache.set(url, dataUrl);
  console.log(`[fetchImageAsDataUrl] Cached image from ${url} (${(buffer.length / 1024).toFixed(0)}KB)`);
  return dataUrl;
}

app.post("/api/plan/generate", (req, res) => {
  try {
    const generationPackage = createGenerationPackage(req.body);
    res.json(generationPackage);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados invalidos no formulario.",
        details: error.issues
      });
    }

    res.status(500).json({ error: error.message || "Falha ao gerar plano." });
  }
});

app.post("/api/plan/render-2d", async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({ error: "Prompt 2D obrigatorio." });
    }

    const renderResult = await renderWithNanoBanana2(prompt);

    res.json({
      ok: true,
      result: renderResult
    });
  } catch (error) {
    const localFallbackEnabled = process.env.LOCAL_RENDER_FALLBACK !== "false";

    if (localFallbackEnabled && error.quotaExceeded) {
      return res.json({
        ok: true,
        result: createLocalBlueprintFallback(
          String(req.body.prompt || ""),
          error.retryAfterSeconds
        )
      });
    }

    const upstreamMessage = error?.message || "Falha ao renderizar 2D.";
    const statusCode = Number.isInteger(error?.status) ? 502 : 500;

    res.status(statusCode).json({
      error: upstreamMessage
    });
  }
});

async function renderPromptWithFallback(prompt, label, options = {}) {
  const mergedOptions = {
    ...options,
    generationConfig: {
      temperature: 0.15,
      topP: 0.8,
      maxOutputTokens: 4096,
      ...(options.generationConfig || {})
    }
  };

  try {
    const result = await renderWithNanoBanana2(prompt, mergedOptions);
    return { ok: true, result };
  } catch (error) {
    const localFallbackEnabled = process.env.LOCAL_RENDER_FALLBACK !== "false";

    if (localFallbackEnabled && error.quotaExceeded) {
      return {
        ok: true,
        result: createLocal3DFallback(label, prompt, error.retryAfterSeconds)
      };
    }

    return {
      ok: false,
      error: error?.message || `Falha ao renderizar ${label}.`
    };
  }
}

function parseExtractedPlanData(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (_error) {
      return null;
    }
  }

  return null;
}

function parseConsistencyLock(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (_error) {
      return null;
    }
  }

  return null;
}

function parseImageList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function parseRenderKind(rawKind, label) {
  const kind = String(rawKind || "").trim().toLowerCase();

  if (["total-exterior", "facade-exterior", "room-interior", "generic"].includes(kind)) {
    return kind;
  }

  const labelText = String(label || "").toLowerCase();

  if (labelText.startsWith("comodo ")) {
    return "room-interior";
  }

  if (labelText.includes("fachada")) {
    return "facade-exterior";
  }

  if (labelText.includes("volume total") || labelText.includes("casa")) {
    return "total-exterior";
  }

  return "generic";
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

function extractRoomNamesFromData(extractedPlanData) {
  const rooms = Array.isArray(extractedPlanData?.rooms) ? extractedPlanData.rooms : [];
  const roomsDetected = Array.isArray(extractedPlanData?.rooms_detected)
    ? extractedPlanData.rooms_detected
    : [];
  const objectRooms = Array.isArray(extractedPlanData?.objects)
    ? extractedPlanData.objects
        .map((item) => String(item?.room_name || "").trim())
        .filter(Boolean)
    : [];

  return dedupeTextList([
    ...rooms.map((room) => String(room?.name || "").trim()),
    ...roomsDetected,
    ...objectRooms
  ]);
}

function findBestRoomNameMatch(rawValue, roomNames) {
  const candidates = dedupeTextList(roomNames);
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

function normalizeVisualObjectsForPrompt(extractedPlanData) {
  const objects = Array.isArray(extractedPlanData?.objects) ? extractedPlanData.objects : [];

  return objects
    .map((item) => ({
      name: String(item?.name || "").trim(),
      color: String(item?.color || "").trim() || null,
      material: String(item?.material || "").trim() || null,
      position_in_room: String(item?.position_in_room || "").trim() || null,
      room_name: String(item?.room_name || "").trim() || null
    }))
    .filter((item) => item.name);
}

function buildVisualSummaryBlock(extractedPlanData) {
  const roomStyle = String(
    extractedPlanData?.room_style || extractedPlanData?.overall?.style || ""
  ).trim() || "null";
  const colorPalette = Array.isArray(extractedPlanData?.overall_color_palette)
    ? extractedPlanData.overall_color_palette.map((item) => String(item || "").trim()).filter(Boolean)
    : typeof extractedPlanData?.overall_color_palette === "string"
      ? extractedPlanData.overall_color_palette
          .split(/[\n,;|]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const roomNames = extractRoomNamesFromData(extractedPlanData);

  return [
    `- room_style: ${roomStyle}`,
    `- overall_color_palette: ${colorPalette.length ? colorPalette.join(", ") : "[]"}`,
    `- rooms_detected: ${roomNames.length ? roomNames.join(", ") : "[]"}`
  ].join("\n");
}

function buildVisualObjectsBlock(extractedPlanData, label, renderKind) {
  const objects = normalizeVisualObjectsForPrompt(extractedPlanData);

  if (objects.length === 0) {
    return "Nenhum objeto visual foi extraido; manter cena minima e neutra, sem inventar decoracao.";
  }

  const extractedRooms = extractRoomNamesFromData(extractedPlanData);
  const roomData = findTargetRoomFromExtraction(extractedPlanData?.rooms, label);
  const cleanedLabel = String(label || "")
    .replace(/^comodo\s+/i, "")
    .trim();
  const targetRoom =
    roomData?.name || findBestRoomNameMatch(cleanedLabel, extractedRooms) || cleanedLabel || null;
  const targetRoomKey = normalizeTextKey(targetRoom);

  const filteredObjects = objects.filter((item) => {
    if (renderKind !== "room-interior" || !targetRoomKey) {
      return true;
    }

    const objectRoomKey = normalizeTextKey(item.room_name || "");
    const positionKey = normalizeTextKey(item.position_in_room || "");

    if (
      objectRoomKey &&
      (objectRoomKey.includes(targetRoomKey) || targetRoomKey.includes(objectRoomKey))
    ) {
      return true;
    }

    return positionKey.includes(targetRoomKey);
  });

  const selected = (filteredObjects.length > 0 ? filteredObjects : objects)
    .slice(0, renderKind === "room-interior" ? 24 : 60);

  return selected
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} | cor: ${item.color || "null"} | material: ${item.material || "null"} | posicao: ${item.position_in_room || "null"}${
          item.room_name ? ` | comodo: ${item.room_name}` : ""
        }`
    )
    .join("\n");
}

function buildAutoRoomPrompt(roomName) {
  return [
    `Crie um render 3D INTERNO detalhado do ambiente: ${roomName}.`,
    "Use estritamente o JSON extraido da imagem 2D para objetos, cores, materiais e posicionamento.",
    "Nao inventar decoracao, materiais ou cores fora do JSON extraido.",
    "Nao gerar vista externa nem fachada nesse render de comodo."
  ].join("\n");
}

function resolveRoomPrompts(roomPrompts, extractedPlanData, roomProgram = []) {
  const parsedInput = Array.isArray(roomPrompts)
    ? roomPrompts
        .map((item, index) => ({
          room: String(item?.room || `Comodo ${index + 1}`).trim(),
          prompt: String(item?.prompt || "").trim()
        }))
        .filter((item) => item.room)
    : [];
  const extractedRoomNames = extractRoomNamesFromData(extractedPlanData);
  const roomProgramNames = dedupeTextList(roomProgram);
  const inputRoomNames = dedupeTextList(parsedInput.map((item) => item.room));

  const mergedRoomNames = dedupeTextList([
    ...extractedRoomNames,
    ...roomProgramNames,
    ...inputRoomNames
  ]);

  if (mergedRoomNames.length === 0) {
    return parsedInput;
  }

  const promptByRoomKey = new Map();

  for (const item of parsedInput) {
    const roomKey = normalizeTextKey(item.room);
    if (!roomKey) {
      continue;
    }

    promptByRoomKey.set(roomKey, item.prompt);
  }

  return mergedRoomNames.map((roomName) => {
    const roomKey = normalizeTextKey(roomName);
    const mappedPrompt = roomKey ? promptByRoomKey.get(roomKey) : "";

    return {
      room: roomName,
      prompt: mappedPrompt || buildAutoRoomPrompt(roomName)
    };
  });
}

function findTargetRoomFromExtraction(rooms, label) {
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return null;
  }

  const cleanedLabel = String(label || "")
    .replace(/^comodo\s+/i, "")
    .trim();
  const targetKey = normalizeTextKey(cleanedLabel);

  if (!targetKey) {
    return null;
  }

  let bestRoom = null;
  let bestScore = 0;

  for (const room of rooms) {
    const roomName = String(room?.name || "").trim();
    if (!roomName) {
      continue;
    }

    const roomKey = normalizeTextKey(roomName);
    let score = 0;

    if (roomKey === targetKey) {
      score = 100;
    } else if (roomKey.includes(targetKey) || targetKey.includes(roomKey)) {
      score = 80;
    } else {
      const targetTokens = targetKey.split(" ").filter(Boolean);
      const matchedTokens = targetTokens.filter((token) => roomKey.includes(token)).length;
      score = matchedTokens * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRoom = room;
    }
  }

  return bestScore >= 20 ? bestRoom : null;
}

function buildRoomMetricsBlock(roomData) {
  if (!roomData) {
    return [
      "Dados do comodo alvo nao encontrados explicitamente na extracao; respeite os limites do programa e da planta 2D."
    ].join("\n");
  }

  const dimensions = roomData.dimensions || {};
  const doors = Array.isArray(roomData.doors) ? roomData.doors : [];
  const windows = Array.isArray(roomData.windows) ? roomData.windows : [];

  return [
    `Comodo alvo identificado: ${roomData.name || "N/A"}`,
    `- Largura (m): ${dimensions.width_m ?? "null"}`,
    `- Profundidade (m): ${dimensions.depth_m ?? "null"}`,
    `- Area (m2): ${dimensions.area_m2 ?? "null"}`,
    `- Quantidade de portas: ${doors.length}`,
    `- Quantidade de janelas: ${windows.length}`,
    doors.length > 0 ? `- Portas: ${JSON.stringify(doors)}` : "",
    windows.length > 0 ? `- Janelas: ${JSON.stringify(windows)}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function findRoomsByCandidateNames(rooms, names) {
  const sourceRooms = Array.isArray(rooms) ? rooms : [];
  const sourceNames = Array.isArray(names) ? names : [];
  const foundRooms = [];
  const seen = new Set();

  for (const name of sourceNames) {
    const room = findTargetRoomFromExtraction(sourceRooms, name);

    if (!room) {
      continue;
    }

    const key = normalizeTextKey(room.name || "");

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    foundRooms.push(room);
  }

  return foundRooms;
}

function buildAdjacentRoomsBlock(roomData, allRooms) {
  if (!roomData) {
    return "Ambientes adjacentes nao identificados na extracao.";
  }

  const adjacentNames = Array.isArray(roomData.adjacent_to) ? roomData.adjacent_to : [];
  const adjacentRooms = findRoomsByCandidateNames(allRooms, adjacentNames);

  if (adjacentRooms.length === 0) {
    return "Ambientes adjacentes nao identificados na extracao.";
  }

  return adjacentRooms
    .map((room, index) => {
      const dimensions = room.dimensions || {};
      const doors = Array.isArray(room.doors) ? room.doors : [];
      const windows = Array.isArray(room.windows) ? room.windows : [];

      return [
        `${index + 1}. ${room.name || "Comodo"}`,
        `   - Largura (m): ${dimensions.width_m ?? "null"}`,
        `   - Profundidade (m): ${dimensions.depth_m ?? "null"}`,
        `   - Area (m2): ${dimensions.area_m2 ?? "null"}`,
        `   - Portas: ${doors.length}`,
        `   - Janelas: ${windows.length}`
      ].join("\n");
    })
    .join("\n");
}

function buildIntegratedRoomConsistencyBlock(roomData, allRooms) {
  if (!roomData) {
    return [
      "REGRA DE CONTINUIDADE PARA AMBIENTE INTEGRADO (OBRIGATORIA):",
      "- Se houver ambiente adjacente visivel, manter geometria, aberturas e materiais coerentes com os outros renders.",
      "- O ambiente que nao e foco pode aparecer apenas como fundo desfocado e com baixa nitidez.",
      "- Evitar detalhar ou inventar mobiliario/decoracao no ambiente nao foco.",
      "- Se houver conflito visual, priorizar enquadramento que esconda parcialmente o ambiente nao foco."
    ].join("\n");
  }

  const adjacentNames = findRoomsByCandidateNames(
    allRooms,
    Array.isArray(roomData.adjacent_to) ? roomData.adjacent_to : []
  )
    .map((room) => String(room?.name || "").trim())
    .filter(Boolean)
    .slice(0, 4);

  const adjacentList = adjacentNames.length
    ? adjacentNames.join(", ")
    : "ambientes adjacentes";

  return [
    "REGRA DE CONTINUIDADE PARA AMBIENTE INTEGRADO (OBRIGATORIA):",
    `- Para conexoes abertas com ${adjacentList}, manter a MESMA geometria, a MESMA posicao de aberturas e os MESMOS materiais base em todos os renders.`,
    "- O ambiente que nao e foco deve ficar em segundo plano: desfocado, com baixa nitidez e sem detalhes finos.",
    "- Nao inventar layout novo no ambiente nao foco; se ele aparecer, manter apenas volume neutro coerente.",
    "- Se houver divergencia entre mostrar ou ocultar o fundo, priorizar ocultar/reduzir o fundo do ambiente nao foco."
  ].join("\n");
}

function buildRenderKindRules(renderKind) {
  if (renderKind === "total-exterior") {
    return [
      "RENDER TYPE: 3D ISOMETRIC CUTAWAY — ARCHITECTURAL SCALE MODEL (MAQUETE) WITH ROOF REMOVED.",
      "Camera at 30-45 degree angle from above — NEVER directly overhead / top-down.",
      "This MUST look like a PHYSICAL 3D ARCHITECTURAL MODEL photographed at an angle.",
      "All walls MUST have visible HEIGHT (2.8-3m) with THICKNESS and material texture.",
      "All furniture MUST be 3D objects with VOLUME and DEPTH — NOT flat 2D icons.",
      "Floor surfaces must show PERSPECTIVE DISTORTION proving this is a 3D view.",
      "NEVER generate a flat/2D floor plan. NEVER use flat colored shapes for furniture.",
      "Roof and ceiling COMPLETELY REMOVED — all rooms visible from above.",
      "Include exterior landscape (grass, trees, driveway) in 3D around the building.",
      "Side lighting with shadows cast by walls and furniture to reinforce 3D depth."
    ];
  }

  if (renderKind === "facade-exterior") {
    return [
      "RENDER TYPE: EXTERIOR FACADE — 3D FRONT VIEW OF THE BUILDING.",
      "Maintain the SAME roofing, volumetry, and visual language as the total exterior anchor render.",
      "Do NOT alter roof typology or external proportions from the base project."
    ];
  }

  if (renderKind === "room-interior") {
    return [
      "RENDER TYPE: 3D INTERIOR PHOTOGRAPH — CAMERA INSIDE THE ROOM.",
      "Camera MUST be positioned INSIDE the room at human eye level (1.5-1.7m height).",
      "Show the room as a real interior photo: walls with height, ceiling visible, floor in perspective.",
      "NEVER show a top-down view, floor plan, or bird's eye perspective.",
      "Respect exact room dimensions, door/window positions from the reference layout.",
      "If reference images are attached, maintain exact door/window positions and connections to adjacent rooms.",
      "For open-concept spaces, adjacent rooms should appear blurred/neutral to avoid inconsistency."
    ];
  }

  return [
    "RENDER TYPE: CONTROLLED 3D VISUALIZATION.",
    "Maintain full fidelity to extracted layout data and consistency lock."
  ];
}

function buildGenerationConfigByRenderKind(renderKind) {
  if (renderKind === "room-interior") {
    return {
      temperature: 0.05,
      topP: 0.35,
      maxOutputTokens: 4096
    };
  }

  if (renderKind === "facade-exterior") {
    return {
      temperature: 0.1,
      topP: 0.5,
      maxOutputTokens: 4096
    };
  }

  if (renderKind === "total-exterior") {
    return {
      temperature: 0.05,
      topP: 0.4,
      maxOutputTokens: 4096
    };
  }

  return {
    temperature: 0.15,
    topP: 0.8,
    maxOutputTokens: 4096
  };
}

function build3DPromptFromExtraction({
  prompt,
  label,
  referencePlanPrompt,
  roomProgramText,
  extractedPlanData,
  consistencyLock,
  renderKind
}) {
  const extractedJson = JSON.stringify(extractedPlanData, null, 2);
  const consistencyLockJson = consistencyLock
    ? JSON.stringify(consistencyLock, null, 2)
    : null;
  const visualSignature = consistencyLock?.visualSignature || null;
  const extractedStrictConstraints = Array.isArray(extractedPlanData?.strict_constraints_for_3d)
    ? extractedPlanData.strict_constraints_for_3d.map((item) => `- ${item}`).join("\n")
    : "- Nao informado";
  const roomData = findTargetRoomFromExtraction(extractedPlanData?.rooms, label);
  const roomMetricsBlock = buildRoomMetricsBlock(roomData);
  const adjacentRoomsBlock = buildAdjacentRoomsBlock(roomData, extractedPlanData?.rooms);
  const integratedRoomConsistencyBlock = buildIntegratedRoomConsistencyBlock(
    roomData,
    extractedPlanData?.rooms
  );
  const renderKindRules = buildRenderKindRules(renderKind);
  const includeRoomMetrics = renderKind === "room-interior";
  const visualSummaryBlock = buildVisualSummaryBlock(extractedPlanData);
  const visualObjectsBlock = buildVisualObjectsBlock(extractedPlanData, label, renderKind);

  return [
    // ===== 1. TASK DIRECTIVE (FIRST — strongest signal) =====
    "=== 3D RENDER TASK ===",
    prompt,
    "",
    // ===== 2. OUTPUT FORMAT RULES =====
    ...renderKindRules,
    "",
    // ===== 3. ANTI-2D GUARD (always present) =====
    "CRITICAL OUTPUT RULE: The output MUST be a 3D rendered image with depth, perspective and volume.",
    "NEVER output a flat 2D floor plan, blueprint, or top-down orthographic view.",
    "All furniture must be 3D objects with volume — NOT flat 2D symbols or icons.",
    "",
    // ===== 4. LAYOUT FIDELITY RULES =====
    ...strict3DRules,
    "",
    // ===== 5. REFERENCE DATA (context for accuracy) =====
    `Target environment: ${label}`,
    visualSignature ? `Visual signature: ${visualSignature}` : "",
    "",
    "REFERENCE DATA (extracted from the floor plan — use for layout accuracy only, NOT as output style):",
    visualSummaryBlock,
    "",
    "Objects to include (from extraction):",
    visualObjectsBlock,
    "Anti-hallucination: use ONLY objects, colors and materials from the extracted data. If data is missing, keep neutral visuals.",
    "",
    // ===== 6. ROOM-SPECIFIC DATA (interior renders only) =====
    includeRoomMetrics ? "ROOM CONSISTENCY CONTRACT:" : "",
    includeRoomMetrics ? "Door/window count and positions must remain identical across all related renders." : "",
    includeRoomMetrics ? "Room dimensions and metrics:" : "",
    includeRoomMetrics ? roomMetricsBlock : "",
    includeRoomMetrics ? "" : "",
    includeRoomMetrics ? "Adjacent rooms (for background/transition coherence):" : "",
    includeRoomMetrics ? adjacentRoomsBlock : "",
    includeRoomMetrics ? "" : "",
    includeRoomMetrics ? integratedRoomConsistencyBlock : "",
    "",
    // ===== 7. STRUCTURAL DATA (JSON — compact) =====
    "Extracted layout constraints:",
    extractedStrictConstraints,
    "",
    consistencyLockJson ? "Consistency lock:" : "",
    consistencyLockJson || "",
    "",
    "Room program:",
    roomProgramText,
    "",
    "Structural JSON data (for reference only — do NOT let this influence output format):",
    extractedJson
  ]
    .filter(Boolean)
    .join("\n");
}

app.post("/api/plan/extract-2d-data", async (req, res) => {
  console.log("[extract-2d-data] Request recebido");
  console.log("[extract-2d-data] Body keys:", Object.keys(req.body || {}));
  console.log("[extract-2d-data] referencePlanImageDataUrl presente:", !!req.body.referencePlanImageDataUrl);
  console.log("[extract-2d-data] referencePlanImageDataUrl tamanho:", String(req.body.referencePlanImageDataUrl || "").length);
  console.log("[extract-2d-data] plan2DPrompt tamanho:", String(req.body.plan2DPrompt || "").length);
  console.log("[extract-2d-data] roomProgram:", req.body.roomProgram);

  try {
    const referencePlanImageDataUrl = String(req.body.referencePlanImageDataUrl || "").trim();
    const plan2DPrompt = String(req.body.plan2DPrompt || "").trim();
    const roomProgram = Array.isArray(req.body.roomProgram)
      ? req.body.roomProgram.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!referencePlanImageDataUrl) {
      console.log("[extract-2d-data] ERRO: imagem vazia");
      return res.status(400).json({
        error: "Imagem da planta 2D obrigatoria para extracao de dados."
      });
    }

    console.log("[extract-2d-data] Chamando extractPlanDataFrom2D...");
    const extraction = await extractPlanDataFrom2D({
      referenceImageDataUrl: referencePlanImageDataUrl,
      roomProgram,
      plan2DPrompt
    });

    console.log("[extract-2d-data] Extracao concluida com sucesso. Model:", extraction.model);
    return res.json({
      ok: true,
      extraction
    });
  } catch (error) {
    console.error("[extract-2d-data] ERRO na extracao:", error?.message || error);
    console.error("[extract-2d-data] Stack:", error?.stack);
    console.error("[extract-2d-data] Status:", error?.status, "| quotaExceeded:", error?.quotaExceeded);
    const statusCode = Number.isInteger(error?.status) ? 502 : 500;
    return res.status(statusCode).json({
      error: error.message || "Falha ao extrair dados da planta 2D."
    });
  }
});

app.post("/api/plan/render-3d-package", async (req, res) => {
  console.log("[render-3d-package] Request recebido");
  try {
  const totalPrompt = String(req.body.totalPrompt || "").trim();
  const facadePrompt = String(req.body.facadePrompt || "").trim();
  const referencePlanImageDataUrl = String(req.body.referencePlanImageDataUrl || "").trim();
  const referencePlanPrompt = String(req.body.referencePlanPrompt || "").trim();
  const extractedPlanData = parseExtractedPlanData(req.body.extractedPlanData);
  const consistencyLock = parseConsistencyLock(req.body.consistencyLock);
  const additionalReferenceImageDataUrls = parseImageList(
    req.body.additionalReferenceImageDataUrls
  );
  const roomProgram = Array.isArray(req.body.roomProgram)
    ? req.body.roomProgram.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const roomPrompts = Array.isArray(req.body.roomPrompts) ? req.body.roomPrompts : [];
  const maxRoomsInput = Number(req.body.maxRooms);
  const maxRooms = Number.isFinite(maxRoomsInput)
    ? Math.max(1, Math.min(12, Math.floor(maxRoomsInput)))
    : 6;
  console.log("[render-3d-package] totalPrompt:", !!totalPrompt, "| facadePrompt:", !!facadePrompt, "| maxRooms:", maxRooms, "| roomPrompts:", roomPrompts.length);

  if (!extractedPlanData) {
    return res.status(400).json({
      error: "Dados extraidos da planta 2D obrigatorios para gerar o pacote 3D."
    });
  }

  const extractedRoomNames = extractRoomNamesFromData(extractedPlanData);
  const roomProgramForPrompt = roomProgram.length > 0 ? roomProgram : extractedRoomNames;
  const roomProgramText = roomProgramForPrompt.length
    ? roomProgramForPrompt.map((room) => `- ${room}`).join("\n")
    : "- Programa de ambientes nao informado";
  const resolvedRoomPrompts = resolveRoomPrompts(
    roomPrompts,
    extractedPlanData,
    roomProgramForPrompt
  );

  if (resolvedRoomPrompts.length === 0 && !totalPrompt && !facadePrompt) {
    return res.status(400).json({
      error:
        "Nao foi possivel identificar comodos para renderizacao 3D. Verifique se a extracao JSON retornou rooms_detected/objects/rooms."
    });
  }

  const limitedRooms = resolvedRoomPrompts.slice(0, maxRooms).map((room, index) => ({
    room: String(room.room || `Comodo ${index + 1}`),
    prompt: String(room.prompt || "").trim()
  }));

  // Fetch 3D style example image (for isometric reference)
  let styleExampleDataUrl = String(req.body.styleExampleImageDataUrl || "").trim() || null;
  if (!styleExampleDataUrl && totalPrompt) {
    try {
      styleExampleDataUrl = await fetchImageAsDataUrl(DEFAULT_3D_STYLE_EXAMPLE_URL);
      console.log("[render-3d-package] Style example fetched successfully");
    } catch (styleErr) {
      console.warn("[render-3d-package] Could not fetch style example:", styleErr.message);
    }
  }

  const totalReferenceImages = [...additionalReferenceImageDataUrls];
  if (styleExampleDataUrl) {
    totalReferenceImages.push(styleExampleDataUrl);
  }

  const total = totalPrompt
    ? await renderPromptWithFallback(
        build3DPromptFromExtraction({
          prompt: totalPrompt,
          label: "Volume total da casa",
          referencePlanPrompt,
          roomProgramText,
          extractedPlanData,
          consistencyLock,
          renderKind: "total-exterior"
        }),
        "Volume total da casa",
        {
          referenceImageDataUrl: referencePlanImageDataUrl || undefined,
          referenceImageDataUrls: totalReferenceImages,
          generationConfig: buildGenerationConfigByRenderKind("total-exterior"),
          referenceInstruction: styleExampleDataUrl
            ? [
                "You are receiving TWO reference images:",
                "IMAGE 1 (floor plan): Use ONLY for room layout — wall positions, doors, windows, room sizes.",
                "IMAGE 2 (3D style example): Generate the output in THIS EXACT 3D VISUAL STYLE — isometric cutaway architectural model with walls showing height, 3D furniture with volume, perspective depth.",
                "Combine: LAYOUT from image 1 + VISUAL STYLE from image 2.",
                "The output must look like a physical architectural scale model (maquete) photographed from above at an angle.",
                "NEVER generate a flat 2D floor plan or top-down orthographic view.",
                ...strict3DRules
              ].join("\n")
            : [
                "The attached image is the 2D FLOOR PLAN — use as LAYOUT REFERENCE ONLY (room positions, walls, doors).",
                "Generate a 3D ARCHITECTURAL SCALE MODEL (maquete) photographed at a 30-45 degree angle.",
                "The output MUST show walls with HEIGHT, furniture with VOLUME, and PERSPECTIVE depth.",
                "NEVER generate a flat 2D floor plan or top-down orthographic view.",
                ...strict3DRules
              ].join("\n")
        }
      )
    : { ok: true, skipped: true, result: null };
  console.log("[render-3d-package] Total render ok:", total.ok, "| skipped:", !!total.skipped);
  const facade = facadePrompt
    ? await renderPromptWithFallback(
        build3DPromptFromExtraction({
          prompt: facadePrompt,
          label: "Fachada principal",
          referencePlanPrompt,
          roomProgramText,
          extractedPlanData,
          consistencyLock,
          renderKind: "facade-exterior"
        }),
        "Fachada principal",
        {
          referenceImageDataUrl: referencePlanImageDataUrl || undefined,
          referenceImageDataUrls: additionalReferenceImageDataUrls,
          generationConfig: buildGenerationConfigByRenderKind("facade-exterior"),
          referenceInstruction: [
            "A imagem anexada e a planta 2D oficial do projeto.",
            "Use essa planta apenas como apoio visual para os dados estruturados extraidos.",
            ...strict3DRules
          ].join("\n")
        }
      )
    : {
        ok: true,
        skipped: true,
        result: {
          text: "Render de fachada desativado neste pacote para evitar duplicidade com o 3D total.",
          imageDataUrl: null
        }
      };
  console.log("[render-3d-package] Facade ok:", facade.ok, "| skipped:", !!facade.skipped);

  const rooms = [];

  for (const room of limitedRooms) {
    if (!room.prompt) {
      rooms.push({
        room: room.room,
        ok: false,
        error: "Prompt de comodo vazio."
      });
      continue;
    }

    const roomRender = await renderPromptWithFallback(
      build3DPromptFromExtraction({
        prompt: room.prompt,
        label: room.room,
        referencePlanPrompt,
        roomProgramText,
        extractedPlanData,
        consistencyLock,
        renderKind: "room-interior"
      }),
      `Comodo ${room.room}`,
      {
        referenceImageDataUrl: referencePlanImageDataUrl || undefined,
        referenceImageDataUrls: additionalReferenceImageDataUrls,
        generationConfig: buildGenerationConfigByRenderKind("room-interior"),
        referenceInstruction: [
          "The attached image is the 2D FLOOR PLAN — use as LAYOUT REFERENCE ONLY.",
          "Generate a 3D INTERIOR photograph from INSIDE the room, NOT a floor plan view.",
          "Camera must be at human eye level inside the room. Walls must have height. Furniture must have 3D volume.",
          "NEVER generate a top-down view, blueprint, or flat floor plan.",
          ...strict3DRules
        ].join("\n")
      }
    );
    rooms.push({ room: room.room, ...roomRender });
    console.log(`[render-3d-package] Room "${room.room}" ok:`, roomRender.ok);
  }

  const hasErrors = !total.ok || !facade.ok || rooms.some((item) => !item.ok);
  console.log("[render-3d-package] Concluido. hasErrors:", hasErrors, "| rooms:", rooms.length);

  res.json({
    ok: !hasErrors,
    partial: hasErrors,
    summary: {
      requestedRooms: resolvedRoomPrompts.length,
      renderedRooms: rooms.length
    },
    results: {
      total,
      facade,
      rooms
    }
  });
  } catch (error) {
    console.error("[render-3d-package] ERRO:", error?.message || error);
    console.error("[render-3d-package] Stack:", error?.stack);
    res.status(500).json({ error: error?.message || "Falha ao gerar pacote 3D." });
  }
});

app.post("/api/plan/render-3d-item", async (req, res) => {
  const prompt = String(req.body.prompt || "").trim();
  const label = String(req.body.label || "Item 3D").trim();
  const renderKind = parseRenderKind(req.body.renderKind, label);
  const referencePlanImageDataUrl = String(req.body.referencePlanImageDataUrl || "").trim();
  const referencePlanPrompt = String(req.body.referencePlanPrompt || "").trim();
  const extractedPlanData = parseExtractedPlanData(req.body.extractedPlanData);
  const consistencyLock = parseConsistencyLock(req.body.consistencyLock);
  const additionalReferenceImageDataUrls = parseImageList(
    req.body.additionalReferenceImageDataUrls
  );
  const roomProgram = Array.isArray(req.body.roomProgram)
    ? req.body.roomProgram.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!prompt) {
    return res.status(400).json({ error: "Prompt 3D obrigatorio." });
  }

  if (!extractedPlanData) {
    return res.status(400).json({
      error:
        "Dados extraidos da planta 2D obrigatorios para gerar o 3D. Gere a planta 2D e a extracao antes."
    });
  }

  const extractedRoomNames = extractRoomNamesFromData(extractedPlanData);
  const roomProgramForPrompt = roomProgram.length > 0 ? roomProgram : extractedRoomNames;
  const roomProgramText = roomProgramForPrompt.length
    ? roomProgramForPrompt.map((room) => `- ${room}`).join("\n")
    : "- Programa de ambientes nao informado";

  const enhancedPrompt = build3DPromptFromExtraction({
    prompt,
    label,
    referencePlanPrompt,
    roomProgramText,
    extractedPlanData,
    consistencyLock,
    renderKind
  });

  const renderResult = await renderPromptWithFallback(enhancedPrompt, label, {
    referenceImageDataUrl: referencePlanImageDataUrl || undefined,
    referenceImageDataUrls: additionalReferenceImageDataUrls,
    generationConfig: buildGenerationConfigByRenderKind(renderKind),
    referenceInstruction: [
      "A imagem anexada e a planta 2D oficial do projeto.",
      "Use essa planta apenas como apoio visual para os dados estruturados extraidos.",
      ...strict3DRules
    ].join("\n")
  });

  if (!renderResult.ok) {
    return res.status(502).json({ error: renderResult.error || "Falha ao renderizar item 3D." });
  }

  res.json({
    ok: true,
    label,
    result: renderResult.result
  });
});

app.use((error, _req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error:
        "Payload muito grande para o servidor. A imagem de referencia 2D excedeu o limite. Ajuste JSON_BODY_LIMIT no .env ou reduza a imagem 2D."
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "JSON invalido na requisicao."
    });
  }

  const statusCode = Number.isInteger(error.status) ? error.status : 500;
  return res.status(statusCode).json({
    error: error.message || "Erro interno no servidor."
  });
});

// Prevent unhandled errors from crashing the server
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
});

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
