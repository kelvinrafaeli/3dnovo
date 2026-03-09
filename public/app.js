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
const render3dOutput = document.getElementById("render-3d-output");
const render3dTotalImage = document.getElementById("render-3d-total-image");
const render3dTotalText = document.getElementById("render-3d-total-text");
const render3dFacadeImage = document.getElementById("render-3d-facade-image");
const render3dFacadeText = document.getElementById("render-3d-facade-text");
const render3dRoomsList = document.getElementById("render-3d-rooms-list");
const extractionBlock = document.getElementById("extract-output-block");
const extractionOutput = document.getElementById("extract-output");

let latestGeneratedData = null;
let latestPlan2DImageDataUrl = "";
let latestExtractedPlanData = null;
let latestExtractionMeta = null;
let latestProjectConsistencyLock = null;
let latestProjectAnchor3DImageDataUrl = "";
let latestRoomInteriorAnchorsByKey = {};

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
  resultsCard.hidden = false;
  render3dOutput.hidden = true;
  render3dRoomsList.innerHTML = "";
  extractionBlock.hidden = true;
  extractionOutput.textContent = "";

  summaryOutput.textContent = JSON.stringify(payload.summary, null, 2);
  prompt2dEl.value = payload.prompts.plan2DRenderNanoBanana2;
  prompt3dTotalEl.value = payload.prompts.plan3DTotal;
  promptFacadeEl.value = payload.prompts.facade3D;

  const roomsText = payload.prompts.plan3DRooms
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
    }
  }

  refs.push(...Object.values(latestRoomInteriorAnchorsByKey));

  if (latestProjectAnchor3DImageDataUrl) {
    refs.push(latestProjectAnchor3DImageDataUrl);
  }

  return uniqueDataUrls(refs).slice(0, 8);
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

  const strictRules = [
    "Todas as imagens 3D pertencem ao MESMO projeto e devem manter a mesma volumetria.",
    "Cobertura/telhado devem ser identicos entre volume geral e fachada.",
    "Seguir sempre o prompt mestre da planta 2D e as medidas extraidas.",
    "Nao inventar quartos/comodos que nao existam na planta.",
    "Nao inventar novas portas/janelas nem mudar posicao das existentes.",
    "Manter logica da area externa ja definida na imagem de volume total.",
    "Nao exibir planta baixa, cotas ou overlays nas imagens finais 3D."
  ];

  const signaturePayload = {
    objective: latestGeneratedData?.summary?.objective || null,
    roomProgram: latestGeneratedData?.roomProgram || [],
    lot: latestExtractedPlanData?.lot || null,
    openings: latestExtractedPlanData?.openings_global || null,
    rooms
  };

  const visualSignature = computeVisualProjectSignature(signaturePayload);

  return {
    projectId: latestGeneratedData?.generatedAt || new Date().toISOString(),
    objective: latestGeneratedData?.summary?.objective || null,
    visualSignature,
    strictRules,
    extractedSummary: {
      overall: latestExtractedPlanData?.overall || null,
      lot: latestExtractedPlanData?.lot || null,
      dimensionsAndQuotas: latestExtractedPlanData?.dimensions_and_quotas || [],
      openingsGlobal: latestExtractedPlanData?.openings_global || null,
      rooms
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

function createRoomRenderCard(roomName, roomResult, errorMessage) {
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

  card.appendChild(title);
  card.appendChild(image);
  card.appendChild(text);
  return card;
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

  const response = await fetch("/api/plan/render-3d-item", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      label,
      referencePlanImageDataUrl: latestPlan2DImageDataUrl,
      additionalReferenceImageDataUrls: options.additionalReferenceImageDataUrls || [],
      referencePlanPrompt: latestGeneratedData?.prompts?.plan2DRenderNanoBanana2 || "",
      roomProgram,
      extractedPlanData: latestExtractedPlanData,
      consistencyLock: options.consistencyLock || latestProjectConsistencyLock,
      renderKind: options.renderKind || "generic"
    })
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
    setStatus("Extraindo medidas, cotas, portas e janelas da planta 2D...", "");
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
      plan2DPrompt: latestGeneratedData?.prompts?.plan2DRenderNanoBanana2 || "",
      roomProgram
    })
  });

  const data = await readApiResponse(response, "Falha ao extrair dados da planta 2D.");
  renderExtractedData(data.extraction);
  return data.extraction;
}

