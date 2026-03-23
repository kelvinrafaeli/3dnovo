"use client";

import { AppShell } from "@/components/layout/AppShell";
import { GenerationOrchestrator } from "@/components/generation/GenerationOrchestrator";

export default function GeneratePage() {
  return (
    <AppShell>
      <GenerationOrchestrator />
    </AppShell>
  );
}
