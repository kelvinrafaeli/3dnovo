require("dotenv").config();

const express = require("express");
const path = require("path");

const { createGenerationPackage } = require("./planEngine");
const { renderWithNanoBanana2, extractPlanDataFrom2D } = require("./googleClient");
const { createLocalBlueprintFallback } = require("./localRenderFallback");
const { createLocal3DFallback } = require("./local3dFallback");

const app = express();
const port = Number(process.env.PORT || 3000);
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "25mb";

const strict3DRules = [
  "SER FIEL E RIGOROSAMENTE IGUAL a planta 2D anexada.",
  "Nao adicionar, mover ou remover paredes.",
  "Seguir sempre o prompt mestre da planta 2D e os dados extraidos como fonte principal.",
  "Nao inventar quartos/comodos que nao existam na planta 2D.",
  "Nao inventar portas e janelas em locais nao definidos na planta 2D.",
  "Manter posicao, quantidade e proporcao de portas e janelas exatamente como na planta 2D.",
  "A imagem final deve mostrar somente visualizacao 3D. Nao exibir planta baixa 2D, cotas, blueprint ou sobreposicoes tecnicas.",
  "Manter tipologia de cobertura, volumetria externa e logica da area externa iguais ao projeto base ja definido."
];

app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "3dnovo-plan-service" });
});

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
    .slice(0, 8);
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
      "TIPO DE RENDER: EXTERNO TOTAL.",
      "Mostre a casa completa em vista externa, com volumetria geral e cobertura definida.",
      "Defina esse render como imagem ancora para manter consistencia da fachada e area externa."
    ];
  }

  if (renderKind === "facade-exterior") {
    return [
      "TIPO DE RENDER: FACHADA EXTERNA.",
      "A fachada deve manter a MESMA cobertura, volumetria e linguagem do render externo total ancora.",
      "Nao alterar tipologia de telhado nem proporcao externa definida no projeto base."
    ];
  }

  if (renderKind === "room-interior") {
    return [
      "TIPO DE RENDER: INTERNO DE COMODO.",
      "Renderizar APENAS ambiente interno do comodo alvo, com camera interna e escala humana.",
      "Nao gerar vista externa da casa, nao mostrar fachada e nao mostrar planta baixa.",
      "Respeitar rigorosamente dimensoes e aberturas do comodo alvo extraidas da planta 2D.",
      "Se houver imagens internas de referencia anexadas, manter exatamente a mesma posicao de portas, janelas e conexao com ambientes adjacentes.",
      "Quando houver conceito aberto com outro ambiente, o ambiente nao foco deve aparecer desfocado/neutralizado para evitar divergencia entre renders."
    ];
  }

  return [
    "TIPO DE RENDER: GENERICO CONTROLADO.",
    "Manter fidelidade total aos dados extraidos da planta 2D e ao lock de consistencia."
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
      temperature: 0.12,
      topP: 0.6,
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

  return [
    "GERAR 3D OBRIGATORIAMENTE COM BASE NOS DADOS EXTRAIDOS DA PLANTA 2D.",
    visualSignature ? `ASSINATURA VISUAL OBRIGATORIA DO PROJETO: ${visualSignature}` : "",
    `Ambiente foco desta imagem: ${label}`,
    ...renderKindRules,
    ...strict3DRules,
    "Nao inventar comodos fora do programa e nao remover comodos existentes.",
    "Programa de ambientes do projeto:",
    roomProgramText,
    includeRoomMetrics ? "" : "",
    includeRoomMetrics ? "CONTRATO DE CONSISTENCIA DO COMODO (OBRIGATORIO):" : "",
    includeRoomMetrics
      ? "As quantidades e posicoes de portas/janelas deste comodo devem permanecer identicas em todos os renders relacionados."
      : "",
    includeRoomMetrics ? "DADOS DO COMODO ALVO (EXTRAIDOS DA PLANTA 2D):" : "",
    includeRoomMetrics ? roomMetricsBlock : "",
    includeRoomMetrics ? "" : "",
    includeRoomMetrics
      ? "DADOS DOS AMBIENTES ADJACENTES (PARA FUNDO/TRANSICAO COERENTE):"
      : "",
    includeRoomMetrics ? adjacentRoomsBlock : "",
    includeRoomMetrics ? "" : "",
    includeRoomMetrics ? integratedRoomConsistencyBlock : "",
    "",
    "Restricoes extras extraidas da planta 2D:",
    extractedStrictConstraints,
    "",
    consistencyLockJson ? "LOCK DE CONSISTENCIA ENTRE IMAGENS (OBRIGATORIO):" : "",
    consistencyLockJson || "",
    consistencyLockJson ? "" : "",
    "DADOS ESTRUTURADOS EXTRAIDOS DA PLANTA 2D (BASE OFICIAL):",
    extractedJson,
    "",
    referencePlanPrompt
      ? `PROMPT MESTRE DA PLANTA 2D (NUNCA CONTRADIZER):\n${referencePlanPrompt}`
      : "",
    "",
    "Tarefa de renderizacao 3D:",
    prompt
  ]
    .filter(Boolean)
    .join("\n");
}

