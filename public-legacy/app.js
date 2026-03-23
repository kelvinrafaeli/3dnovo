const form = document.getElementById("terrain-form");
const statusEl = document.getElementById("status");
const resultsCard = document.getElementById("results-card");
const summaryOutput = document.getElementById("summary-output");
const prompt2dEl = document.getElementById("prompt-2d");
const prompt3dTotalEl = document.getElementById("prompt-3d-total");
const promptFacadeEl = document.getElementById("prompt-facade");
const roomsOutputEl = document.getElementById("rooms-output");
const render2dBtn = document.getElementById("render-2d-btn");
const render3dBtn = document.getElementById("render-3d-btn");
const renderOutput = document.getElementById("render-output");
const renderImage = document.getElementById("render-image");
const renderText = document.getElementById("render-text");
const edit2dBtn = document.getElementById("edit-2d-btn");
const render3dOutput = document.getElementById("render-3d-output");
const render3dTotalImage = document.getElementById("render-3d-total-image");
const render3dTotalText = document.getElementById("render-3d-total-text");
const edit3dTotalBtn = document.getElementById("edit-3d-total-btn");
const render3dFacadeCard = document.getElementById("render-3d-facade-card");
const render3dFacadeImage = document.getElementById("render-3d-facade-image");
const render3dFacadeText = document.getElementById("render-3d-facade-text");
const edit3dFacadeBtn = document.getElementById("edit-3d-facade-btn");
const render3dRoomsList = document.getElementById("render-3d-rooms-list");
const extractionBlock = document.getElementById("extract-output-block");
const extractionOutput = document.getElementById("extract-output");

const ENABLE_FACADE_RENDER = false;
const MAX_REFERENCE_IMAGES_PER_REQUEST = 2;
const MAX_RENDER_REQUEST_BYTES = 18 * 1024 * 1024;
const MAX_PLAN_REFERENCE_DIMENSION = 1400;
const PLAN_REFERENCE_JPEG_QUALITY = 0.9;

let latestGeneratedData = null;
let latestPlan2DImageDataUrl = "";
let latestExtractedPlanData = null;
let latestExtractionMeta = null;
let latestProjectConsistencyLock = null;
let latestProjectAnchor3DImageDataUrl = "";
let latestRoomInteriorAnchorsByKey = {};
let latestRoomPromptByKey = {};
let latestRoomCardByKey = {};
let latest2DRenderPrompt = "";
let latest3DTotalPrompt = "";
let latest3DFacadePrompt = "";
let editRenderInProgress = false;
let latestPlan2DSanitizeInfo = {
  cropped: false,
  resized: false,
  reencoded: false
};

