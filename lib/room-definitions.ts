export interface RoomDefinition {
  id: string;
  name: string;
  category: "social" | "intima" | "servico" | "extra";
  defaultArea: number; // m2
  hasQuantity?: boolean;
  maxQuantity?: number;
}

export const ROOM_CATALOG: RoomDefinition[] = [
  // Social
  { id: "sala_estar", name: "Sala de Estar", category: "social", defaultArea: 20 },
  { id: "sala_jantar", name: "Sala de Jantar", category: "social", defaultArea: 12 },
  { id: "cozinha", name: "Cozinha", category: "social", defaultArea: 12 },
  { id: "varanda", name: "Varanda", category: "social", defaultArea: 15 },
  { id: "area_gourmet", name: "Area Gourmet", category: "social", defaultArea: 18 },

  // Intima
  { id: "suite", name: "Suite", category: "intima", defaultArea: 16 },
  { id: "quarto", name: "Quarto", category: "intima", defaultArea: 12, hasQuantity: true, maxQuantity: 4 },
  { id: "banheiro_social", name: "Banheiro Social", category: "intima", defaultArea: 4, hasQuantity: true, maxQuantity: 3 },
  { id: "escritorio", name: "Escritorio", category: "intima", defaultArea: 10 },
  { id: "home_office", name: "Home Office", category: "intima", defaultArea: 8 },

  // Servico
  { id: "lavanderia", name: "Lavanderia", category: "servico", defaultArea: 5 },
  { id: "garagem", name: "Garagem", category: "servico", defaultArea: 18 },
  { id: "despensa", name: "Despensa", category: "servico", defaultArea: 4 },

  // Extra
  { id: "piscina", name: "Piscina", category: "extra", defaultArea: 25 },
  { id: "academia", name: "Academia", category: "extra", defaultArea: 15 },
  { id: "sala_tv", name: "Sala de TV", category: "extra", defaultArea: 14 },
];

export function getRoomById(id: string): RoomDefinition | undefined {
  return ROOM_CATALOG.find((r) => r.id === id);
}

/** Rooms suggested by default per objective (mirrors planEngine.js:41-77) */
export function getDefaultRoomsByObjective(objective: string): string[] {
  const norm = objective.toLowerCase();

  if (norm.includes("comercial")) {
    return ["sala_estar", "cozinha", "banheiro_social", "escritorio", "despensa"];
  }

  if (norm.includes("aluguel") || norm.includes("investimento")) {
    return ["sala_estar", "cozinha", "quarto", "quarto", "banheiro_social", "lavanderia", "varanda"];
  }

  // residencial familiar (default)
  return [
    "sala_estar",
    "sala_jantar",
    "cozinha",
    "suite",
    "quarto",
    "banheiro_social",
    "lavanderia",
    "garagem",
  ];
}
