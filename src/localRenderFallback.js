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

function roomFillColor(label) {
  const key = label.toLowerCase();
  if (key.includes("sala")) return "#f5ede3";
  if (key.includes("cozinha")) return "#fbe8d3";
  if (key.includes("suite") || key.includes("quarto")) return "#e8e4f0";
  if (key.includes("banheiro")) return "#d9eef7";
  if (key.includes("lavanderia") || key.includes("servico")) return "#e2eede";
  if (key.includes("garagem")) return "#e6e6e6";
  if (key.includes("varanda")) return "#e8f0d8";
  if (key.includes("escritorio")) return "#f0e8d8";
  if (key.includes("recepcao") || key.includes("atendimento")) return "#f5ede3";
  if (key.includes("estoque") || key.includes("copa")) return "#eae6de";
  return "#f0ebe2";
}

function roomFurnitureSvg(label, x, y, w, h) {
  const key = label.toLowerCase();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pieces = [];

  if (key.includes("sala")) {
    // sofa
    pieces.push(`<rect x="${cx - 50}" y="${cy - 10}" width="100" height="30" rx="6" fill="#c8b89a" opacity="0.7"/>`);
    // mesa de centro
    pieces.push(`<rect x="${cx - 20}" y="${cy + 28}" width="40" height="24" rx="3" fill="#bba88a" opacity="0.6"/>`);
  } else if (key.includes("cozinha")) {
    // bancada
    pieces.push(`<rect x="${x + 12}" y="${y + 14}" width="${w - 24}" height="18" rx="2" fill="#d4c4a8" opacity="0.6"/>`);
    // pia (circulo)
    pieces.push(`<circle cx="${x + 40}" cy="${y + 23}" r="6" fill="#e0dcd4" opacity="0.7"/>`);
    // fogao
    pieces.push(`<rect x="${cx + 10}" y="${y + 14}" width="24" height="16" rx="2" fill="#a09080" opacity="0.5"/>`);
  } else if (key.includes("suite") || key.includes("quarto")) {
    // cama
    pieces.push(`<rect x="${cx - 30}" y="${cy - 22}" width="60" height="44" rx="5" fill="#c8b89a" opacity="0.6"/>`);
    // travesseiro
    pieces.push(`<rect x="${cx - 24}" y="${cy - 18}" width="48" height="10" rx="4" fill="#e0d8cc" opacity="0.7"/>`);
    // criado mudo
    pieces.push(`<rect x="${cx + 36}" y="${cy - 10}" width="14" height="14" rx="2" fill="#bba88a" opacity="0.5"/>`);
  } else if (key.includes("banheiro")) {
    // vaso
    pieces.push(`<ellipse cx="${cx - 20}" cy="${cy + 10}" rx="10" ry="14" fill="#e8e4e0" opacity="0.7"/>`);
    // pia
    pieces.push(`<rect x="${cx + 8}" y="${cy - 16}" width="26" height="18" rx="4" fill="#e0dcd4" opacity="0.7"/>`);
    // box
    pieces.push(`<rect x="${x + 10}" y="${y + 10}" width="${Math.min(w * 0.4, 80)}" height="${Math.min(h * 0.4, 70)}" rx="2" fill="#d0e8f0" opacity="0.35" stroke="#a0c0d0" stroke-width="1" stroke-dasharray="4 3"/>`);
  } else if (key.includes("garagem")) {
    // carro simplificado
    pieces.push(`<rect x="${cx - 32}" y="${cy - 18}" width="64" height="36" rx="10" fill="#ccc" opacity="0.4"/>`);
    pieces.push(`<rect x="${cx - 24}" y="${cy - 10}" width="48" height="20" rx="6" fill="#bbb" opacity="0.35"/>`);
  } else if (key.includes("lavanderia") || key.includes("servico")) {
    // maquina lavar
    pieces.push(`<rect x="${cx - 14}" y="${cy - 14}" width="28" height="28" rx="4" fill="#d6d6d6" opacity="0.6"/>`);
    pieces.push(`<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#bbb" stroke-width="1.5" opacity="0.5"/>`);
  } else if (key.includes("varanda")) {
    // mesa redonda + cadeiras
    pieces.push(`<circle cx="${cx}" cy="${cy}" r="14" fill="#c8b89a" opacity="0.5"/>`);
    pieces.push(`<circle cx="${cx - 22}" cy="${cy}" r="7" fill="#bba88a" opacity="0.4"/>`);
    pieces.push(`<circle cx="${cx + 22}" cy="${cy}" r="7" fill="#bba88a" opacity="0.4"/>`);
    // vaso de planta
    pieces.push(`<circle cx="${x + 20}" cy="${y + 20}" r="9" fill="#8cb870" opacity="0.5"/>`);
  }

  return pieces.join("");
}

