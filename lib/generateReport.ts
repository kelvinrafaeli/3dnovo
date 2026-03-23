"use client";

import jsPDF from "jspdf";
import type { ProjectState } from "@/context/ProjectContext";

/* ---------- helpers ---------- */

// App brand colors
const PRIMARY = [27, 43, 75]; // #1B2B4B navy
const ACCENT = [232, 168, 56]; // #E8A838 golden
const DARK = [30, 30, 30];
const GRAY = [120, 120, 120];
const LIGHT_BG = [248, 246, 243]; // #F8F6F3 surface
const WHITE = [255, 255, 255];
const GREEN = [34, 197, 94];

type RGB = number[];

function setColor(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawLine(doc: jsPDF, y: number, margin: number, pageW: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
}

function addImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): number {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
    const format = match ? (match[1] === "jpg" ? "JPEG" : match[1].toUpperCase()) : "PNG";
    doc.addImage(dataUrl, format, x, y, maxW, maxH);
    return maxH;
  } catch {
    return drawPlaceholder(doc, x, y, maxW, maxH, "Imagem indisponivel");
  }
}

function drawPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): number {
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(10);
  setColor(doc, GRAY);
  doc.text(label, x + w / 2, y + h / 2, { align: "center" });
  return h;
}

function ensurePageSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

/** Draw a small status indicator circle + label */
function drawStatusIndicator(
  doc: jsPDF,
  x: number,
  y: number,
  active: boolean,
  label: string,
): number {
  const radius = 2;
  if (active) {
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.circle(x + radius, y - radius + 0.5, radius, "F");
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.circle(x + radius, y - radius + 0.5, radius, "S");
  }

  doc.setFontSize(9);
  setColor(doc, active ? DARK : GRAY);
  doc.text(label, x + radius * 2 + 3, y);
  return doc.getTextWidth(label) + radius * 2 + 6;
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text("Construlink — Relatorio de Projeto", pageW / 2, pageH - 10, { align: "center" });
}

/* ---------- main export ---------- */

