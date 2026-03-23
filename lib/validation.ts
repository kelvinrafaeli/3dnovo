import { z } from "zod";

// Step 1: Personal & Objective
export const stepPersonalSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo e obrigatorio."),
  document: z.string().trim().min(11, "CPF/CNPJ invalido."),
  email: z.string().email("Email invalido.").optional().or(z.literal("")),
  contact: z.string().optional().or(z.literal("")),
  budgetRange: z.string().min(1, "Selecione uma faixa de orcamento."),
  objective: z.string().min(1, "Selecione o objetivo principal."),
});

// Step 2: Terrain & Location
export const stepTerrainSchema = z.object({
  cep: z.string().trim().min(8, "CEP e obrigatorio."),
  street: z.string().trim().min(2, "Rua e obrigatoria."),
  number: z.string().trim().min(1, "Numero e obrigatorio."),
  neighborhood: z.string().trim().min(2, "Bairro e obrigatorio."),
  city: z.string().trim().min(2, "Cidade e obrigatoria."),
  state: z.string().trim().min(2, "Estado e obrigatorio."),
  terrainType: z.string().min(1, "Tipo de terreno e obrigatorio."),
  frontMeters: z.coerce.number().positive("Frente deve ser maior que zero."),
  backMeters: z.coerce.number().positive("Fundos deve ser maior que zero."),
  rightMeters: z.coerce.number().positive("Lateral direita deve ser maior que zero."),
  leftMeters: z.coerce.number().positive("Lateral esquerda deve ser maior que zero."),
  topography: z.string().min(1, "Selecione a topografia."),
  soilType: z.string().min(1, "Selecione o tipo de solo."),
  leftNeighbor: z.string().min(1, "Selecione o vizinho da esquerda."),
  rightNeighbor: z.string().min(1, "Selecione o vizinho da direita."),
  backNeighbor: z.string().min(1, "Selecione o vizinho dos fundos."),
  hasWater: z.boolean(),
  hasSewer: z.boolean(),
  hasElectricity: z.boolean(),
});

// Step 3: Family & Lifestyle
export const stepFamilySchema = z.object({
  residentsCount: z.coerce.number().min(1).max(20),
  familyComposition: z.string().min(1, "Selecione a composicao familiar."),
  hasPets: z.boolean(),
  hasSpecialNeeds: z.boolean(),
  expandFamily: z.boolean(),
  likesParties: z.boolean(),
  cookingImportance: z.boolean(),
  importantSpace: z.string().min(1, "Selecione o espaco mais importante."),
});

// Step 4: Style
export const stepStyleSchema = z.object({
  architecturalStyle: z.string().min(1, "Selecione um estilo arquitetonico."),
  structure: z.string().min(1, "Selecione o tipo de estrutura."),
  floors: z.string().min(1, "Selecione o numero de pavimentos."),
});

// Step 5: Rooms
export const stepRoomsSchema = z.object({
  selectedRooms: z.array(z.string()).min(1, "Selecione pelo menos um comodo."),
  bedroomCount: z.coerce.number().min(0).max(6),
  bathroomCount: z.coerce.number().min(1).max(6),
});

// Full wizard form data
export const wizardFormSchema = stepPersonalSchema
  .merge(stepTerrainSchema)
  .merge(stepFamilySchema)
  .merge(stepStyleSchema)
  .merge(stepRoomsSchema);

export type WizardFormData = z.infer<typeof wizardFormSchema>;

// Schema that matches the backend's terrainFormSchema for API submission
export const backendFormSchema = z.object({
  fullName: z.string(),
  document: z.string(),
  budgetRange: z.string(),
  objective: z.string(),
  cep: z.string(),
  street: z.string(),
  number: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  terrainType: z.string(),
  frontMeters: z.coerce.number(),
  backMeters: z.coerce.number(),
  rightMeters: z.coerce.number(),
  leftMeters: z.coerce.number(),
  topography: z.string(),
  soilType: z.string(),
  leftNeighbor: z.string(),
  rightNeighbor: z.string(),
  backNeighbor: z.string(),
  hasWater: z.coerce.boolean(),
  hasSewer: z.coerce.boolean(),
  hasElectricity: z.coerce.boolean(),
  architecturalStyle: z.string().optional(),
});
