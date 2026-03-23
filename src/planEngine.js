const { z } = require("zod");

const terrainFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo é obrigatório."),
  document: z.string().trim().min(11, "CPF/CNPJ inválido."),
  budgetRange: z.string().trim().min(1, "Selecione uma faixa de orçamento."),
  objective: z.string().trim().min(1, "Selecione o objetivo principal."),
  cep: z.string().trim().min(8, "CEP é obrigatório."),
  street: z.string().trim().min(2, "Rua é obrigatória."),
  number: z.string().trim().min(1, "Número é obrigatório."),
  neighborhood: z.string().trim().min(2, "Bairro é obrigatório."),
  city: z.string().trim().min(2, "Cidade é obrigatória."),
  state: z.string().trim().min(2, "Estado é obrigatório."),
  terrainType: z.string().trim().min(1, "Tipo de terreno é obrigatório."),
  frontMeters: z.coerce.number().positive("Frente deve ser maior que zero."),
  backMeters: z.coerce.number().positive("Fundos deve ser maior que zero."),
  rightMeters: z.coerce.number().positive("Lateral direita deve ser maior que zero."),
  leftMeters: z.coerce.number().positive("Lateral esquerda deve ser maior que zero."),
  topography: z.string().trim().min(1, "Selecione a topografia."),
  soilType: z.string().trim().min(1, "Selecione o tipo de solo."),
  leftNeighbor: z.string().trim().min(1, "Selecione o vizinho da esquerda."),
  rightNeighbor: z.string().trim().min(1, "Selecione o vizinho da direita."),
  backNeighbor: z.string().trim().min(1, "Selecione o vizinho dos fundos."),
  hasWater: z.coerce.boolean(),
  hasSewer: z.coerce.boolean(),
  hasElectricity: z.coerce.boolean(),
  architecturalStyle: z.string().trim().optional()
});

function calculateLotMetrics(data) {
  const widthMeters = Number((((data.frontMeters + data.backMeters) / 2)).toFixed(2));
  const depthMeters = Number((((data.rightMeters + data.leftMeters) / 2)).toFixed(2));
  const areaM2 = Number((widthMeters * depthMeters).toFixed(2));

  return {
    widthMeters,
    depthMeters,
    areaM2
  };
}

function suggestRoomsByObjective(objective) {
  const normalized = objective.toLowerCase();

  if (normalized.includes("comercial")) {
    return [
      "Recepcao",
      "Area principal de atendimento",
      "Sala administrativa",
      "Copa",
      "Banheiro PCD",
      "Estoque",
      "Banheiro de apoio"
    ];
  }

  if (normalized.includes("aluguel") || normalized.includes("investimento")) {
    return [
      "Sala e cozinha integradas",
      "Quarto 1",
      "Quarto 2",
      "Banheiro social",
      "Area de servico",
      "Varanda"
    ];
  }

  return [
    "Sala de estar",
    "Sala de jantar",
    "Cozinha",
    "Quarto 1 (suite)",
    "Quarto 2",
    "Banheiro social",
    "Lavanderia",
    "Garagem"
  ];
}

function uniqueRooms(roomList) {
  const seen = new Set();
  const normalized = [];

  for (const room of roomList) {
    const key = String(room || "").trim().toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(String(room).trim());
  }

  return normalized;
}

function getStyleDescriptor(style) {
  const descriptors = {
    japandi: "Estilo Japandi: fusao de minimalismo japones com design escandinavo. Use madeira clara de carvalho, tons neutros (bege, cinza claro, branco), linhas limpas, moveis baixos, iluminacao suave e natural, plantas discretas, texturas organicas como linho e ceramica.",
    moderno: "Estilo Moderno: design contemporaneo com linhas retas e geometricas. Use concreto aparente, vidro, aco escovado, tons de cinza com pontos de cor, iluminacao embutida, pe-direito alto, espacos abertos e integrados, moveis de design com formas limpas.",
    minimalista: 'Estilo Minimalista: filosofia "menos e mais". Use paleta monocromatica (branco, off-white, cinza claro), moveis essenciais sem ornamentos, linhas puras, superficies lisas, iluminacao difusa, espacos amplos e livres, armazenamento embutido e oculto.',
    rustico: "Estilo Rustico: integracao com a natureza. Use madeira robusta escura (peroba, ipe), pedra natural nas paredes, cores terrosas (marrom, verde musgo, terracota), vigas aparentes no teto, lareiras, plantas abundantes, tecidos naturais como algodao cru e juta, iluminacao quente e acolhedora."
  };
  return descriptors[(style || "").toLowerCase()] || "";
}

