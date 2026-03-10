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
  hasElectricity: z.coerce.boolean()
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

function createGenerationPackage(inputData) {
  const data = terrainFormSchema.parse(inputData);
  const lotMetrics = calculateLotMetrics(data);
  const suggestedRooms = uniqueRooms(suggestRoomsByObjective(data.objective));
  const mandatoryRoomsText = suggestedRooms.map((room) => `- ${room}`).join("\n");
  const contextText = buildContextText(data, lotMetrics);

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
    "Mostrar sombras suaves e iluminacao natural para dar profundidade.",
    "Inclua obrigatoriamente TODOS os ambientes listados abaixo:",
    mandatoryRoomsText,
    "",
    contextText
  ].join("\n");

  const prompt3DTotal = [
    "Crie um modelo 3D completo da planta com volumetria, cobertura e materiais base.",
    "Gerar vista isometrica geral, cortes simplificados e imagem externa da fachada principal.",
    "Estilo realista, iluminacao natural diurna e escala humana.",
    "SER FIEL E RIGOROSAMENTE IGUAL a planta 2D aprovada.",
    "Nao adicionar, mover ou remover paredes.",
    "Nao inventar portas e janelas em locais nao definidos na planta 2D.",
    "Manter posicao, quantidade e proporcao de portas e janelas exatamente como na planta 2D.",
    "O modelo 3D deve incluir obrigatoriamente todos os ambientes abaixo:",
    mandatoryRoomsText,
    "",
    contextText
  ].join("\n");

  const roomPrompts = suggestedRooms.map((roomName) => ({
    room: roomName,
    prompt: [
      `Crie um render 3D INTERNO detalhado do ambiente: ${roomName}.`,
      `Ambientes obrigatorios do projeto (nao omitir no contexto global): ${suggestedRooms.join(", ")}.`,
      "SER FIEL E RIGOROSAMENTE IGUAL a planta 2D aprovada.",
      "NAO INVENTAR quartos/comodos fora do que existe na planta.",
      "Nao inventar portas e janelas em locais nao definidos na planta 2D.",
      "Manter compatibilidade com a planta geral, usando medidas reais do comodo extraidas da planta.",
      "Render interno somente do ambiente foco, com camera dentro do comodo.",
      "Nao renderizar fachada, cobertura externa ou vista aerea nesse render de comodo.",
      "",
      contextText
    ].join("\n")
  }));

  const facadePrompt = [
    "Crie um estudo 3D da fachada principal e secundaria da edificacao.",
    "Entregar volumetria, materiais sugeridos, esquadria e hierarquia visual da entrada.",
    "",
    contextText
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