function createFloorTexture(roomLabel, x, y, w, h) {
  const key = roomLabel.toLowerCase();
  const lines = [];

  if (key.includes("banheiro")) {
    // azulejo grid
    for (let tx = x + 6; tx < x + w - 4; tx += 16) {
      for (let ty = y + 6; ty < y + h - 4; ty += 16) {
        lines.push(`<rect x="${tx}" y="${ty}" width="14" height="14" fill="none" stroke="#c0d8e0" stroke-width="0.5" opacity="0.35"/>`);
      }
    }
  } else if (key.includes("cozinha") || key.includes("lavanderia") || key.includes("servico")) {
    // piso ceramico diagonal
    for (let tx = x + 4; tx < x + w - 4; tx += 22) {
      for (let ty = y + 4; ty < y + h - 4; ty += 22) {
        lines.push(`<rect x="${tx}" y="${ty}" width="20" height="20" fill="none" stroke="#d8d0c0" stroke-width="0.4" opacity="0.3"/>`);
      }
    }
  } else if (key.includes("garagem")) {
    // piso cimento
    for (let tx = x; tx < x + w; tx += 30) {
      lines.push(`<line x1="${tx}" y1="${y}" x2="${tx}" y2="${y + h}" stroke="#d0d0d0" stroke-width="0.3" opacity="0.3"/>`);
    }
  } else {
    // piso madeira (linhas horizontais)
    for (let ty = y + 8; ty < y + h - 4; ty += 12) {
      lines.push(`<line x1="${x + 4}" y1="${ty}" x2="${x + w - 4}" y2="${ty}" stroke="#ddd0b8" stroke-width="0.6" opacity="0.3"/>`);
    }
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
      const fill = roomFillColor(room);
      return [
        // sombra suave
        `<rect x="${box.x + 3}" y="${box.y + 3}" width="${box.w}" height="${box.h}" fill="#00000010" rx="2"/>`,
        // fundo do comodo com cor
        `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${fill}" stroke="#8a7e6e" stroke-width="3" rx="2"/>`,
        // textura de piso
        createFloorTexture(room, box.x, box.y, box.w, box.h),
        // mobiliario
        roomFurnitureSvg(room, box.x, box.y, box.w, box.h),
        // nome do comodo
        `<text x="${box.x + box.w / 2}" y="${box.y + box.h - 12}" fill="#5a4e3e" font-size="18" font-family="Georgia, serif" text-anchor="middle" font-weight="bold" opacity="0.8">${room}</text>`
      ].join("");
    })
    .join("");
}

function buildBlueprintSvg(promptText) {
  const rooms = extractRoomsFromPrompt(promptText);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7f2ea"/>
      <stop offset="100%" stop-color="#ede5d8"/>
    </linearGradient>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="104%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000018"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="1200" height="800" fill="url(#bgGrad)"/>
  <!-- area verde/jardim ao redor -->
  <rect x="60" y="60" width="1080" height="680" rx="6" fill="#d5e6c8" opacity="0.4"/>
  <!-- contorno principal da edificacao -->
  <rect x="100" y="100" width="1000" height="600" fill="#faf6f0" stroke="#6b5e4e" stroke-width="5" rx="3" filter="url(#shadow)"/>
  <!-- linhas divisorias (paredes internas) -->
  <line x1="100" y1="340" x2="1100" y2="340" stroke="#6b5e4e" stroke-width="3"/>
  <line x1="470" y1="100" x2="470" y2="700" stroke="#6b5e4e" stroke-width="3"/>
  <line x1="780" y1="100" x2="780" y2="340" stroke="#6b5e4e" stroke-width="2.5"/>
  <line x1="440" y1="340" x2="440" y2="700" stroke="#6b5e4e" stroke-width="2.5"/>
  <line x1="740" y1="340" x2="740" y2="700" stroke="#6b5e4e" stroke-width="2.5"/>
  <!-- porta principal (abertura na parede inferior) -->
  <rect x="545" y="694" width="50" height="8" fill="#faf6f0"/>
  <path d="M 545 700 A 48 48 0 0 1 593 700" fill="none" stroke="#9a8a70" stroke-width="1.2" stroke-dasharray="3 2"/>
  <!-- janelas (aberturas nas paredes externas) -->
  <rect x="200" y="97" width="60" height="6" fill="#b8d8e8" rx="1"/>
  <rect x="620" y="97" width="60" height="6" fill="#b8d8e8" rx="1"/>
  <rect x="880" y="97" width="60" height="6" fill="#b8d8e8" rx="1"/>
  <rect x="200" y="697" width="50" height="6" fill="#b8d8e8" rx="1"/>
  <rect x="820" y="697" width="50" height="6" fill="#b8d8e8" rx="1"/>
  <!-- arvores/vegetacao decorativa -->
  <circle cx="40" cy="120" r="18" fill="#8cb870" opacity="0.45"/>
  <circle cx="1165" cy="150" r="16" fill="#8cb870" opacity="0.4"/>
  <circle cx="40" cy="650" r="20" fill="#a0c888" opacity="0.4"/>
  <circle cx="1165" cy="680" r="14" fill="#a0c888" opacity="0.35"/>
  ${createRoomBlocks(rooms)}
  <text x="600" y="46" fill="#5a4e3e" font-size="28" font-family="Georgia, serif" text-anchor="middle" font-weight="bold">PLANTA HUMANIZADA - FALLBACK LOCAL</text>
  <text x="600" y="776" fill="#8a7e6e" font-size="16" font-family="Georgia, serif" text-anchor="middle">Escala aproximada 1:100</text>
  <!-- indicador norte -->
  <g transform="translate(1120,50)">
    <polygon points="0,-20 -8,6 8,6" fill="#6b5e4e" opacity="0.7"/>
    <text x="0" y="20" fill="#6b5e4e" font-size="13" font-family="Georgia, serif" text-anchor="middle">N</text>
  </g>
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