function buildContextText(data, lotMetrics) {
  return [
    "DADOS DO CLIENTE:",
    `- Nome: ${data.fullName}`,
    `- Documento: ${data.document}`,
    `- Orcamento estimado: ${data.budgetRange}`,
    `- Objetivo principal: ${data.objective}`,
    "",
    "LOCALIZACAO:",
    `- CEP: ${data.cep}`,
    `- Endereco: ${data.street}, ${data.number} - ${data.neighborhood}, ${data.city}/${data.state}`,
    `- Tipo de terreno: ${data.terrainType}`,
    "",
    "CARACTERISTICAS TECNICAS:",
    `- Frente: ${data.frontMeters} m`,
    `- Fundos: ${data.backMeters} m`,
    `- Lateral direita: ${data.rightMeters} m`,
    `- Lateral esquerda: ${data.leftMeters} m`,
    `- Largura de referencia do lote (media frente/fundos): ${lotMetrics.widthMeters} m`,
    `- Profundidade de referencia do lote (media laterais): ${lotMetrics.depthMeters} m`,
    `- Area calculada obrigatoria do lote (largura x profundidade): ${lotMetrics.widthMeters} x ${lotMetrics.depthMeters} = ${lotMetrics.areaM2} m2`,
    "- REGRA OBRIGATORIA: nao inventar area (ex.: 300 m2). Sempre usar a area calculada acima.",
    `- Topografia: ${data.topography}`,
    `- Tipo de solo: ${data.soilType}`,
    "",
    "VIZINHANCA:",
    `- Esquerda: ${data.leftNeighbor}`,
    `- Direita: ${data.rightNeighbor}`,
    `- Fundos: ${data.backNeighbor}`,
    "",
    "INFRAESTRUTURA:",
    `- Ponto de agua: ${data.hasWater ? "sim" : "nao"}`,
    `- Ponto de esgoto: ${data.hasSewer ? "sim" : "nao"}`,
    `- Ponto de eletricidade: ${data.hasElectricity ? "sim" : "nao"}`
  ].join("\n");
}

function buildRenderContextText(data, lotMetrics) {
  return [
    "PARAMETROS ARQUITETONICOS PARA COMPOSICAO VISUAL (NAO RENDERIZAR COMO TEXTO):",
    `- Objetivo do projeto: ${data.objective}`,
    `- Tipo de terreno: ${data.terrainType}`,
    `- Frente: ${data.frontMeters} m`,
    `- Fundos: ${data.backMeters} m`,
    `- Lateral direita: ${data.rightMeters} m`,
    `- Lateral esquerda: ${data.leftMeters} m`,
    `- Largura media de referencia: ${lotMetrics.widthMeters} m`,
    `- Profundidade media de referencia: ${lotMetrics.depthMeters} m`,
    `- Area calculada obrigatoria do lote: ${lotMetrics.areaM2} m2`,
    `- Topografia: ${data.topography}`,
    `- Tipo de solo: ${data.soilType}`,
    `- Infraestrutura: agua=${data.hasWater ? "sim" : "nao"}, esgoto=${data.hasSewer ? "sim" : "nao"}, energia=${data.hasElectricity ? "sim" : "nao"}`
  ].join("\n");
}

