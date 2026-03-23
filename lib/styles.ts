export interface ArchitecturalStyle {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  promptDescriptor: string;
  gradient: string;
  accentColor: string;
}

export const ARCHITECTURAL_STYLES: ArchitecturalStyle[] = [
  {
    id: "japandi",
    name: "Japandi",
    description: "Minimalismo japones com aconchego escandinavo",
    longDescription:
      "Fusao do minimalismo japones com o design escandinavo. Valoriza madeira clara, tons neutros, linhas limpas e a simplicidade funcional.",
    promptDescriptor:
      "Estilo Japandi: fusao de minimalismo japones com design escandinavo. Use madeira clara de carvalho, tons neutros (bege, cinza claro, branco), linhas limpas, moveis baixos, iluminacao suave e natural, plantas discretas, texturas organicas como linho e ceramica.",
    gradient: "from-amber-50 to-stone-100",
    accentColor: "#8B6914",
  },
  {
    id: "moderno",
    name: "Moderno",
    description: "Linhas retas, vidro e espacos amplos",
    longDescription:
      "Design contemporaneo com linhas retas e geometricas. Prioriza espacos abertos, muita luz natural, vidro, concreto aparente e acabamentos sofisticados.",
    promptDescriptor:
      "Estilo Moderno: design contemporaneo com linhas retas e geometricas. Use concreto aparente, vidro, aco escovado, tons de cinza com pontos de cor, iluminacao embutida, pe-direito alto, espacos abertos e integrados, moveis de design com formas limpas.",
    gradient: "from-slate-50 to-zinc-100",
    accentColor: "#475569",
  },
  {
    id: "minimalista",
    name: "Minimalista",
    description: "Funcional, clean, menos e mais",
    longDescription:
      'Filosofia "menos e mais". Espacos limpos e funcionais com cores suaves, poucos moveis essenciais e nenhum excesso decorativo.',
    promptDescriptor:
      'Estilo Minimalista: filosofia "menos e mais". Use palette monocromatica (branco, off-white, cinza claro), moveis essenciais sem ornamentos, linhas puras, superficies lisas, iluminacao difusa, espacos amplos e livres, armazenamento embutido e oculto.',
    gradient: "from-gray-50 to-neutral-100",
    accentColor: "#6B7280",
  },
  {
    id: "rustico",
    name: "Rustico",
    description: "Madeira, pedra natural e natureza",
    longDescription:
      "Integracao com a natureza atraves de materiais organicos. Madeira robusta, pedra natural, cores terrosas e texturas aconchegantes.",
    promptDescriptor:
      "Estilo Rustico: integracao com a natureza. Use madeira robusta escura (peroba, ipê), pedra natural nas paredes, cores terrosas (marrom, verde musgo, terracota), vigas aparentes no teto, lareiras, plantas abundantes, tecidos naturais como algodao cru e juta, iluminacao quente e acolhedora.",
    gradient: "from-orange-50 to-amber-100",
    accentColor: "#92400E",
  },
];

export function getStyleById(id: string): ArchitecturalStyle | undefined {
  return ARCHITECTURAL_STYLES.find((s) => s.id === id);
}