function computeVisualProjectSignature(payloadObject) {
  const source = JSON.stringify(payloadObject || {});
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `PROJ-${normalized}`;
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type || ""}`;
}

async function readApiResponse(response, defaultErrorMessage) {
  const responseText = await response.text();
  let parsed = null;

  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    parsed = null;
  }

  if (!response.ok) {
    if (parsed?.error) {
      throw new Error(parsed.error);
    }

    const preview = String(responseText || "")
      .replace(/\s+/g, " ")
      .slice(0, 180);

    throw new Error(
      `${defaultErrorMessage} (HTTP ${response.status})${preview ? ` - ${preview}` : ""}`
    );
  }

  if (!parsed) {
    throw new Error(
      "Servidor respondeu em formato inesperado. Recarregue a pagina (Ctrl+F5) e tente novamente."
    );
  }

  return parsed;
}

function collectFormData(formElement) {
  const formData = new FormData(formElement);

  return {
    fullName: String(formData.get("fullName") || "").trim(),
    document: String(formData.get("document") || "").trim(),
    budgetRange: String(formData.get("budgetRange") || "").trim(),
    objective: String(formData.get("objective") || "").trim(),
    cep: String(formData.get("cep") || "").trim(),
    street: String(formData.get("street") || "").trim(),
    number: String(formData.get("number") || "").trim(),
    neighborhood: String(formData.get("neighborhood") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    state: String(formData.get("state") || "").trim(),
    terrainType: String(formData.get("terrainType") || "").trim(),
    frontMeters: Number(formData.get("frontMeters")),
    backMeters: Number(formData.get("backMeters")),
    rightMeters: Number(formData.get("rightMeters")),
    leftMeters: Number(formData.get("leftMeters")),
    topography: String(formData.get("topography") || "").trim(),
    soilType: String(formData.get("soilType") || "").trim(),
    leftNeighbor: String(formData.get("leftNeighbor") || "").trim(),
    rightNeighbor: String(formData.get("rightNeighbor") || "").trim(),
    backNeighbor: String(formData.get("backNeighbor") || "").trim(),
    hasWater: Boolean(formData.get("hasWater")),
    hasSewer: Boolean(formData.get("hasSewer")),
    hasElectricity: Boolean(formData.get("hasElectricity"))
  };
}

function renderGeneratedData(payload) {
  latestGeneratedData = payload;
  latestPlan2DImageDataUrl = "";
  latestExtractedPlanData = null;
  latestExtractionMeta = null;
  latestProjectConsistencyLock = null;
  latestProjectAnchor3DImageDataUrl = "";
  latestRoomInteriorAnchorsByKey = {};
  latestRoomPromptByKey = {};
  latestRoomCardByKey = {};
  latest2DRenderPrompt = String(payload?.prompts?.plan2DRenderNanoBanana2 || "").trim();
  latest3DTotalPrompt = String(payload?.prompts?.plan3DTotal || "").trim();
  latest3DFacadePrompt = String(payload?.prompts?.facade3D || "").trim();
  resultsCard.hidden = false;
  render3dOutput.hidden = true;
  render3dRoomsList.innerHTML = "";
  extractionBlock.hidden = true;
  extractionOutput.textContent = "";

  if (render3dFacadeCard) {
    render3dFacadeCard.hidden = !ENABLE_FACADE_RENDER;
  }

  summaryOutput.textContent = JSON.stringify(payload.summary, null, 2);
  prompt2dEl.value = latest2DRenderPrompt;
  prompt3dTotalEl.value = latest3DTotalPrompt;
  promptFacadeEl.value = latest3DFacadePrompt;

  const initialRoomPrompts = Array.isArray(payload?.prompts?.plan3DRooms)
    ? payload.prompts.plan3DRooms
    : [];

  for (const roomItem of initialRoomPrompts) {
    const roomName = String(roomItem?.room || "").trim();
    const roomPrompt = String(roomItem?.prompt || "").trim();
    const roomKey = normalizeRoomKey(roomName);

    if (!roomKey || !roomPrompt) {
      continue;
    }

    latestRoomPromptByKey[roomKey] = roomPrompt;
  }

  const roomsText = initialRoomPrompts
    .map((room) => `${room.room}\n${room.prompt}`)
    .join("\n\n----------------------------------------\n\n");

  roomsOutputEl.textContent = roomsText;
}

function normalizeRoomKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRoomPromptForName(roomName, fallbackPrompt = "") {
  const roomKey = normalizeRoomKey(roomName);

  if (!roomKey) {
    return String(fallbackPrompt || "").trim();
  }

  const currentPrompt = String(latestRoomPromptByKey[roomKey] || "").trim();
  return currentPrompt || String(fallbackPrompt || "").trim();
}

function setRoomPromptForName(roomName, prompt) {
  const roomKey = normalizeRoomKey(roomName);
  const normalizedPrompt = String(prompt || "").trim();

  if (!roomKey || !normalizedPrompt) {
    return;
  }

  latestRoomPromptByKey[roomKey] = normalizedPrompt;
}

function requestEditInstruction(label) {
  const rawInput = window.prompt(
    `Descreva somente o que deseja alterar em "${label}".\nExemplo: trocar cor do sofa para cinza grafite e manter todo o restante igual.`
  );

  const instruction = String(rawInput || "").trim();
  return instruction || null;
}

function buildControlledEditPrompt(basePrompt, editInstruction, label) {
  const base = String(basePrompt || "").trim();
  const instruction = String(editInstruction || "").trim();

  return [
    `MODO EDICAO CONTROLADA - ${label}`,
    "Aplique SOMENTE as alteracoes solicitadas abaixo e mantenha todo o restante exatamente igual.",
    "Nao alterar geometria, layout, posicao de portas/janelas, materiais base, estilo geral ou enquadramento, exceto quando explicitamente pedido.",
    `ALTERACOES SOLICITADAS: ${instruction}`,
    "",
    "PROMPT BASE (preservar):",
    base
  ].join("\n");
}

async function withEditLock(task) {
  if (editRenderInProgress) {
    setStatus("Ja existe uma edicao em andamento. Aguarde concluir.", "warn");
    return false;
  }

  editRenderInProgress = true;

  try {
    await task();
    return true;
  } finally {
    editRenderInProgress = false;
  }
}

async function ensure3DBaseDataForEdition() {
  if (!latestPlan2DImageDataUrl) {
    const result2D = await render2DPlan({ silent: true, promptOverride: latest2DRenderPrompt });

    if (!result2D.imageDataUrl) {
      throw new Error("Nao foi possivel obter imagem 2D de referencia para editar o 3D.");
    }
  }

  if (!latestExtractedPlanData) {
    await extract2DData({ silent: true, force: true });
  }

  if (!latestProjectConsistencyLock) {
    latestProjectConsistencyLock = buildProjectConsistencyLock();
  }
}

function findExtractedRoomByName(roomName) {
  const rooms = Array.isArray(latestExtractedPlanData?.rooms) ? latestExtractedPlanData.rooms : [];
  const targetKey = normalizeRoomKey(roomName);

  if (!targetKey) {
    return null;
  }

  let bestRoom = null;
  let bestScore = 0;

  for (const room of rooms) {
    const roomKey = normalizeRoomKey(room?.name || "");
    if (!roomKey) {
      continue;
    }

    let score = 0;
    if (roomKey === targetKey) {
      score = 100;
    } else if (roomKey.includes(targetKey) || targetKey.includes(roomKey)) {
      score = 80;
    } else {
      const tokens = targetKey.split(" ").filter(Boolean);
      score = tokens.filter((token) => roomKey.includes(token)).length * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRoom = room;
    }
  }

  return bestScore >= 20 ? bestRoom : null;
}

function uniqueDataUrls(values) {
  const output = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = String(value || "").trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function estimateDataUrlBytes(dataUrl) {
  const value = String(dataUrl || "").trim();
  const marker = "base64,";
  const markerIndex = value.indexOf(marker);

  if (markerIndex < 0) {
    return 0;
  }

  const base64 = value.slice(markerIndex + marker.length);
  return Math.ceil(base64.length * 0.75);
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem 2D para limpeza automatica."));
    image.src = dataUrl;
  });
}

function detectRightInfoPanelStart(image, context) {
  const width = image.width;
  const height = image.height;
  const stepY = 2;
  const lineScanStartX = Math.floor(width * 0.55);
  const lineScanEndX = Math.floor(width * 0.95);

  for (let x = lineScanStartX; x <= lineScanEndX; x += 1) {
    let darkCount = 0;
    let sampleCount = 0;

    for (let y = 0; y < height; y += stepY) {
      const offset = (y * width + x) * 4;
      const red = context.data[offset];
      const green = context.data[offset + 1];
      const blue = context.data[offset + 2];
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

      if (luminance < 28) {
        darkCount += 1;
      }

      sampleCount += 1;
    }

    const darkRatio = sampleCount > 0 ? darkCount / sampleCount : 0;

    if (darkRatio >= 0.62) {
      const panelWidth = width - x;

      if (panelWidth >= width * 0.12 && panelWidth <= width * 0.55) {
        return x;
      }
    }
  }

  const fallbackSplits = [0.68, 0.7, 0.72, 0.74, 0.76];

  for (const splitRatio of fallbackSplits) {
    const splitX = Math.floor(width * splitRatio);
    const panelWidth = width - splitX;

    if (panelWidth < width * 0.12) {
      continue;
    }

    let whiteCount = 0;
    let darkCount = 0;
    let sampleCount = 0;

    for (let y = 0; y < height; y += stepY) {
      for (let x = splitX; x < width; x += 3) {
        const offset = (y * width + x) * 4;
        const red = context.data[offset];
        const green = context.data[offset + 1];
        const blue = context.data[offset + 2];
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

        if (luminance > 220) {
          whiteCount += 1;
        }

        if (luminance < 80) {
          darkCount += 1;
        }

        sampleCount += 1;
      }
    }

    const whiteRatio = sampleCount > 0 ? whiteCount / sampleCount : 0;
    const darkRatio = sampleCount > 0 ? darkCount / sampleCount : 0;

    if (whiteRatio >= 0.72 && darkRatio >= 0.02 && darkRatio <= 0.24) {
      return splitX;
    }
  }

  return null;
}

async function sanitizePlanReferenceImageDataUrl(dataUrl) {
  const rawDataUrl = String(dataUrl || "").trim();

  if (!rawDataUrl.startsWith("data:image/")) {
    return {
      imageDataUrl: rawDataUrl,
      cropped: false,
      resized: false,
      reencoded: false
    };
  }

  try {
    const image = await loadImageFromDataUrl(rawDataUrl);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.width;
    sourceCanvas.height = image.height;

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

    if (!sourceContext) {
      return {
        imageDataUrl: rawDataUrl,
        cropped: false,
        resized: false,
        reencoded: false
      };
    }

    sourceContext.drawImage(image, 0, 0);
    const imageData = sourceContext.getImageData(0, 0, image.width, image.height);
    const panelStartX = detectRightInfoPanelStart(image, imageData);

    const cropped = Number.isInteger(panelStartX);
    const cropWidth = cropped ? Math.max(320, panelStartX - 6) : image.width;
    const scale = Math.min(
      1,
      MAX_PLAN_REFERENCE_DIMENSION / cropWidth,
      MAX_PLAN_REFERENCE_DIMENSION / image.height
    );
    const targetWidth = Math.max(1, Math.round(cropWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const resized = targetWidth !== cropWidth || targetHeight !== image.height;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;

    const outputContext = outputCanvas.getContext("2d");

    if (!outputContext) {
      return {
        imageDataUrl: rawDataUrl,
        cropped,
        resized: false,
        reencoded: false
      };
    }

    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(
      sourceCanvas,
      0,
      0,
      cropWidth,
      image.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const outputDataUrl = outputCanvas.toDataURL("image/jpeg", PLAN_REFERENCE_JPEG_QUALITY);
    const reencoded =
      cropped ||
      resized ||
      estimateDataUrlBytes(outputDataUrl) < estimateDataUrlBytes(rawDataUrl);

    return {
      imageDataUrl: reencoded ? outputDataUrl : rawDataUrl,
      cropped,
      resized,
      reencoded
    };
  } catch (_error) {
    return {
      imageDataUrl: rawDataUrl,
      cropped: false,
      resized: false,
      reencoded: false
    };
  }
}

function estimateJsonPayloadBytes(payload) {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch (_error) {
    return Number.MAX_SAFE_INTEGER;
  }
}

function trimReferenceImagesToPayloadBudget(basePayload, candidateImages) {
  const selected = [];

  for (const candidate of candidateImages) {
    const nextSelected = [...selected, candidate];
    const payloadPreview = {
      ...basePayload,
      additionalReferenceImageDataUrls: nextSelected
    };

    if (estimateJsonPayloadBytes(payloadPreview) <= MAX_RENDER_REQUEST_BYTES) {
      selected.push(candidate);
    }
  }

  return selected;
}

function buildRoomReferenceImages(roomName) {
  const refs = [];
  const roomKey = normalizeRoomKey(roomName);

  if (roomKey && latestRoomInteriorAnchorsByKey[roomKey]) {
    refs.push(latestRoomInteriorAnchorsByKey[roomKey]);
  }

  const roomData = findExtractedRoomByName(roomName);
  const adjacentNames = Array.isArray(roomData?.adjacent_to) ? roomData.adjacent_to : [];

  for (const adjacentName of adjacentNames) {
    const adjacentKey = normalizeRoomKey(adjacentName);

    if (adjacentKey && latestRoomInteriorAnchorsByKey[adjacentKey]) {
      refs.push(latestRoomInteriorAnchorsByKey[adjacentKey]);

      if (refs.length >= MAX_REFERENCE_IMAGES_PER_REQUEST) {
        break;
      }
    }
  }

  if (latestProjectAnchor3DImageDataUrl) {
    refs.push(latestProjectAnchor3DImageDataUrl);
  }

  return uniqueDataUrls(refs).slice(0, MAX_REFERENCE_IMAGES_PER_REQUEST);
}

function collectExtractedRoomNames() {
  const seen = new Set();
  const output = [];

  const register = (value) => {
    const normalized = String(value || "").trim();
    const key = normalizeRoomKey(normalized);

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(normalized);
  };

  const rooms = Array.isArray(latestExtractedPlanData?.rooms) ? latestExtractedPlanData.rooms : [];
  const roomsDetected = Array.isArray(latestExtractedPlanData?.rooms_detected)
    ? latestExtractedPlanData.rooms_detected
    : [];
  const objects = Array.isArray(latestExtractedPlanData?.objects) ? latestExtractedPlanData.objects : [];

  rooms.forEach((room) => register(room?.name));
  roomsDetected.forEach((roomName) => register(roomName));
  objects.forEach((item) => register(item?.room_name));

  return output;
}

function buildFallbackRoomPrompt(roomName) {
  return [
    `Crie um render 3D INTERNO detalhado do ambiente: ${roomName}.`,
    "Use estritamente o JSON extraido da imagem 2D para objetos, cores, materiais e posicionamento.",
    "Nao inventar decoracao, materiais ou cores fora do JSON extraido.",
    "Nao renderizar fachada ou vista externa neste render de comodo."
  ].join("\n");
}

function resolveRoomPromptsFromExtraction() {
  const basePrompts = Array.isArray(latestGeneratedData?.prompts?.plan3DRooms)
    ? latestGeneratedData.prompts.plan3DRooms
    : [];
  const extractedRoomNames = collectExtractedRoomNames();
  const roomProgramNames = Array.isArray(latestGeneratedData?.roomProgram)
    ? latestGeneratedData.roomProgram
    : [];

  const resolvedRoomNames = [];
  const seenRoomKeys = new Set();

  const registerRoomName = (value) => {
    const normalized = String(value || "").trim();
    const key = normalizeRoomKey(normalized);

    if (!key || seenRoomKeys.has(key)) {
      return;
    }

    seenRoomKeys.add(key);
    resolvedRoomNames.push(normalized);
  };

  extractedRoomNames.forEach((roomName) => registerRoomName(roomName));
  roomProgramNames.forEach((roomName) => registerRoomName(roomName));
  basePrompts.forEach((item) => registerRoomName(item?.room));

  if (resolvedRoomNames.length === 0) {
    return basePrompts;
  }

  const promptByRoomKey = new Map();

  for (const item of basePrompts) {
    const room = String(item?.room || "").trim();
    const prompt = String(item?.prompt || "").trim();
    const key = normalizeRoomKey(room);

    if (!key) {
      continue;
    }

    promptByRoomKey.set(key, prompt);
  }

  for (const [roomKey, prompt] of Object.entries(latestRoomPromptByKey)) {
    const normalizedPrompt = String(prompt || "").trim();

    if (!roomKey || !normalizedPrompt) {
      continue;
    }

    promptByRoomKey.set(roomKey, normalizedPrompt);
  }

  return resolvedRoomNames.map((roomName) => {
    const key = normalizeRoomKey(roomName);
    const mappedPrompt = key ? promptByRoomKey.get(key) : "";

    return {
      room: roomName,
      prompt: mappedPrompt || buildFallbackRoomPrompt(roomName)
    };
  });
}

function buildProjectConsistencyLock() {
  const rooms = Array.isArray(latestExtractedPlanData?.rooms)
    ? latestExtractedPlanData.rooms.map((room) => ({
        name: room.name,
        dimensions: room.dimensions,
        doors: Array.isArray(room.doors) ? room.doors.length : 0,
        windows: Array.isArray(room.windows) ? room.windows.length : 0
      }))
    : [];
  const visualObjects = Array.isArray(latestExtractedPlanData?.objects)
    ? latestExtractedPlanData.objects.map((item) => ({
        name: item?.name || null,
        color: item?.color || null,
        material: item?.material || null,
        position_in_room: item?.position_in_room || null,
        room_name: item?.room_name || null
      }))
    : [];

  const strictRules = [
    "Todas as imagens 3D pertencem ao MESMO projeto e devem manter a mesma volumetria.",
    "Cobertura/telhado devem ser identicos entre volume geral e fachada.",
    "Seguir sempre o prompt mestre da planta 2D e as medidas extraidas.",
    "Nao inventar quartos/comodos que nao existam na planta.",
    "Nao inventar novas portas/janelas nem mudar posicao das existentes.",
    "Nao inventar objetos, cores ou materiais fora do JSON extraido.",
    "Manter logica da area externa ja definida na imagem de volume total.",
    "Nao exibir planta baixa, cotas ou overlays nas imagens finais 3D."
  ];

  const signaturePayload = {
    objective: latestGeneratedData?.summary?.objective || null,
    roomProgram: latestGeneratedData?.roomProgram || [],
    roomStyle: latestExtractedPlanData?.room_style || null,
    colorPalette: latestExtractedPlanData?.overall_color_palette || [],
    lot: latestExtractedPlanData?.lot || null,
    openings: latestExtractedPlanData?.openings_global || null,
    rooms,
    objects: visualObjects
  };

  const visualSignature = computeVisualProjectSignature(signaturePayload);

  return {
    projectId: latestGeneratedData?.generatedAt || new Date().toISOString(),
    objective: latestGeneratedData?.summary?.objective || null,
    visualSignature,
    strictRules,
    extractedSummary: {
      overall: latestExtractedPlanData?.overall || null,
      roomStyle: latestExtractedPlanData?.room_style || null,
      overallColorPalette: latestExtractedPlanData?.overall_color_palette || [],
      lot: latestExtractedPlanData?.lot || null,
      dimensionsAndQuotas: latestExtractedPlanData?.dimensions_and_quotas || [],
      openingsGlobal: latestExtractedPlanData?.openings_global || null,
      rooms,
      objects: visualObjects
    }
  };
}

function applyRenderResultToCard(result, imageEl, textEl, emptyTextMessage) {
  const textChunks = [];

  if (result?.warning) {
    textChunks.push(result.warning);
  }

  if (result?.model) {
    textChunks.push(`Modelo: ${result.model}`);
  }

  if (result?.text) {
    textChunks.push(result.text);
  }

  textEl.textContent = textChunks.join("\n\n") || emptyTextMessage;

  if (result?.imageDataUrl) {
    imageEl.src = result.imageDataUrl;
    imageEl.hidden = false;
  } else {
    imageEl.hidden = true;
    imageEl.removeAttribute("src");
  }
}

function createRoomRenderCard(roomName, roomResult, errorMessage, onEdit) {
  const card = document.createElement("article");
  card.className = "render-room-card";

  const title = document.createElement("h5");
  title.textContent = roomName;

  const image = document.createElement("img");
  image.alt = `Renderizacao 3D do comodo ${roomName}`;

  const text = document.createElement("pre");

  if (!errorMessage) {
    applyRenderResultToCard(
      roomResult,
      image,
      text,
      "A API nao retornou texto para este comodo."
    );
  } else {
    text.textContent = errorMessage;
    image.hidden = true;
  }

  const actions = document.createElement("div");
  actions.className = "render-card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-render-btn";
  editButton.textContent = "Editar imagem";

  if (typeof onEdit === "function") {
    editButton.addEventListener("click", onEdit);
  } else {
    editButton.disabled = true;
  }

  actions.appendChild(editButton);

  card.appendChild(title);
  card.appendChild(image);
  card.appendChild(actions);
  card.appendChild(text);
  return card;
}

function upsertRoomRenderCard(roomName, roomResult, errorMessage, onEdit) {
  const roomKey = normalizeRoomKey(roomName);
  const nextCard = createRoomRenderCard(roomName, roomResult, errorMessage, onEdit);
  const previousCard = roomKey ? latestRoomCardByKey[roomKey] : null;

  if (previousCard?.parentElement) {
    previousCard.replaceWith(nextCard);
  } else {
    render3dRoomsList.appendChild(nextCard);
  }

  if (roomKey) {
    latestRoomCardByKey[roomKey] = nextCard;
  }
}

async function render3DItem(prompt, label, options = {}) {
  const roomProgram = Array.isArray(latestGeneratedData?.roomProgram)
    ? latestGeneratedData.roomProgram
    : latestGeneratedData?.prompts?.plan3DRooms?.map((item) => item.room) || [];

  if (!latestExtractedPlanData) {
    throw new Error(
      "Dados extraidos da planta 2D nao encontrados. Gere a planta 2D e extraia os dados antes do 3D."
    );
  }

  const basePayload = {
    prompt,
    label,
    referencePlanImageDataUrl: latestPlan2DImageDataUrl,
    additionalReferenceImageDataUrls: [],
    referencePlanPrompt: latest2DRenderPrompt || latestGeneratedData?.prompts?.plan2DRenderNanoBanana2 || "",
    roomProgram,
    extractedPlanData: latestExtractedPlanData,
    consistencyLock: options.consistencyLock || latestProjectConsistencyLock,
    renderKind: options.renderKind || "generic"
  };
  const candidateReferenceImages = uniqueDataUrls(options.additionalReferenceImageDataUrls || [])
    .slice(0, MAX_REFERENCE_IMAGES_PER_REQUEST + 2);
  const safeReferenceImages = trimReferenceImagesToPayloadBudget(
    basePayload,
    candidateReferenceImages
  );
  const requestPayload = {
    ...basePayload,
    additionalReferenceImageDataUrls: safeReferenceImages
  };

  if (estimateJsonPayloadBytes(requestPayload) > MAX_RENDER_REQUEST_BYTES) {
    throw new Error(
      "Carga de imagens muito grande para este render 3D. Gere novamente a planta 2D ou reduza referencias de imagem."
    );
  }

  const response = await fetch("/api/plan/render-3d-item", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  const data = await readApiResponse(response, `Falha ao renderizar ${label}.`);

  return data.result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderExtractedData(extraction) {
  latestExtractedPlanData = extraction.extractedPlanData;
  latestExtractionMeta = {
    model: extraction.model,
    usedFallback: extraction.usedFallback
  };

  extractionBlock.hidden = false;
  extractionOutput.textContent = JSON.stringify(
    {
      model: extraction.model,
      usedFallback: extraction.usedFallback,
      extractedPlanData: extraction.extractedPlanData
    },
    null,
    2
  );
}

async function extract2DData({ silent = false, force = false } = {}) {
  if (!force && latestExtractedPlanData) {
    return {
      extractedPlanData: latestExtractedPlanData,
      model: latestExtractionMeta?.model || "cache",
      usedFallback: Boolean(latestExtractionMeta?.usedFallback)
    };
  }

  if (!latestPlan2DImageDataUrl) {
    throw new Error("Imagem da planta 2D nao disponivel para extracao.");
  }

  if (!silent) {
    setStatus("Extraindo JSON visual da planta 2D (estilo, paleta, objetos, materiais e posicoes)...", "");
  }

  const roomProgram = Array.isArray(latestGeneratedData?.roomProgram)
    ? latestGeneratedData.roomProgram
    : [];

  const response = await fetch("/api/plan/extract-2d-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      referencePlanImageDataUrl: latestPlan2DImageDataUrl,
      plan2DPrompt: latest2DRenderPrompt || latestGeneratedData?.prompts?.plan2DRenderNanoBanana2 || "",
      roomProgram
    })
  });

  const data = await readApiResponse(response, "Falha ao extrair dados da planta 2D.");
  renderExtractedData(data.extraction);
  return data.extraction;
}

async function render2DPlan({ silent = false, promptOverride = "" } = {}) {
  const usedPrompt = String(
    promptOverride || latest2DRenderPrompt || latestGeneratedData?.prompts?.plan2DRenderNanoBanana2 || ""
  ).trim();

  if (!usedPrompt) {
    throw new Error("Gere o pacote antes de renderizar a planta 2D.");
  }

  if (!silent) {
    setStatus("Renderizando 2D no Nano Banana 2...", "");
  }

  const response = await fetch("/api/plan/render-2d", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: usedPrompt
    })
  });

  const data = await readApiResponse(response, "Falha na renderizacao 2D.");

  renderOutput.hidden = false;
  renderText.textContent = data.result.text || "A API nao retornou texto para esta chamada.";

  if (data.result.imageDataUrl) {
    const sanitizedReference = await sanitizePlanReferenceImageDataUrl(data.result.imageDataUrl);
    latestPlan2DImageDataUrl = sanitizedReference.imageDataUrl;
    latest2DRenderPrompt = usedPrompt;
    latestPlan2DSanitizeInfo = {
      cropped: sanitizedReference.cropped,
      resized: sanitizedReference.resized,
      reencoded: sanitizedReference.reencoded
    };
    renderImage.src = sanitizedReference.imageDataUrl;
    renderImage.hidden = false;

    if (sanitizedReference.cropped || sanitizedReference.reencoded || sanitizedReference.resized) {
      const notes = [];

      if (sanitizedReference.cropped) {
        notes.push("painel lateral de informacoes removido");
      }

      if (sanitizedReference.resized) {
        notes.push("resolucao ajustada para referencia tecnica");
      }

      if (sanitizedReference.reencoded) {
        notes.push("imagem reotimizada para reduzir payload");
      }

      renderText.textContent = `${renderText.textContent}\n\n[Limpeza automatica aplicada: ${notes.join(", ")}.]`;
    }
  } else {
    latestPlan2DImageDataUrl = "";
    latest2DRenderPrompt = usedPrompt;
    latestPlan2DSanitizeInfo = {
      cropped: false,
      resized: false,
      reencoded: false
    };
    renderImage.hidden = true;
    renderImage.removeAttribute("src");
  }

  return data.result;
}

async function render3DItemWithRetry(prompt, label, options = {}, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await render3DItem(prompt, label, options);
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await sleep(900 * attempt);
      }
    }
  }

  throw lastError || new Error(`Falha ao renderizar ${label}.`);
}

async function edit2DRenderImage() {
  if (!latestGeneratedData?.prompts?.plan2DRenderNanoBanana2) {
    setStatus("Gere o pacote antes de editar a imagem 2D.", "error");
    return;
  }

  const editInstruction = requestEditInstruction("Planta 2D");

  if (!editInstruction) {
    return;
  }

  const basePrompt = latest2DRenderPrompt || latestGeneratedData.prompts.plan2DRenderNanoBanana2;
  const editedPrompt = buildControlledEditPrompt(basePrompt, editInstruction, "Planta 2D");

  try {
    await withEditLock(async () => {
      setStatus("Aplicando edicao na imagem 2D...", "");
      const result = await render2DPlan({ silent: true, promptOverride: editedPrompt });

      if (!result.imageDataUrl) {
        throw new Error("A edicao da imagem 2D nao retornou imagem.");
      }

      latest2DRenderPrompt = editedPrompt;
      prompt2dEl.value = editedPrompt;
      await extract2DData({ silent: true, force: true });
      latestProjectConsistencyLock = buildProjectConsistencyLock();

      setStatus("Imagem 2D editada com sucesso.", "ok");
    });
  } catch (error) {
    setStatus(error.message || "Falha ao editar imagem 2D.", "error");
  }
}

async function edit3DTotalRenderImage() {
  if (!latestGeneratedData?.prompts?.plan3DTotal) {
    setStatus("Gere o pacote antes de editar a imagem 3D total.", "error");
    return;
  }

  const editInstruction = requestEditInstruction("3D Total");

  if (!editInstruction) {
    return;
  }

  const basePrompt = latest3DTotalPrompt || latestGeneratedData.prompts.plan3DTotal;
  const editedPrompt = buildControlledEditPrompt(basePrompt, editInstruction, "3D Total");

  try {
    await withEditLock(async () => {
      await ensure3DBaseDataForEdition();
      setStatus("Aplicando edicao no 3D total...", "");

      const totalResult = await render3DItemWithRetry(
        editedPrompt,
        "Volume total da casa",
        {
          consistencyLock: latestProjectConsistencyLock,
          renderKind: "total-exterior",
          additionalReferenceImageDataUrls: []
        }
      );

      applyRenderResultToCard(
        totalResult,
        render3dTotalImage,
        render3dTotalText,
        "A API nao retornou texto para o 3D total."
      );

      if (!totalResult.imageDataUrl) {
        throw new Error("A edicao do 3D total nao retornou imagem.");
      }

      latest3DTotalPrompt = editedPrompt;
      prompt3dTotalEl.value = editedPrompt;
      latestProjectAnchor3DImageDataUrl = totalResult.imageDataUrl;

      setStatus("Imagem 3D total editada com sucesso.", "ok");
    });
  } catch (error) {
    setStatus(error.message || "Falha ao editar imagem 3D total.", "error");
  }
}

async function edit3DFacadeRenderImage() {
  if (!ENABLE_FACADE_RENDER) {
    setStatus("Render de fachada esta desativado neste projeto.", "warn");
    return;
  }

  const editInstruction = requestEditInstruction("Fachada 3D");

  if (!editInstruction) {
    return;
  }

  const basePrompt = latest3DFacadePrompt || latestGeneratedData?.prompts?.facade3D || "";

  if (!basePrompt) {
    setStatus("Prompt base da fachada nao encontrado.", "error");
    return;
  }

  const editedPrompt = buildControlledEditPrompt(basePrompt, editInstruction, "Fachada 3D");

  try {
    await withEditLock(async () => {
      await ensure3DBaseDataForEdition();
      setStatus("Aplicando edicao na fachada 3D...", "");

      const facadeResult = await render3DItemWithRetry(
        editedPrompt,
        "Fachada principal",
        {
          consistencyLock: latestProjectConsistencyLock,
          renderKind: "facade-exterior",
          additionalReferenceImageDataUrls: latestProjectAnchor3DImageDataUrl
            ? [latestProjectAnchor3DImageDataUrl]
            : []
        }
      );

      applyRenderResultToCard(
        facadeResult,
        render3dFacadeImage,
        render3dFacadeText,
        "A API nao retornou texto para a fachada 3D."
      );

      latest3DFacadePrompt = editedPrompt;
      promptFacadeEl.value = editedPrompt;
      setStatus("Imagem da fachada editada com sucesso.", "ok");
    });
  } catch (error) {
    setStatus(error.message || "Falha ao editar imagem de fachada.", "error");
  }
}

async function editRoomRenderImage(roomName) {
  const room = String(roomName || "").trim();

  if (!room) {
    return;
  }

  const editInstruction = requestEditInstruction(`Comodo ${room}`);

  if (!editInstruction) {
    return;
  }

  const basePrompt = getRoomPromptForName(room, buildFallbackRoomPrompt(room));

  if (!basePrompt) {
    setStatus(`Prompt base do comodo ${room} nao encontrado.`, "error");
    return;
  }

  const editedPrompt = buildControlledEditPrompt(basePrompt, editInstruction, `Comodo ${room}`);

  try {
    await withEditLock(async () => {
      await ensure3DBaseDataForEdition();
      setStatus(`Aplicando edicao no comodo ${room}...`, "");

      const roomResult = await render3DItemWithRetry(
        editedPrompt,
        `Comodo ${room}`,
        {
          consistencyLock: latestProjectConsistencyLock,
          renderKind: "room-interior",
          additionalReferenceImageDataUrls: buildRoomReferenceImages(room)
        }
      );

      setRoomPromptForName(room, editedPrompt);
      upsertRoomRenderCard(room, roomResult, null, () => {
        editRoomRenderImage(room);
      });

      if (roomResult.imageDataUrl) {
        latestRoomInteriorAnchorsByKey[normalizeRoomKey(room)] = roomResult.imageDataUrl;
      }

      setStatus(`Imagem do comodo ${room} editada com sucesso.`, "ok");
    });
  } catch (error) {
    setStatus(error.message || `Falha ao editar imagem do comodo ${room}.`, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Gerando pacote tecnico 2D + 3D...", "");
    const payload = collectFormData(form);

    const response = await fetch("/api/plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await readApiResponse(response, "Falha ao gerar pacote.");

    renderGeneratedData(data);
    setStatus("Pacote gerado com sucesso.", "ok");
  } catch (error) {
    setStatus(error.message || "Erro inesperado no envio do formulario.", "error");
  }
});

if (edit2dBtn) {
  edit2dBtn.addEventListener("click", () => {
    edit2DRenderImage();
  });
}

if (edit3dTotalBtn) {
  edit3dTotalBtn.addEventListener("click", () => {
    edit3DTotalRenderImage();
  });
}

if (edit3dFacadeBtn) {
  edit3dFacadeBtn.addEventListener("click", () => {
    edit3DFacadeRenderImage();
  });
}

render2dBtn.addEventListener("click", async () => {
  if (!latestGeneratedData?.prompts?.plan2DRenderNanoBanana2) {
    setStatus("Gere o pacote antes de renderizar a planta 2D.", "error");
    return;
  }

  try {
    const result = await render2DPlan();

    let extractionError = null;
    if (result.imageDataUrl) {
      try {
        await extract2DData({ silent: true, force: true });
      } catch (error) {
        extractionError = error;
      }
    }

    if (result.warning) {
      setStatus(
        `${result.warning} Modelo atual: ${result.model}.`,
        "warn"
      );
    } else if (extractionError) {
      setStatus(
        `Planta 2D gerada com modelo ${result.model}, mas a extracao JSON falhou: ${extractionError.message}`,
        "warn"
      );
    } else {
      const extractionModel = latestExtractionMeta?.model
        ? ` Extracao JSON: ${latestExtractionMeta.model}.`
        : "";
      const cleanupNote = latestPlan2DSanitizeInfo.cropped
        ? " Painel lateral removido automaticamente da imagem de referencia."
        : "";
      setStatus(
        `Renderizacao 2D concluida com modelo ${result.model}.${extractionModel}${cleanupNote}`,
        "ok"
      );
    }
  } catch (error) {
    setStatus(error.message || "Falha ao renderizar planta 2D.", "error");
  }
});

render3dBtn.addEventListener("click", async () => {
  if (!latestGeneratedData?.prompts?.plan3DTotal) {
    setStatus("Gere o pacote antes de renderizar o 3D.", "error");
    return;
  }

  try {
    render3dBtn.disabled = true;
    setStatus("Gerando 3D total e comodos...", "");

    if (!latestPlan2DImageDataUrl) {
      setStatus("Gerando primeiro a planta 2D de referencia para ancorar o 3D...", "");
      const base2DResult = await render2DPlan({ silent: true });

      if (!base2DResult.imageDataUrl) {
        throw new Error("Nao foi possivel obter imagem 2D de referencia para gerar o 3D.");
      }
    }

    setStatus("Extraindo JSON da planta 2D para basear todo o 3D sem alucinacao...", "");
    await extract2DData({ silent: true });
    latestProjectConsistencyLock = buildProjectConsistencyLock();
    latestProjectAnchor3DImageDataUrl = "";
    latestRoomInteriorAnchorsByKey = {};
    latestRoomCardByKey = {};

    render3dOutput.hidden = false;
    render3dRoomsList.innerHTML = "";

    let warnings = 0;
    let errors = 0;

    setStatus("Renderizando 3D total...", "");
    try {
      const totalPrompt = latest3DTotalPrompt || latestGeneratedData.prompts.plan3DTotal;
      const totalResult = await render3DItemWithRetry(
        totalPrompt,
        "Volume total da casa",
        {
          consistencyLock: latestProjectConsistencyLock,
          renderKind: "total-exterior",
          additionalReferenceImageDataUrls: []
        }
      );

      applyRenderResultToCard(
        totalResult,
        render3dTotalImage,
        render3dTotalText,
        "A API nao retornou texto para o 3D total."
      );

      if (totalResult.warning) {
        warnings += 1;
      }

      if (!totalResult.imageDataUrl) {
        throw new Error(
          "O 3D total nao retornou imagem. Sem imagem ancora nao e possivel manter consistencia entre fachada e comodos."
        );
      }

      latest3DTotalPrompt = totalPrompt;
      prompt3dTotalEl.value = totalPrompt;
      latestProjectAnchor3DImageDataUrl = totalResult.imageDataUrl;
    } catch (error) {
      errors += 1;
      render3dTotalImage.hidden = true;
      render3dTotalImage.removeAttribute("src");
      render3dTotalText.textContent = error.message || "Falha no 3D total.";
      throw new Error(
        "Falha ao gerar o 3D total ancora. Refaça para garantir consistencia entre todas as imagens."
      );
    }

    if (ENABLE_FACADE_RENDER) {
      setStatus("Renderizando fachada 3D...", "");
      try {
        const facadePrompt = latest3DFacadePrompt || latestGeneratedData.prompts.facade3D;
        const facadeResult = await render3DItemWithRetry(
          facadePrompt,
          "Fachada principal",
          {
            consistencyLock: latestProjectConsistencyLock,
            renderKind: "facade-exterior",
            additionalReferenceImageDataUrls: latestProjectAnchor3DImageDataUrl
              ? [latestProjectAnchor3DImageDataUrl]
              : []
          }
        );

        applyRenderResultToCard(
          facadeResult,
          render3dFacadeImage,
          render3dFacadeText,
          "A API nao retornou texto para a fachada 3D."
        );

        if (facadeResult.warning) {
          warnings += 1;
        }

        latest3DFacadePrompt = facadePrompt;
        promptFacadeEl.value = facadePrompt;
      } catch (error) {
        errors += 1;
        render3dFacadeImage.hidden = true;
        render3dFacadeImage.removeAttribute("src");
        render3dFacadeText.textContent = error.message || "Falha na fachada 3D.";
      }
    } else {
      render3dFacadeImage.hidden = true;
      render3dFacadeImage.removeAttribute("src");
      render3dFacadeText.textContent =
        "Render de fachada desativado para evitar duplicidade com o 3D total.";

      if (render3dFacadeCard) {
        render3dFacadeCard.hidden = true;
      }
    }

    const roomPrompts = resolveRoomPromptsFromExtraction();

    for (let index = 0; index < roomPrompts.length; index += 1) {
      const roomPrompt = roomPrompts[index];
      const roomName = String(roomPrompt.room || `Comodo ${index + 1}`);
      const prompt = String(roomPrompt.prompt || "").trim();

      if (index > 0) {
        await sleep(250);
      }

      setStatus(`Renderizando comodo ${index + 1} de ${roomPrompts.length}: ${roomName}...`, "");

      if (!prompt) {
        errors += 1;
        upsertRoomRenderCard(roomName, null, "Prompt de comodo vazio.", () => {
          editRoomRenderImage(roomName);
        });
        continue;
      }

      try {
        setRoomPromptForName(roomName, prompt);
        const roomResult = await render3DItemWithRetry(
          prompt,
          `Comodo ${roomName}`,
          {
            consistencyLock: latestProjectConsistencyLock,
            renderKind: "room-interior",
            additionalReferenceImageDataUrls: buildRoomReferenceImages(roomName)
          }
        );
        upsertRoomRenderCard(roomName, roomResult, null, () => {
          editRoomRenderImage(roomName);
        });

        if (roomResult.imageDataUrl) {
          latestRoomInteriorAnchorsByKey[normalizeRoomKey(roomName)] = roomResult.imageDataUrl;
        }

        if (roomResult.warning) {
          warnings += 1;
        }
      } catch (error) {
        errors += 1;
        upsertRoomRenderCard(roomName, null, error.message || "Falha ao renderizar este comodo.", () => {
          editRoomRenderImage(roomName);
        });
      }
    }

    if (errors > 0) {
      setStatus(
        "Pacote 3D concluido com alguns erros. Os itens restantes foram exibidos normalmente.",
        "warn"
      );
    } else if (warnings > 0) {
      setStatus("Pacote 3D concluido com fallback local em alguns itens.", "warn");
    } else {
      setStatus("Pacote 3D completo gerado com sucesso.", "ok");
    }
  } catch (error) {
    setStatus(error.message || "Falha ao renderizar pacote 3D.", "error");
  } finally {
    render3dBtn.disabled = false;
  }
});