function createGenerationPackage(inputData) {
  const data = terrainFormSchema.parse(inputData);
  const lotMetrics = calculateLotMetrics(data);
  const suggestedRooms = uniqueRooms(suggestRoomsByObjective(data.objective));
  const mandatoryRoomsText = suggestedRooms.map((room) => `- ${room}`).join("\n");
  const contextText = buildContextText(data, lotMetrics);
  const renderContextText = buildRenderContextText(data, lotMetrics);
  const styleText = getStyleDescriptor(data.architecturalStyle);

  const prompt2DTechnical = [
    "Voce e um arquiteto especializado em plantas tecnicas brasileiras.",
    "Com base no contexto abaixo, gere uma planta 2D humanizada extremamente detalhada.",
    "Inclua cotas, circulacao, espessura de paredes, nome de comodos, portas, janelas, recuos e orientacao norte.",
    "Responda em JSON com as chaves: conceito, programa_ambientes, diretrizes_tecnicas, observacoes_normativas.",
    "",
    contextText
  ].join("\n");

  const prompt2DRender = [
    "Renderize uma planta baixa 2D HUMANIZADA (humanized floor plan) com visual arquitetonico de apresentacao.",
    "Estilo: planta humanizada com cores suaves, texturas de piso por ambiente, mobiliario representativo (camas, sofas, mesas, pias, vasos sanitarios) e vegetacao decorativa.",
    "Use paleta de cores quentes e acolhedoras: tons de bege, madeira, cinza claro e verde suave para jardim.",
    "Paredes com espessura visivel em tom escuro. Portas e janelas representadas de forma realista.",
    "Inclua nomes dos comodos em portugues com fonte elegante e legivel.",
    "Mantenha proporcao realista, escala coerente e alta nitidez.",
    "NAO usar estilo blueprint/tecnico. NAO usar fundo azul escuro. NAO mostrar cotas com linhas de chamada.",
    "Imagem LIMPA: sem quadro lateral, sem tabela, sem carimbo, sem bloco de briefing e sem legenda tecnica externa.",
    "PROIBIDO inserir na imagem dados de cliente, documento, CEP, endereco, orcamento, objetivo, medidas em caixa de texto, topografia, solo, vizinhanca ou infraestrutura.",
    "Nao incluir nenhum texto fora dos nomes dos comodos.",
    "Mostrar sombras suaves e iluminacao natural para dar profundidade.",
    styleText ? styleText : "",
    "Inclua obrigatoriamente TODOS os ambientes listados abaixo:",
    mandatoryRoomsText,
    "",
    renderContextText
  ].join("\n");

  const prompt3DTotal = [
    "Generate a PHOTOREALISTIC 3D ARCHITECTURAL MODEL of this house as a CUTAWAY ISOMETRIC VIEW with the ROOF COMPLETELY REMOVED.",
    "",
    "CRITICAL — THIS MUST BE A TRUE 3D RENDER, NOT A 2D FLOOR PLAN:",
    "- The camera MUST be at a 30-45 degree angle from above (isometric perspective), NOT directly overhead.",
    "- All walls MUST have visible HEIGHT (2.8m to 3m tall) with THICKNESS, casting real shadows.",
    "- All furniture and objects MUST be 3D models with volume, depth, and realistic proportions — NOT flat 2D icons or symbols.",
    "- The floor planes of each room must show PERSPECTIVE DEPTH with vanishing points.",
    "- External walls must show material texture (concrete, brick, plaster) with 3D depth.",
    "- The result should look like a PHYSICAL ARCHITECTURAL SCALE MODEL (maquete) photographed from above at an angle.",
    "",
    "WHAT TO SHOW:",
    "- Complete house structure with all rooms visible from above (roof removed).",
    "- 3D furniture inside each room: beds, sofas, tables, chairs, kitchen counters — all with realistic 3D volume.",
    "- Floor textures (wood, tile, marble) with perspective distortion.",
    "- Exterior landscape: grass, trees, driveway, walkways in 3D.",
    "- Natural daylight illumination from the side with soft shadows on walls and furniture.",
    "",
    "WHAT NOT TO DO:",
    "- Do NOT generate a flat 2D floor plan or top-down orthographic view.",
    "- Do NOT use flat colored rectangles for furniture — use 3D modeled objects.",
    "- Do NOT add text labels, room names, dimensions, or any annotations.",
    "- Do NOT add watermarks, borders, or side panels.",
    "",
    styleText ? `Architectural style: ${styleText}.` : "",
    "The layout, room positions, wall placement, doors and windows must EXACTLY match the 2D reference floor plan provided.",
    "Include all rooms listed below:",
    mandatoryRoomsText,
    "",
    renderContextText
  ].join("\n");

  const roomPrompts = suggestedRooms.map((roomName) => ({
    room: roomName,
    prompt: [
      `Generate a PHOTOREALISTIC 3D INTERIOR RENDER of the room: ${roomName}.`,
      "",
      "CRITICAL — THIS MUST BE A 3D INTERIOR PHOTOGRAPH, NOT A FLOOR PLAN:",
      "- Camera position: INSIDE the room at human eye level (1.5-1.7m height), looking across the space.",
      "- Show walls with full HEIGHT and real material textures (paint, tile, wood paneling).",
      "- Show ceiling with lighting fixtures visible.",
      "- Show floor with realistic textures (hardwood, tile, marble) in PERSPECTIVE.",
      "- All furniture and objects must be 3D models with VOLUME and realistic proportions.",
      "- Natural daylight illumination through windows, with soft shadows.",
      "",
      "WHAT NOT TO DO:",
      "- Do NOT generate a top-down floor plan view or bird's eye view.",
      "- Do NOT use flat 2D furniture symbols or icons.",
      "- Do NOT show the room from above — the camera must be INSIDE the room.",
      "- Do NOT render exterior views, roof, or aerial perspectives.",
      "- Do NOT add text, labels, dimensions, watermarks, or annotations.",
      "",
      styleText ? `Architectural style: ${styleText}.` : "",
      "Maintain the exact room layout, dimensions, doors, and windows from the reference floor plan.",
      `Project rooms for context: ${suggestedRooms.join(", ")}.`,
      "",
      renderContextText
    ].join("\n")
  }));

  const facadePrompt = [
    "Crie um estudo 3D da fachada principal e secundaria da edificacao.",
    "Entregar volumetria, materiais sugeridos, esquadria e hierarquia visual da entrada.",
    "Imagem LIMPA: sem texto, sem quadro lateral, sem tabela, sem carimbo, sem legenda e sem watermark.",
    "",
    renderContextText
  ].join("\n");

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      client: data.fullName,
      objective: data.objective,
      budgetRange: data.budgetRange,
      location: `${data.city}/${data.state}`,
      estimatedAreaM2: lotMetrics.areaM2
    },
    roomProgram: suggestedRooms,
    formData: data,
    prompts: {
      plan2DTechnical: prompt2DTechnical,
      plan2DRenderNanoBanana2: prompt2DRender,
      plan3DTotal: prompt3DTotal,
      plan3DRooms: roomPrompts,
      facade3D: facadePrompt
    }
  };
}

module.exports = {
  terrainFormSchema,
  createGenerationPackage
};