app.post("/api/plan/extract-2d-data", async (req, res) => {
  try {
    const referencePlanImageDataUrl = String(req.body.referencePlanImageDataUrl || "").trim();
    const plan2DPrompt = String(req.body.plan2DPrompt || "").trim();
    const roomProgram = Array.isArray(req.body.roomProgram)
      ? req.body.roomProgram.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!referencePlanImageDataUrl) {
      return res.status(400).json({
        error: "Imagem da planta 2D obrigatoria para extracao de dados."
      });
    }

    const extraction = await extractPlanDataFrom2D({
      referenceImageDataUrl: referencePlanImageDataUrl,
      roomProgram,
      plan2DPrompt
    });

    return res.json({
      ok: true,
      extraction
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.status) ? 502 : 500;
    return res.status(statusCode).json({
      error: error.message || "Falha ao extrair dados da planta 2D."
    });
  }
});

app.post("/api/plan/render-3d-package", async (req, res) => {
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

  if (!totalPrompt) {
    return res.status(400).json({ error: "Prompt 3D total obrigatorio." });
  }

  if (!facadePrompt) {
    return res.status(400).json({ error: "Prompt de fachada 3D obrigatorio." });
  }

  if (roomPrompts.length === 0) {
    return res.status(400).json({ error: "Lista de prompts de comodos 3D obrigatoria." });
  }

  if (!extractedPlanData) {
    return res.status(400).json({
      error: "Dados extraidos da planta 2D obrigatorios para gerar o pacote 3D."
    });
  }

  const roomProgramText = roomProgram.length
    ? roomProgram.map((room) => `- ${room}`).join("\n")
    : "- Programa de ambientes nao informado";

  const limitedRooms = roomPrompts.slice(0, maxRooms).map((room, index) => ({
    room: String(room.room || `Comodo ${index + 1}`),
    prompt: String(room.prompt || "").trim()
  }));

  const total = await renderPromptWithFallback(
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
      referenceImageDataUrls: additionalReferenceImageDataUrls,
      generationConfig: buildGenerationConfigByRenderKind("total-exterior"),
      referenceInstruction: [
        "A imagem anexada e a planta 2D oficial do projeto.",
        "Use essa planta apenas como apoio visual para os dados estruturados extraidos.",
        ...strict3DRules
      ].join("\n")
    }
  );
  const facade = await renderPromptWithFallback(
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
  );

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
          "A imagem anexada e a planta 2D oficial do projeto.",
          "Use essa planta apenas como apoio visual para os dados estruturados extraidos.",
          ...strict3DRules
        ].join("\n")
      }
    );
    rooms.push({ room: room.room, ...roomRender });
  }

  const hasErrors = !total.ok || !facade.ok || rooms.some((item) => !item.ok);

  res.json({
    ok: !hasErrors,
    partial: hasErrors,
    summary: {
      requestedRooms: roomPrompts.length,
      renderedRooms: rooms.length
    },
    results: {
      total,
      facade,
      rooms
    }
  });
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

  const roomProgramText = roomProgram.length
    ? roomProgram.map((room) => `- ${room}`).join("\n")
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

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
