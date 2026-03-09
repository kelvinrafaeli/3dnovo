(async () => {
  const generatePayload = {
    fullName: "Cliente Browser",
    document: "12345678901",
    budgetRange: "R$ 300 mil a R$ 600 mil",
    objective: "Residencial familiar",
    cep: "12345678",
    street: "Rua Browser",
    number: "99",
    neighborhood: "Centro",
    city: "Sao Paulo",
    state: "SP",
    terrainType: "Urbano regular",
    frontMeters: 10,
    backMeters: 10,
    rightMeters: 25,
    leftMeters: 25,
    topography: "Plano",
    soilType: "Argiloso",
    leftNeighbor: "Residencial baixo",
    rightNeighbor: "Residencial baixo",
    backNeighbor: "Area livre",
    hasWater: true,
    hasSewer: true,
    hasElectricity: true
  };

  const genRes = await fetch("http://localhost:3000/api/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(generatePayload)
  });
  const gen = await genRes.json();

  const r2dRes = await fetch("http://localhost:3000/api/plan/render-2d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: gen.prompts.plan2DRenderNanoBanana2 })
  });
  const r2d = await r2dRes.json();

  const extractRes = await fetch("http://localhost:3000/api/plan/extract-2d-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      referencePlanImageDataUrl: r2d.result.imageDataUrl,
      plan2DPrompt: gen.prompts.plan2DRenderNanoBanana2,
      roomProgram: gen.roomProgram
    })
  });
  const extractRaw = await extractRes.text();
  let extract;
  try {
    extract = JSON.parse(extractRaw);
  } catch (error) {
    extract = {
      parseError: error.message,
      rawStart: extractRaw.slice(0, 180)
    };
  }

  const roomPrompt = gen.prompts.plan3DRooms[0];
  const r3dRes = await fetch("http://localhost:3000/api/plan/render-3d-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: roomPrompt.prompt,
      label: `Comodo ${roomPrompt.room}`,
      referencePlanPrompt: gen.prompts.plan2DRenderNanoBanana2,
      roomProgram: gen.roomProgram,
      extractedPlanData: extract.extraction?.extractedPlanData
    })
  });

  const raw = await r3dRes.text();
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    parsed = { parseError: error.message, rawStart: raw.slice(0, 180) };
  }

  console.log(
    JSON.stringify(
      {
        generateOk: genRes.ok,
        render2dOk: r2dRes.ok,
        extractOk: extractRes.ok,
        extractModel: extract.extraction?.model || null,
        extractHasRooms: Array.isArray(extract.extraction?.extractedPlanData?.rooms),
        extractError: extract.error || null,
        extractParseError: extract.parseError || null,
        extractRawStart: extract.rawStart || null,
        render3dOk: r3dRes.ok,
        render3dStatus: r3dRes.status,
        render3dContentType: r3dRes.headers.get("content-type"),
        render3dResult: {
          ok: parsed.ok || null,
          error: parsed.error || null,
          model: parsed.result?.model || null,
          usedReferenceImage: parsed.result?.usedReferenceImage || null,
          hasImage: Boolean(parsed.result?.imageDataUrl),
          parseError: parsed.parseError || null,
          rawStart: parsed.rawStart || null
        }
      },
      null,
      2
    )
  );
})();