async function render2DPlan({ silent = false } = {}) {
  if (!latestGeneratedData?.prompts?.plan2DRenderNanoBanana2) {
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
      prompt: latestGeneratedData.prompts.plan2DRenderNanoBanana2
    })
  });

  const data = await readApiResponse(response, "Falha na renderizacao 2D.");

  renderOutput.hidden = false;
  renderText.textContent = data.result.text || "A API nao retornou texto para esta chamada.";

  if (data.result.imageDataUrl) {
    latestPlan2DImageDataUrl = data.result.imageDataUrl;
    renderImage.src = data.result.imageDataUrl;
    renderImage.hidden = false;
  } else {
    latestPlan2DImageDataUrl = "";
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
        `Planta 2D gerada com modelo ${result.model}, mas a extracao tecnica falhou: ${extractionError.message}`,
        "warn"
      );
    } else {
      const extractionModel = latestExtractionMeta?.model
        ? ` Extracao tecnica: ${latestExtractionMeta.model}.`
        : "";
      setStatus(`Renderizacao 2D concluida com modelo ${result.model}.${extractionModel}`, "ok");
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
    setStatus("Gerando 3D total, fachada e comodos...", "");

    if (!latestPlan2DImageDataUrl) {
      setStatus("Gerando primeiro a planta 2D de referencia para ancorar o 3D...", "");
      const base2DResult = await render2DPlan({ silent: true });

      if (!base2DResult.imageDataUrl) {
        throw new Error("Nao foi possivel obter imagem 2D de referencia para gerar o 3D.");
      }
    }

    setStatus("Extraindo dados estruturados da planta 2D para basear todo o 3D...", "");
    await extract2DData({ silent: true });
    latestProjectConsistencyLock = buildProjectConsistencyLock();
    latestProjectAnchor3DImageDataUrl = "";
    latestRoomInteriorAnchorsByKey = {};

    render3dOutput.hidden = false;
    render3dRoomsList.innerHTML = "";

    let warnings = 0;
    let errors = 0;

    setStatus("Renderizando 3D total...", "");
    try {
      const totalResult = await render3DItemWithRetry(
        latestGeneratedData.prompts.plan3DTotal,
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

    setStatus("Renderizando fachada 3D...", "");
    try {
      const facadeResult = await render3DItemWithRetry(
        latestGeneratedData.prompts.facade3D,
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
    } catch (error) {
      errors += 1;
      render3dFacadeImage.hidden = true;
      render3dFacadeImage.removeAttribute("src");
      render3dFacadeText.textContent = error.message || "Falha na fachada 3D.";
    }

    const roomPrompts = Array.isArray(latestGeneratedData.prompts.plan3DRooms)
      ? latestGeneratedData.prompts.plan3DRooms
      : [];

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
        render3dRoomsList.appendChild(
          createRoomRenderCard(roomName, null, "Prompt de comodo vazio.")
        );
        continue;
      }

      try {
        const roomResult = await render3DItemWithRetry(
          prompt,
          `Comodo ${roomName}`,
          {
            consistencyLock: latestProjectConsistencyLock,
            renderKind: "room-interior",
            additionalReferenceImageDataUrls: buildRoomReferenceImages(roomName)
          }
        );
        render3dRoomsList.appendChild(createRoomRenderCard(roomName, roomResult, null));

        if (roomResult.imageDataUrl) {
          latestRoomInteriorAnchorsByKey[normalizeRoomKey(roomName)] = roomResult.imageDataUrl;
        }

        if (roomResult.warning) {
          warnings += 1;
        }
      } catch (error) {
        errors += 1;
        render3dRoomsList.appendChild(
          createRoomRenderCard(
            roomName,
            null,
            error.message || "Falha ao renderizar este comodo."
          )
        );
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
