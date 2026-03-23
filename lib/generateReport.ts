"use client";

import jsPDF from "jspdf";
import type { ProjectState } from "@/context/ProjectContext";

/* ---------- helpers ---------- */

const ACCENT = [46, 125, 50]; // brand green
const DARK = [30, 30, 30];
const GRAY = [120, 120, 120];
const LIGHT_BG = [245, 245, 245];
const WHITE = [255, 255, 255];

type RGB = number[];

function setColor(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawLine(doc: jsPDF, y: number, margin: number, pageW: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
}

/** Add a base64 data-url image, fitting within maxW x maxH. Returns actual height used. */
function addImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): number {
  try {
    // Extract mime type to determine format
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
    const format = match ? (match[1] === "jpg" ? "JPEG" : match[1].toUpperCase()) : "PNG";
    doc.addImage(dataUrl, format, x, y, maxW, maxH);
    return maxH;
  } catch {
    // If image fails, draw a placeholder
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

/* ---------- main export ---------- */

export function generateProjectReport(state: ProjectState) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  const formData = state.formData as Record<string, unknown>;
  const summary = state.generationPackage?.summary as Record<string, unknown> | undefined;
  const rooms = state.plan3DResults?.rooms ?? [];

  /* ====== PAGE 1 — COVER ====== */

  // Green accent bar at top
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setFontSize(28);
  setColor(doc, WHITE as RGB);
  doc.text("CONSTRULINK", pageW / 2, 22, { align: "center" });
  doc.setFontSize(12);
  doc.text("Relatorio de Projeto Arquitetonico", pageW / 2, 32, { align: "center" });

  let y = 60;

  // Project info
  doc.setFontSize(18);
  setColor(doc, DARK);
  doc.text("Dados do Projeto", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 10;

  doc.setFontSize(11);
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
    ["Estilo", String(formData.architecturalStyle || "—")],
    ["Pavimentos", String(formData.floors || "—")],
    ["Moradores", String(formData.residentsCount || "—")],
    ["Composicao", String(formData.familyComposition || "—")],
  ];

  for (const [label, value] of infoRows) {
    setColor(doc, ACCENT);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    setColor(doc, DARK);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 35, y);
    y += 7;
  }

  y += 5;

  // Room program
  const selectedRooms = (formData.selectedRooms as string[]) ?? state.selectedRooms ?? [];
  if (selectedRooms.length) {
    doc.setFontSize(14);
    setColor(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text("Programa de Necessidades", margin, y);
    y += 3;
    drawLine(doc, y, margin, pageW);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const roomCols = 3;
    const colW = contentW / roomCols;
    selectedRooms.forEach((room, i) => {
      const col = i % roomCols;
      const row = Math.floor(i / roomCols);
      doc.text(`• ${room}`, margin + col * colW, y + row * 6);
    });
    y += Math.ceil(selectedRooms.length / roomCols) * 6 + 5;
  }

  // Footer on cover
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text("Gerado por Construlink — Powered by AI", pageW / 2, pageH - 10, {
    align: "center",
  });

  /* ====== PAGE 2 — PLANTA 2D ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(18);
  setColor(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text("Planta 2D Humanizada", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 8;

  if (state.plan2DResult?.imageDataUrl) {
    const imgH = Math.min(contentW * 0.75, pageH - y - margin - 20);
    addImage(doc, state.plan2DResult.imageDataUrl, margin, y, contentW, imgH);
    y += imgH + 5;
    doc.setFontSize(8);
    setColor(doc, GRAY);
    doc.text(`Modelo: ${state.plan2DResult.model || "AI"}`, margin, y);
  } else {
    drawPlaceholder(doc, margin, y, contentW, 120, "Planta 2D Humanizada sera inserida aqui");
    y += 125;
  }

  // Footer
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text("Construlink — Relatorio de Projeto", pageW / 2, pageH - 10, { align: "center" });

  /* ====== PAGE 3 — VISTA 3D ISOMETRICA ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(18);
  setColor(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text("Vista 3D Isometrica (sem telhado)", margin, y);
  y += 3;
  drawLine(doc, y, margin, pageW);
  y += 8;

  if (state.plan3DResults?.total?.imageDataUrl) {
    const imgH = Math.min(contentW * 0.75, pageH - y - margin - 20);
    addImage(doc, state.plan3DResults.total.imageDataUrl, margin, y, contentW, imgH);
    y += imgH + 5;
    doc.setFontSize(8);
    setColor(doc, GRAY);
    doc.text(`Modelo: ${state.plan3DResults.total.model || "AI"}`, margin, y);
  } else {
    drawPlaceholder(
      doc,
      margin,
      y,
      contentW,
      120,
      "Vista 3D Isometrica sera inserida aqui",
    );
    y += 125;
  }

  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text("Construlink — Relatorio de Projeto", pageW / 2, pageH - 10, { align: "center" });

  /* ====== PAGES 4+ — COMODOS 3D ====== */

  if (rooms.length > 0) {
    doc.addPage();
    y = margin;

    doc.setFontSize(18);
    setColor(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text("Renders 3D dos Comodos", margin, y);
    y += 3;
    drawLine(doc, y, margin, pageW);
    y += 8;

    // 2 rooms per page
    rooms.forEach((room, i) => {
      const neededH = 100;
      y = ensurePageSpace(doc, y, neededH, margin);

      // Room title
      doc.setFontSize(13);
      setColor(doc, ACCENT);
      doc.setFont("helvetica", "bold");
      doc.text(room.room, margin, y);
      y += 6;

      if (room.result?.imageDataUrl) {
        const imgH = 85;
        addImage(doc, room.result.imageDataUrl, margin, y, contentW, imgH);
        y += imgH + 3;
        doc.setFontSize(8);
        setColor(doc, GRAY);
        doc.setFont("helvetica", "normal");
        doc.text(`Modelo: ${room.result.model || "AI"}`, margin, y);
      } else {
        drawPlaceholder(doc, margin, y, contentW, 80, `Render de ${room.room} sera inserido aqui`);
        y += 83;
      }

      y += 10;

      // Add footer on every page
      doc.setFontSize(8);
      setColor(doc, GRAY);
      doc.text("Construlink — Relatorio de Projeto", pageW / 2, pageH - 10, { align: "center" });
    });
  }

  /* ====== LAST PAGE — OBSERVACOES ====== */

  doc.addPage();
  y = margin;

  doc.setFontSize(18);
  setColor(doc, DARK);
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

  // Generated date
  doc.setFontSize(9);
  setColor(doc, GRAY);
  const now = new Date();
  doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} as ${now.toLocaleTimeString("pt-BR")}`, margin, y);

  // Footer
  doc.setFontSize(8);
  doc.text("Construlink — Relatorio de Projeto", pageW / 2, pageH - 10, { align: "center" });

  /* ====== DOWNLOAD ====== */

  const clientName = String(formData.fullName || "projeto").replace(/\s+/g, "_").toLowerCase();
  doc.save(`construlink_relatorio_${clientName}.pdf`);
}
