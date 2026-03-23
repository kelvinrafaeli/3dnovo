"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, RefreshCw, PenLine } from "lucide-react";

interface RoomDetailViewProps {
  title: string;
  imageDataUrl: string;
  model?: string;
  usedFallback?: boolean;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onEdit?: (editInstruction: string) => void;
  isEditing?: boolean;
}

export function RoomDetailView({
  title,
  imageDataUrl,
  model,
  usedFallback,
  onClose,
  onRegenerate,
  isRegenerating,
  onEdit,
  isEditing,
}: RoomDetailViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");

  // Auto-close edit mode when editing completes
  useEffect(() => {
    if (!isEditing && editMode && editText) {
      setEditMode(false);
      setEditText("");
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDownload() {
    const link = document.createElement("a");
    link.href = imageDataUrl;
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.png`;
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-colors hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt={title}
            className="w-full rounded-t-2xl"
          />
        </div>

        {/* Details */}
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-dm-sans)] text-xl font-bold text-[var(--primary)]">
              {title}
            </h2>
            {model && (
              <Badge variant={usedFallback ? "secondary" : "accent"}>
                {usedFallback ? "Fallback SVG" : model}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            {onRegenerate && (
              <Button
                variant="accent"
                onClick={onRegenerate}
                disabled={isRegenerating || isEditing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
                Regenerar
              </Button>
            )}
            {onEdit && !editMode && (
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
                disabled={isRegenerating || isEditing}
                className="gap-2"
              >
                <PenLine className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>

          {/* Edit Section */}
          {onEdit && editMode && (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Descreva as alteracoes desejadas... Ex: Trocar o sofa por um sofa azul"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isEditing}
              />
              <div className="flex gap-2">
                <Button
                  variant="accent"
                  onClick={() => onEdit(editText)}
                  disabled={isEditing || !editText.trim()}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isEditing ? "animate-spin" : ""}`}
                  />
                  Aplicar Edicao
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setEditMode(false); setEditText(""); }}
                  disabled={isEditing}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
