function shortLabel(input, limit) {
  const text = String(input || "").trim();

  if (!text) {
    return "Estudo 3D";
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3)}...`;
}

function buildIsometricSvg(title, subtitle) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#112235"/>
      <stop offset="100%" stop-color="#1d3a58"/>
    </linearGradient>
    <linearGradient id="sideA" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#5b8ac2"/>
      <stop offset="100%" stop-color="#4d75a5"/>
    </linearGradient>
    <linearGradient id="sideB" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#3b628c"/>
      <stop offset="100%" stop-color="#2f4f74"/>
    </linearGradient>
    <linearGradient id="top" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#7ea8d8"/>
      <stop offset="100%" stop-color="#628dbc"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1280" height="820" fill="url(#bg)"/>

  <g opacity="0.16" stroke="#9ec2e7">
    <line x1="90" y1="90" x2="1190" y2="90"/>
    <line x1="90" y1="170" x2="1190" y2="170"/>
    <line x1="90" y1="250" x2="1190" y2="250"/>
    <line x1="90" y1="330" x2="1190" y2="330"/>
    <line x1="90" y1="410" x2="1190" y2="410"/>
    <line x1="90" y1="490" x2="1190" y2="490"/>
    <line x1="90" y1="570" x2="1190" y2="570"/>
    <line x1="90" y1="650" x2="1190" y2="650"/>
  </g>

  <g transform="translate(0,20)">
    <polygon points="520,280 700,200 960,330 780,410" fill="url(#top)"/>
    <polygon points="780,410 960,330 960,560 780,640" fill="url(#sideA)"/>
    <polygon points="520,280 780,410 780,640 520,510" fill="url(#sideB)"/>

    <polygon points="350,370 470,320 640,400 520,450" fill="#7fa8d3"/>
    <polygon points="520,450 640,400 640,560 520,610" fill="#4e74a0"/>
    <polygon points="350,370 520,450 520,610 350,530" fill="#3a5f85"/>

    <line x1="520" y1="510" x2="960" y2="560" stroke="#d6ebff" stroke-width="3" stroke-dasharray="8 8"/>
    <line x1="640" y1="400" x2="700" y2="200" stroke="#d6ebff" stroke-width="3" stroke-dasharray="8 8"/>
  </g>

  <text x="90" y="72" font-size="42" font-family="Arial, sans-serif" fill="#f2f8ff">ESTUDO 3D - FALLBACK LOCAL</text>
  <text x="92" y="112" font-size="24" font-family="Arial, sans-serif" fill="#bcd7f2">${title}</text>
  <text x="92" y="148" font-size="18" font-family="Arial, sans-serif" fill="#99bddf">${subtitle}</text>
</svg>
`.trim();
}

function createLocal3DFallback(title, promptText, retryAfterSeconds) {
  const titleText = shortLabel(title, 52);
  const subtitleText = shortLabel(promptText, 120);
  const svg = buildIsometricSvg(titleText, subtitleText);
  const retryInfo = retryAfterSeconds
    ? `Tente novamente em cerca de ${retryAfterSeconds}s.`
    : "Tente novamente quando sua quota estiver disponivel.";

  return {
    model: "local-3d-fallback",
    usedFallback: true,
    usedQuotaFallback: true,
    text: [
      "A API de imagem nao respondeu para este item e foi aplicado fallback local 3D.",
      retryInfo,
      "Repita a geracao para obter o render remoto completo."
    ].join("\n"),
    warning: "Render 3D local aplicado temporariamente.",
    imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`
  };
}

module.exports = {
  createLocal3DFallback
};