export function generateProjectReport(state: ProjectState) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  const formData = state.formData as Record<string, unknown>;
  const rooms = state.plan3DResults?.rooms ?? [];

  /* ====== PAGE 1 — COVER ====== */

  // Navy accent bar at top
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, 0, pageW, 40, "F");

  // Golden line accent
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 38, pageW, 2, "F");

  doc.setFontSize(28);
  setColor(doc, WHITE as RGB);
  doc.text("CONSTRULINK", pageW / 2, 22, { align: "center" });
  doc.setFontSize(12);
  doc.text("Relatorio de Projeto Arquitetonico", pageW / 2, 32, { align: "center" });

  let y = 55;

  // Project info
  doc.setFontSize(16);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Projeto", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 8;

  doc.setFontSize(10);
  const infoRows: [string, string][] = [
    ["Cliente", String(formData.fullName || "—")],
    ["Documento", String(formData.document || "—")],
    ["Objetivo", String(formData.objective || "—")],
    ["Orcamento", String(formData.budgetRange || "—")],
    [
      "Endereco",
      [formData.street, formData.number, formData.neighborhood, formData.city, formData.state]
        .filter(Boolean)
        .join(", ") || "—",
    ],
    [
      "Terreno",
      formData.frontMeters
        ? `${formData.frontMeters}m x ${formData.rightMeters}m x ${formData.backMeters}m x ${formData.leftMeters}m`
        : "—",
    ],
    ["Topografia", String(formData.topography || "—")],
    ["Solo", String(formData.soilType || "—")],
    ["Estilo", String(formData.architecturalStyle || "—")],
    ["Estrutura", String(formData.structure || "—")],
    ["Pavimentos", String(formData.floors || "—")],
    ["Moradores", String(formData.residentsCount || "—")],
    ["Composicao", String(formData.familyComposition || "—")],
    ["Espaco Importante", String(formData.importantSpace || "—")],
  ];

  for (const [label, value] of infoRows) {
    setColor(doc, ACCENT);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    setColor(doc, DARK);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 38, y);
    y += 6;
  }

  y += 4;

  // Infrastructure indicators
  doc.setFontSize(10);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Infraestrutura:", margin, y);
  y += 6;

  let indX = margin;
  indX += drawStatusIndicator(doc, indX, y, !!formData.hasWater, "Agua");
  indX += drawStatusIndicator(doc, indX, y, !!formData.hasSewer, "Esgoto");
  drawStatusIndicator(doc, indX, y, !!formData.hasElectricity, "Eletricidade");
  y += 6;

  // Neighbors
  doc.setFontSize(9);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Vizinhos:", margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text(
    `Esq: ${formData.leftNeighbor || "—"} | Dir: ${formData.rightNeighbor || "—"} | Fundos: ${formData.backNeighbor || "—"}`,
    margin + 22,
    y,
  );
  y += 6;

  // Lifestyle indicators
  y += 2;
  doc.setFontSize(10);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Necessidades & Habitos:", margin, y);
  y += 6;

  const boolFields: [string, string][] = [
    ["hasPets", "Pets"],
    ["hasSpecialNeeds", "Acessibilidade"],
    ["expandFamily", "Expansao"],
    ["hasHomeOffice", "Home Office"],
    ["hasElderly", "Idosos"],
    ["likesParties", "Festas"],
    ["cookingImportance", "Cozinha"],
    ["exercisesAtHome", "Exercicios"],
    ["worksFromHome", "Trab. Remoto"],
    ["likesGardening", "Jardinagem"],
  ];

  let lineX = margin;
  for (const [key, label] of boolFields) {
    const w = drawStatusIndicator(doc, lineX, y, !!formData[key], label);
    lineX += w;
    if (lineX > pageW - margin - 30) {
      y += 6;
      lineX = margin;
    }
  }
  y += 8;

  // Other needs/habits
  if (formData.otherNeeds) {
    setColor(doc, ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Outras necessidades:", margin, y);
    setColor(doc, DARK);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(formData.otherNeeds), contentW - 45);
    doc.text(lines, margin + 45, y);
    y += lines.length * 5 + 3;
  }

  if (formData.otherHabits) {
    setColor(doc, ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Outros habitos:", margin, y);
    setColor(doc, DARK);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(formData.otherHabits), contentW - 45);
    doc.text(lines, margin + 45, y);
    y += lines.length * 5 + 3;
  }

  y += 2;

  // Room program
  const selectedRooms = (formData.selectedRooms as string[]) ?? state.selectedRooms ?? [];
  if (selectedRooms.length) {
    y = ensurePageSpace(doc, y, 30, margin);
    doc.setFontSize(12);
    setColor(doc, PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.text("Programa de Necessidades", margin, y);
    y += 3;
    drawLine(doc, y, margin, pageW);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const roomCols = 3;
    const colW = contentW / roomCols;
    selectedRooms.forEach((room, i) => {
      const col = i % roomCols;
      const row = Math.floor(i / roomCols);
      doc.text(`• ${room}`, margin + col * colW, y + row * 5);
    });
    y += Math.ceil(selectedRooms.length / roomCols) * 5 + 5;
  }

  addFooter(doc);

  /* ====== PAGE 2 — PLANTA 2D ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(16);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Planta 2D Humanizada", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 8;

  if (state.plan2DResult?.imageDataUrl) {
    const imgH = Math.min(contentW * 0.75, pageH - y - margin - 20);
    addImage(doc, state.plan2DResult.imageDataUrl, margin, y, contentW, imgH);
  } else {
    drawPlaceholder(doc, margin, y, contentW, 120, "Planta 2D Humanizada sera inserida aqui");
  }

  addFooter(doc);

  /* ====== PAGE 3 — VISTA 3D ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(16);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Planta 3D", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 8;

  if (state.plan3DResults?.total?.imageDataUrl) {
    const imgH = Math.min(contentW * 0.75, pageH - y - margin - 20);
    addImage(doc, state.plan3DResults.total.imageDataUrl, margin, y, contentW, imgH);
  } else {
    drawPlaceholder(doc, margin, y, contentW, 120, "Planta 3D sera inserida aqui");
  }

  addFooter(doc);

  /* ====== PAGES 4+ — COMODOS 3D ====== */

  if (rooms.length > 0) {
    doc.addPage();
    y = margin;

    doc.setFontSize(16);
    setColor(doc, PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.text("Renders 3D dos Comodos", margin, y);
    y += 3;
    drawLine(doc, y, margin, pageW);
    y += 8;

    rooms.forEach((room) => {
      const neededH = 100;
      y = ensurePageSpace(doc, y, neededH, margin);

      doc.setFontSize(13);
      setColor(doc, ACCENT);
      doc.setFont("helvetica", "bold");
      doc.text(room.room, margin, y);
      y += 6;

      if (room.result?.imageDataUrl) {
        const imgH = 85;
        addImage(doc, room.result.imageDataUrl, margin, y, contentW, imgH);
        y += imgH + 3;
      } else {
        drawPlaceholder(doc, margin, y, contentW, 80, `Render de ${room.room} sera inserido aqui`);
        y += 83;
      }

      y += 10;
      addFooter(doc);
    });
  }

  /* ====== LAST PAGE — OBSERVACOES ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(16);
  setColor(doc, PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Observacoes", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  const notes = [
    "1. Este relatorio foi gerado automaticamente pela plataforma Construlink utilizando inteligencia artificial.",
    "2. As imagens 3D sao representacoes artisticas baseadas nos dados fornecidos pelo cliente.",
    "3. O projeto final deve ser validado por um profissional de arquitetura e engenharia habilitado.",
    "4. Medidas, materiais e acabamentos podem variar na execucao real do projeto.",
    "5. Este documento nao substitui um projeto arquitetonico completo e detalhado.",
  ];

  for (const note of notes) {
    const lines = doc.splitTextToSize(note, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  }

  y += 10;

  doc.setFontSize(9);
  setColor(doc, GRAY);
  const now = new Date();
  doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} as ${now.toLocaleTimeString("pt-BR")}`, margin, y);

  addFooter(doc);

  /* ====== DOWNLOAD ====== */

  const clientName = String(formData.fullName || "projeto").replace(/\s+/g, "_").toLowerCase();
  doc.save(`construlink_relatorio_${clientName}.pdf`);
}
