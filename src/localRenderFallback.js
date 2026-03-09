function extractRoomsFromPrompt(promptText) {
  const text = String(promptText || "").toLowerCase();
  const dictionary = [
    { key: "sala", label: "Sala" },
    { key: "cozinha", label: "Cozinha" },
    { key: "suite", label: "Suite" },
    { key: "quarto", label: "Quarto" },
    { key: "banheiro", label: "Banheiro" },
    { key: "lavanderia", label: "Lavanderia" },
    { key: "garagem", label: "Garagem" },
    { key: "escritorio", label: "Escritorio" },
    { key: "varanda", label: "Varanda" }
  ];

  const rooms = [];

  for (const item of dictionary) {
    if (text.includes(item.key)) {
      rooms.push(item.label);
    }
  }

  if (rooms.length === 0) {
    return ["Sala", "Cozinha", "Quarto 1", "Quarto 2", "Banheiro", "Area de Servico"];
  }

  const normalized = [];
  const counts = {};

  for (const room of rooms) {
    counts[room] = (counts[room] || 0) + 1;
    const suffix = counts[room] > 1 ? ` ${counts[room]}` : "";
    normalized.push(`${room}${suffix}`);
  }

  return normalized.slice(0, 6);
}

function createGrid() {
  const lines = [];

  for (let x = 0; x <= 1200; x += 40) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="800" stroke="#305f9f" stroke-opacity="0.2" stroke-width="1"/>`);
  }

  for (let y = 0; y <= 800; y += 40) {
    lines.push(`<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#305f9f" stroke-opacity="0.2" stroke-width="1"/>`);
  }

  return lines.join("");
}

function createRoomBlocks(rooms) {
  const templates = [
    { x: 140, y: 140, w: 330, h: 220 },
    { x: 490, y: 140, w: 310, h: 220 },
    { x: 820, y: 140, w: 240, h: 220 },
    { x: 140, y: 380, w: 300, h: 270 },
    { x: 460, y: 380, w: 300, h: 270 },
    { x: 780, y: 380, w: 280, h: 270 }
  ];

  return rooms
    .map((room, index) => {
      const box = templates[index % templates.length];
      return [
        `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="#dbeaff" stroke-width="4"/>`,
        `<text x="${box.x + 16}" y="${box.y + 30}" fill="#e9f2ff" font-size="26" font-family="Arial, sans-serif">${room}</text>`
      ].join("");
    })
    .join("");
}

function buildBlueprintSvg(promptText) {
  const rooms = extractRoomsFromPrompt(promptText);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect x="0" y="0" width="1200" height="800" fill="#0f2b4f"/>
  ${createGrid()}
  <rect x="100" y="100" width="1000" height="600" fill="none" stroke="#f2f8ff" stroke-width="6"/>
  <line x1="100" y1="340" x2="1100" y2="340" stroke="#dbeaff" stroke-width="3" stroke-dasharray="10 8"/>
  <line x1="470" y1="100" x2="470" y2="700" stroke="#dbeaff" stroke-width="3" stroke-dasharray="10 8"/>
  ${createRoomBlocks(rooms)}
  <text x="110" y="70" fill="#ffffff" font-size="32" font-family="Arial, sans-serif">PLANTA 2D - FALLBACK LOCAL</text>
  <text x="780" y="70" fill="#b8d6ff" font-size="20" font-family="Arial, sans-serif">ESCALA APROXIMADA 1:100</text>
  <text x="850" y="740" fill="#b8d6ff" font-size="18" font-family="Arial, sans-serif">NORTE</text>
  <polygon points="1060,740 1038,780 1082,780" fill="#f2f8ff"/>
</svg>
`.trim();
}

function createLocalBlueprintFallback(promptText, retryAfterSeconds) {
  const svg = buildBlueprintSvg(promptText);
  const base64 = Buffer.from(svg, "utf8").toString("base64");
  const retryInfo = retryAfterSeconds
    ? `Tente novamente em cerca de ${retryAfterSeconds}s.`
    : "Tente novamente quando sua quota estiver disponivel.";

  return {
    model: "local-blueprint-fallback",
    usedFallback: true,
    usedQuotaFallback: true,
    text: [
      "A API Google atingiu o limite de quota e foi aplicado fallback local de blueprint.",
      "A imagem abaixo e um esboco tecnico inicial para manter o fluxo de trabalho.",
      retryInfo,
      "Assim que a quota normalizar, clique novamente em renderizar para gerar via modelo remoto."
    ].join("\n"),
    warning: "Quota da API excedida. Render 2D local aplicado temporariamente.",
    imageDataUrl: `data:image/svg+xml;base64,${base64}`
  };
}

module.exports = {
  createLocalBlueprintFallback
};
