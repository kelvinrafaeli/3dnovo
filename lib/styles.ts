export type StyleCategory = "classico" | "moderno" | "tematico" | "fantasia";

export interface ArchitecturalStyle {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  promptDescriptor: string;
  gradient: string;
  accentColor: string;
  image: string;
  category: StyleCategory;
}

export const STYLE_CATEGORIES: { id: StyleCategory; label: string }[] = [
  { id: "moderno", label: "Modernos" },
  { id: "classico", label: "Classicos" },
  { id: "tematico", label: "Tematicos" },
  { id: "fantasia", label: "Fantasia" },
];

export const ARCHITECTURAL_STYLES: ArchitecturalStyle[] = [
  // ── MODERNOS ──────────────────────────────────────────────────────────────
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
    image: "/styles/moderno.jpg",
    category: "moderno",
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
    image: "/styles/minimalista.jpg",
    category: "moderno",
  },
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
    image: "/styles/japandi.jpg",
    category: "moderno",
  },
  {
    id: "cottagecore",
    name: "Cottagecore",
    description: "Charme rural romantico e acolhedor",
    longDescription:
      "Estetica romantica inspirada na vida rural. Tecidos florais, moveis vintage, ceramicas artesanais e muita natureza integrada ao interior.",
    promptDescriptor:
      "Estilo Cottagecore: estetica romantica rural. Use tecidos florais, cortinas de renda, moveis de madeira pintada, ceramicas artesanais, plantas em vasos de barro, tapetes trancados, iluminacao quente e acolhedora, tons pasteis suaves.",
    gradient: "from-green-50 to-lime-50",
    accentColor: "#65a30d",
    image: "/styles/cottagecore.jpg",
    category: "moderno",
  },
  {
    id: "aconchegante",
    name: "Aconchegante",
    description: "Conforto maximo com texturas quentes",
    longDescription:
      "Ambientes que priorizam o conforto e o acolhimento. Tecidos macios, iluminacao quente, cores terrosas e camadas de texturas.",
    promptDescriptor:
      "Estilo Aconchegante: maximo conforto. Use sofas profundos com almofadas, mantas de la, tapetes felpudos, iluminacao quente com abajures, tons terrosos e neutros quentes, madeira natural, velas decorativas, cortinas grossas.",
    gradient: "from-orange-50 to-amber-50",
    accentColor: "#b45309",
    image: "/styles/aconchegante.jpg",
    category: "moderno",
  },
  {
    id: "biofilico",
    name: "Biofilico",
    description: "Natureza integrada ao design interior",
    longDescription:
      "Design que conecta o interior com a natureza. Plantas abundantes, materiais naturais, luz natural maximizada e elementos organicos.",
    promptDescriptor:
      "Estilo Biofilico: natureza integrada ao interior. Use muitas plantas verdes (samambaias, costelas-de-adao, trepadeiras), paredes verdes, madeira natural, pedra, bamboo, muita luz natural, tons verdes e terrosos, agua como elemento decorativo.",
    gradient: "from-emerald-50 to-green-100",
    accentColor: "#059669",
    image: "/styles/biofilico.jpg",
    category: "moderno",
  },
  {
    id: "estilo-soho",
    name: "Estilo Soho",
    description: "Loft urbano industrial sofisticado",
    longDescription:
      "Inspirado nos lofts do SoHo em Nova York. Espacos amplos com tijolos aparentes, tubulacao exposta, moveis de design e arte contemporanea.",
    promptDescriptor:
      "Estilo Soho/Industrial Loft: loft urbano sofisticado. Use tijolos aparentes, tubulacao metalica exposta, concreto polido, moveis de couro e metal, iluminacao industrial com pendentes Edison, pe-direito alto, arte contemporanea nas paredes, tons de cinza e preto com toques de cor.",
    gradient: "from-zinc-100 to-stone-200",
    accentColor: "#78716c",
    image: "/styles/estilo-soho.jpg",
    category: "moderno",
  },
  {
    id: "luxo",
    name: "Luxo",
    description: "Elegancia premium com materiais nobres",
    longDescription:
      "Design sofisticado com materiais premium. Marmore, metais dourados, tecidos nobres e acabamentos impecaveis.",
    promptDescriptor:
      "Estilo Luxo: elegancia premium. Use marmore branco e preto, metais dourados e rose gold, veludo em sofas e cortinas, lustres de cristal, espelhos grandes, tons neutros sofisticados com dourado, iluminacao cenografica, moveis de grife.",
    gradient: "from-yellow-50 to-amber-100",
    accentColor: "#a16207",
    image: "/styles/luxo.jpg",
    category: "moderno",
  },
  {
    id: "airbnb",
    name: "Airbnb",
    description: "Pratico, fotografavel e convidativo",
    longDescription:
      "Design pensado para hospedagem. Espacos limpos, fotografaveis, com toques locais e tudo que um hospede precisa.",
    promptDescriptor:
      "Estilo Airbnb: design pratico e fotografavel. Use cores claras e neutras, toques decorativos locais, roupa de cama branca premium, cozinha bem equipada, iluminacao natural abundante, plantas decorativas, moveis funcionais e bonitos, ambiente instagramavel.",
    gradient: "from-rose-50 to-pink-50",
    accentColor: "#e11d48",
    image: "/styles/airbnb.jpg",
    category: "moderno",
  },
  {
    id: "madeira",
    name: "Madeira",
    description: "Calor natural da madeira em todos os detalhes",
    longDescription:
      "Ambientes dominados pela beleza da madeira. Paineis, pisos, moveis e detalhes que celebram esse material nobre.",
    promptDescriptor:
      "Estilo Madeira: celebracao da madeira. Use paineis de madeira nas paredes e teto, piso de madeira, moveis de madeira macica, tons quentes naturais, iluminacao quente, detalhes em couro, texturas organicas, acabamentos em madeira clara e escura combinadas.",
    gradient: "from-amber-100 to-orange-100",
    accentColor: "#92400E",
    image: "/styles/madeira.jpg",
    category: "moderno",
  },
  {
    id: "personalizado",
    name: "Personalizado",
    description: "Mix unico baseado nas suas preferencias",
    longDescription:
      "Estilo customizado que combina elementos de diferentes referencias, criando um ambiente unico baseado nas suas preferencias pessoais.",
    promptDescriptor:
      "Estilo Personalizado: design eclético e único. Combine elementos de diferentes estilos de forma harmoniosa, priorize funcionalidade e estética equilibrada, use materiais variados com coerência visual, iluminação versátil, cores que reflitam personalidade.",
    gradient: "from-violet-50 to-purple-50",
    accentColor: "#7c3aed",
    image: "/styles/personalizado.jpg",
    category: "moderno",
  },

  // ── CLASSICOS ─────────────────────────────────────────────────────────────
  {
    id: "rustico",
    name: "Rustico",
    description: "Madeira, pedra natural e natureza",
    longDescription:
      "Integracao com a natureza atraves de materiais organicos. Madeira robusta, pedra natural, cores terrosas e texturas aconchegantes.",
    promptDescriptor:
      "Estilo Rustico: integracao com a natureza. Use madeira robusta escura (peroba, ipe), pedra natural nas paredes, cores terrosas (marrom, verde musgo, terracota), vigas aparentes no teto, lareiras, plantas abundantes, tecidos naturais como algodao cru e juta, iluminacao quente e acolhedora.",
    gradient: "from-orange-50 to-amber-100",
    accentColor: "#92400E",
    image: "/styles/rustico.jpg",
    category: "classico",
  },
  {
    id: "barroco",
    name: "Barroco",
    description: "Opulencia classica com detalhes ornamentais",
    longDescription:
      "Inspirado no periodo barroco europeu. Ornamentos elaborados, dourado, tecidos ricos e uma sensacao de grandiosidade.",
    promptDescriptor:
      "Estilo Barroco: opulencia classica. Use molduras ornamentais douradas, lustres de cristal grandes, tecidos de veludo e damasco, moveis entalhados com curvas, espelhos decorados, cores ricas (vinho, azul royal, dourado), tetos decorados, tapecarias.",
    gradient: "from-yellow-100 to-amber-200",
    accentColor: "#854d0e",
    image: "/styles/barroco.jpg",
    category: "classico",
  },
  {
    id: "medieval",
    name: "Medieval",
    description: "Castelos, pedra e ferro forjado",
    longDescription:
      "Ambientes que remetem a era medieval. Pedra bruta, ferro forjado, madeira pesada e elementos goticos.",
    promptDescriptor:
      "Estilo Medieval: ambientes de castelo. Use paredes de pedra bruta, arcos ogivais, ferro forjado em lustres e detalhes, madeira pesada escura, tapecarias nas paredes, velas e candelabros, tons escuros (cinza pedra, marrom escuro, vinho), armaduras decorativas.",
    gradient: "from-stone-200 to-gray-300",
    accentColor: "#57534e",
    image: "/styles/medieval.jpg",
    category: "classico",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Charme retro com pecas de epoca",
    longDescription:
      "Ambientes com personalidade retro. Moveis de antiquario, padroes classicos, cores suaves e nostalgia elegante.",
    promptDescriptor:
      "Estilo Vintage: charme retro elegante. Use moveis de epoca restaurados, padroes florais e geometricos classicos, cores pasteis suaves, luminarias retro, espelhos com molduras antigas, porcelana decorativa, cortinas com padrao, tons de rosa antigo, azul claro e creme.",
    gradient: "from-rose-100 to-pink-100",
    accentColor: "#be185d",
    image: "/styles/vintage.jpg",
    category: "classico",
  },
  {
    id: "mediterraneo",
    name: "Mediterraneo",
    description: "Brisa costeira com azulejos e cal",
    longDescription:
      "Inspirado nas casas do Mediterraneo. Paredes caiadas, azulejos pintados, arcos, cores do mar e do sol.",
    promptDescriptor:
      "Estilo Mediterraneo: brisa costeira. Use paredes caiadas de branco, azulejos pintados a mao (azul e branco), arcos de volta perfeita, terracota no piso, moveis de ferro forjado, plantas como oliveiras e lavanda, tons de azul, branco e terracota, muita luz natural.",
    gradient: "from-blue-50 to-sky-100",
    accentColor: "#0369a1",
    image: "/styles/mediterraneo.jpg",
    category: "classico",
  },
  {
    id: "colonial",
    name: "Colonial",
    description: "Tradicao brasileira com elegancia atemporal",
    longDescription:
      "Inspirado na arquitetura colonial brasileira. Madeira macica, azulejos portugueses, varandas e detalhes classicos.",
    promptDescriptor:
      "Estilo Colonial Brasileiro: tradicao elegante. Use madeira macica (jacaranda, mogno), azulejos portugueses decorativos, varandas com colunas, pisos de ladrilho hidraulico, moveis classicos torneados, cores quentes (ocre, terracota, azul colonial), janelas com venezianas.",
    gradient: "from-amber-100 to-yellow-100",
    accentColor: "#a16207",
    image: "/styles/colonial.jpg",
    category: "classico",
  },
  {
    id: "litoraneo",
    name: "Litoraneo",
    description: "Casa de praia arejada e relaxante",
    longDescription:
      "Ambientes que trazem a sensacao de praia para dentro de casa. Cores claras, materiais naturais leves e brisa marinha.",
    promptDescriptor:
      "Estilo Litoraneo/Beach House: casa de praia. Use madeira clara e bambu, cores do mar (azul claro, branco, areia), tecidos leves de linho, moveis de rattan e vime, conchas decorativas, janelas amplas, ventilacao natural, tapetes de sisal, iluminacao solar abundante.",
    gradient: "from-cyan-50 to-blue-50",
    accentColor: "#0891b2",
    image: "/styles/litoraneo.jpg",
    category: "classico",
  },

  // ── TEMATICOS ─────────────────────────────────────────────────────────────
  {
    id: "tropical",
    name: "Tropical",
    description: "Exuberancia verde com tons vibrantes",
    longDescription:
      "Inspirado em florestas tropicais. Folhagens exuberantes, cores vibrantes, madeira e uma atmosfera relaxante e alegre.",
    promptDescriptor:
      "Estilo Tropical: exuberancia natural. Use folhagens tropicais grandes (costela-de-adao, palmeiras, bananeiras), cores vibrantes (verde, amarelo, coral), madeira natural, rattan e vime, estampas de folhagem, muita luz natural, tons quentes, ventilacao cruzada.",
    gradient: "from-green-100 to-emerald-100",
    accentColor: "#15803d",
    image: "/styles/tropical.jpg",
    category: "tematico",
  },
  {
    id: "bohemio",
    name: "Bohemio",
    description: "Eclético, livre e cheio de personalidade",
    longDescription:
      "Estilo livre que mistura culturas, texturas e cores. Tapetes orientais, macrame, plantas e colecoes pessoais.",
    promptDescriptor:
      "Estilo Bohemio/Boho: eclético e livre. Use tapetes orientais coloridos, macrame nas paredes, almofadas etnicas, plantas penduradas, moveis de madeira e rattan, cores quentes e saturadas, tecidos variados, colecoes pessoais, velas e incenso, iluminacao com fairy lights.",
    gradient: "from-fuchsia-50 to-purple-50",
    accentColor: "#a21caf",
    image: "/styles/bohemio.jpg",
    category: "tematico",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon futurista com tons escuros",
    longDescription:
      "Estetica futurista inspirada no genero cyberpunk. Luzes neon, superficies escuras, tecnologia visivel e atmosfera urbana noturna.",
    promptDescriptor:
      "Estilo Cyberpunk: futurismo urbano. Use iluminacao neon (rosa, azul, roxo), superficies escuras e metalicas, LEDs embutidos, moveis com formas angulares, paineis digitais, reflexos neon em vidro e metal, tons escuros com contraste neon vibrante, estetica high-tech.",
    gradient: "from-purple-200 to-fuchsia-200",
    accentColor: "#9333ea",
    image: "/styles/cyberpunk.jpg",
    category: "tematico",
  },
  {
    id: "gamer",
    name: "Gamer",
    description: "Setup imersivo com RGB e conforto",
    longDescription:
      "Ambientes otimizados para gaming. Iluminacao RGB, moveis ergonomicos, telas multiplas e estetica tech.",
    promptDescriptor:
      "Estilo Gamer: setup imersivo. Use iluminacao RGB em tiras LED, cadeira gamer ergonomica, mesa ampla com setup multi-monitor, tons escuros (preto, cinza escuro) com acentos neon, paineis acusticos decorativos, organizacao de cabos, prateleiras com colecionaveis, iluminacao ambiente roxa/azul.",
    gradient: "from-violet-200 to-purple-200",
    accentColor: "#7c3aed",
    image: "/styles/gamer.jpg",
    category: "tematico",
  },
  {
    id: "technoland",
    name: "Technoland",
    description: "Futurismo tech com linhas de luz",
    longDescription:
      "Ambientes ultra-tecnologicos com automacao visivel, telas holograficas e materiais futuristas.",
    promptDescriptor:
      "Estilo Technoland: ultra-tecnologico. Use superficies brancas brilhantes, linhas de luz LED embutidas, moveis com formas futuristas, paineis touch screen, automacao domestica visivel, tons brancos com acentos de luz azul/roxo, materiais sinteticos polidos, estetica sci-fi clean.",
    gradient: "from-cyan-100 to-blue-200",
    accentColor: "#0284c7",
    image: "/styles/technoland.jpg",
    category: "tematico",
  },
  {
    id: "discoteca",
    name: "Discoteca",
    description: "Festa e brilho em cada detalhe",
    longDescription:
      "Inspirado em danceterias. Espelhos, luzes coloridas, brilho metalico e uma atmosfera de celebracao.",
    promptDescriptor:
      "Estilo Discoteca: festa e glamour. Use bola de espelhos, superficies espelhadas, luzes coloridas e estroboscopicas, tons de roxo e rosa neon, sofas de veludo em cores vivas, piso brilhante, metalicos dourados e prateados, iluminacao dramatica.",
    gradient: "from-pink-200 to-purple-200",
    accentColor: "#db2777",
    image: "/styles/discoteca.jpg",
    category: "tematico",
  },
  {
    id: "arco-iris",
    name: "Arco-Iris",
    description: "Explosao de cores alegres e vibrantes",
    longDescription:
      "Ambientes multicoloridos que celebram a diversidade de cores. Cada elemento traz uma cor vibrante diferente.",
    promptDescriptor:
      "Estilo Arco-Iris: explosao de cores. Use todas as cores do arco-iris de forma harmoniosa, moveis coloridos, paredes com cores vivas, almofadas multicoloridas, arte pop nas paredes, tapetes coloridos, iluminacao quente, atmosfera alegre e vibrante.",
    gradient: "from-red-100 via-yellow-100 to-blue-100",
    accentColor: "#dc2626",
    image: "/styles/arco-iris.jpg",
    category: "tematico",
  },
  {
    id: "desenho-animado",
    name: "Desenho Animado",
    description: "Fantasia ludica com formas divertidas",
    longDescription:
      "Ambientes inspirados em desenhos animados. Cores primarias, formas organicas, moveis ludicos e um toque de fantasia.",
    promptDescriptor:
      "Estilo Desenho Animado: ludico e divertido. Use cores primarias vibrantes (vermelho, azul, amarelo), formas organicas e arredondadas nos moveis, padroes de poa e listras, paredes com murais coloridos, iluminacao alegre, moveis com formatos inusitados, atmosfera de fantasia infantil.",
    gradient: "from-yellow-100 to-red-100",
    accentColor: "#ea580c",
    image: "/styles/desenho-animado.jpg",
    category: "tematico",
  },

  // ── FANTASIA ──────────────────────────────────────────────────────────────
  {
    id: "gotico",
    name: "Gotico",
    description: "Elegancia sombria com detalhes ornamentais",
    longDescription:
      "Estetica dark elegante. Arcos ogivais, veludo negro, candelabros e uma atmosfera misteriosamente sofisticada.",
    promptDescriptor:
      "Estilo Gotico: elegancia sombria. Use arcos ogivais, veludo negro e vinho, candelabros com velas, moveis escuros entalhados, vitrais coloridos, paredes escuras, detalhes em ferro forjado, rosas vermelhas, iluminacao dramatica com sombras, tons de preto, vinho e roxo escuro.",
    gradient: "from-gray-300 to-slate-400",
    accentColor: "#1e293b",
    image: "/styles/gotico.jpg",
    category: "fantasia",
  },
  {
    id: "assustador",
    name: "Assustador",
    description: "Terror elegante com atmosfera sombria",
    longDescription:
      "Ambientes inspirados em filmes de terror classicos. Teias, moveis antigos desgastados e uma iluminacao inquietante.",
    promptDescriptor:
      "Estilo Assustador/Horror Classico: terror elegante. Use moveis antigos desgastados, cortinas rasgadas, iluminacao fraca e sombria, candelabros com velas derretidas, espelhos envelhecidos, tons de cinza escuro e sepia, teias de aranha decorativas, crânios decorativos, atmosfera nebulosa.",
    gradient: "from-gray-400 to-zinc-500",
    accentColor: "#3f3f46",
    image: "/styles/assustador.jpg",
    category: "fantasia",
  },
  {
    id: "egipcio-antigo",
    name: "Egipcio Antigo",
    description: "Faraos, ouro e hieroglifos",
    longDescription:
      "Inspirado no Egito dos faraos. Dourado, pedra calcaria, hieroglifos e a grandiosidade das piramides.",
    promptDescriptor:
      "Estilo Egipcio Antigo: grandiosidade faraonica. Use colunas com capiteis de papiro e lotus, hieroglifos nas paredes, dourado abundante, pedra calcaria, moveis de madeira escura com incrustacoes douradas, estatuas de esfinges, tons de dourado, turquesa e areia, iluminacao quente e dramatica.",
    gradient: "from-amber-200 to-yellow-200",
    accentColor: "#ca8a04",
    image: "/styles/egipcio-antigo.jpg",
    category: "fantasia",
  },
  {
    id: "chale-de-esqui",
    name: "Chale de Esqui",
    description: "Aconchego alpino com lareira e madeira",
    longDescription:
      "Inspirado em chales de montanha. Madeira rustica, lareira central, peles e mantas, e vista para a neve.",
    promptDescriptor:
      "Estilo Chale de Esqui/Alpine Lodge: aconchego de montanha. Use madeira rustica clara no teto e paredes, lareira grande de pedra, peles e mantas de la sobre sofas, tapetes grossos, janelas panoramicas, tons quentes (marrom, creme, vermelho), luminarias de chifre, esquis decorativos.",
    gradient: "from-amber-50 to-stone-200",
    accentColor: "#78350f",
    image: "/styles/chale-de-esqui.jpg",
    category: "fantasia",
  },
  {
    id: "chocolate",
    name: "Chocolate",
    description: "Tons marrons ricos e acolhedores",
    longDescription:
      "Ambientes dominados por tons de chocolate. Marrons ricos, texturas aveludadas e uma sensacao de indulgencia.",
    promptDescriptor:
      "Estilo Chocolate: indulgencia marrom. Use tons ricos de chocolate (marrom escuro, cappuccino, caramelo), texturas aveludadas, madeira escura, couro marrom, almofadas em tons de cafe, iluminacao quente dourada, detalhes em cobre e bronze, atmosfera sofisticada e acolhedora.",
    gradient: "from-amber-200 to-orange-200",
    accentColor: "#7c2d12",
    image: "/styles/chocolate.jpg",
    category: "fantasia",
  },
  {
    id: "anos-50",
    name: "Estilo dos Anos 50",
    description: "Retro americano com cores pop",
    longDescription:
      "Inspirado nos anos 50 americanos. Diners, cores pastel vibrantes, cromados e a estetica do rock and roll.",
    promptDescriptor:
      "Estilo Anos 50/Retro Americano: nostalgia pop. Use cores pastel vibrantes (rosa, turquesa, amarelo), moveis com pernas palu, cromados brilhantes, piso xadrez preto e branco, jukebox, neon, eletrodomesticos retro, formica colorida, estampas de poa.",
    gradient: "from-teal-100 to-pink-100",
    accentColor: "#0d9488",
    image: "/styles/anos-50.jpg",
    category: "fantasia",
  },
];

export function getStyleById(id: string): ArchitecturalStyle | undefined {
  return ARCHITECTURAL_STYLES.find((s) => s.id === id);
}

export function getStylesByCategory(category: StyleCategory): ArchitecturalStyle[] {
  return ARCHITECTURAL_STYLES.filter((s) => s.category === category);
}
