import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  Ruler,
  Sparkles,
  Eye,
  ArrowRight,
  Building2,
  Palette,
  Download,
} from "lucide-react";

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Blueprint grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(var(--primary) 1px, transparent 1px),
              linear-gradient(90deg, var(--primary) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Accent glow */}
      <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-brand-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-brand-primary/10 blur-[100px]" />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left content */}
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-accent/5 px-4 py-1.5 text-xs font-medium tracking-wide text-brand-accent">
              <Sparkles className="h-3.5 w-3.5" />
              DESIGN INTELIGENTE COM IA
            </div>

            <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold leading-[1.1] tracking-tight text-brand-primary sm:text-5xl lg:text-6xl">
              Sua casa{" "}
              <span className="relative inline-block">
                ideal
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 8C40 2 100 2 198 8"
                    stroke="#E8A838"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              ,<br />
              projetada por IA.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-neutral-dark">
              Responda algumas perguntas sobre seu terreno e estilo de vida. Nossa
              inteligencia artificial gera plantas, visualizacoes e renderizacoes
              fotorrealistas dos seus comodos em minutos.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/wizard"
                className="group inline-flex items-center gap-2 rounded-xl bg-brand-primary px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition-all hover:shadow-xl hover:shadow-brand-primary/30 hover:brightness-110"
              >
                Iniciar Meu Projeto
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="text-xs text-muted-foreground">
                Gratuito &bull; Sem cadastro
              </span>
            </div>
          </div>

          {/* Right visual - architectural composition */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-[4/3] w-full">
              {/* Main "blueprint" card */}
              <div className="absolute inset-4 rounded-2xl border border-brand-primary/10 bg-white/80 p-8 shadow-2xl shadow-brand-primary/5 backdrop-blur-sm">
                {/* Decorative blueprint lines */}
                <div className="absolute inset-6 rounded-lg border border-dashed border-brand-primary/10" />
                <div className="absolute left-1/2 top-6 bottom-6 w-px border-l border-dashed border-brand-primary/5" />
                <div className="absolute top-1/2 left-6 right-6 h-px border-t border-dashed border-brand-primary/5" />

                {/* Room blocks */}
                <div className="relative z-10 grid h-full grid-cols-3 grid-rows-2 gap-3 p-2">
                  <div className="col-span-2 rounded-lg bg-brand-primary/[0.04] p-3 ring-1 ring-brand-primary/10">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-brand-primary/50">
                      Sala de Estar
                    </span>
                  </div>
                  <div className="rounded-lg bg-brand-accent/[0.06] p-3 ring-1 ring-brand-accent/20">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-brand-accent/60">
                      Cozinha
                    </span>
                  </div>
                  <div className="rounded-lg bg-brand-primary/[0.03] p-3 ring-1 ring-brand-primary/8">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-brand-primary/40">
                      Suite
                    </span>
                  </div>
                  <div className="rounded-lg bg-brand-primary/[0.03] p-3 ring-1 ring-brand-primary/8">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-brand-primary/40">
                      Quarto
                    </span>
                  </div>
                  <div className="rounded-lg bg-brand-primary/[0.02] p-3 ring-1 ring-brand-primary/6">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-brand-primary/30">
                      Garagem
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating metric badge */}
              <div className="absolute -right-2 top-8 rounded-lg border border-border/60 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Area total
                </p>
                <p className="font-[family-name:var(--font-dm-sans)] text-lg font-bold text-brand-primary">
                  142m<sup className="text-xs">2</sup>
                </p>
              </div>

              {/* Floating style badge */}
              <div className="absolute -left-2 bottom-12 rounded-lg border border-brand-accent/30 bg-white px-3 py-2 shadow-lg">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Estilo
                </p>
                <p className="font-[family-name:var(--font-dm-sans)] text-sm font-bold text-brand-accent">
                  Japandi
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Ruler,
      title: "Descreva seu projeto",
      description:
        "Informe dados do terreno, preferencias de estilo, numero de comodos e necessidades da sua familia.",
    },
    {
      number: "02",
      icon: Sparkles,
      title: "IA gera seu projeto",
      description:
        "Nossa inteligencia artificial cria a planta 2D e renderiza cada comodo no estilo escolhido.",
    },
    {
      number: "03",
      icon: Eye,
      title: "Visualize e ajuste",
      description:
        "Explore cada comodo, regenere o que quiser e exporte as imagens em alta resolucao.",
    },
  ];

  return (
    <section className="border-t border-border/40 bg-white/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl">
            Como funciona
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Tres passos simples para transformar suas ideias em um projeto
            arquitetonico completo.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="group relative">
              <div className="mb-5 flex items-center gap-4">
                <span className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold text-brand-accent/20">
                  {step.number}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-primary transition-colors group-hover:bg-brand-accent/10 group-hover:text-brand-accent">
                  <step.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold text-brand-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StylesSection() {
  const styles = [
    {
      name: "Japandi",
      description: "Minimalismo japones com aconchego escandinavo",
      gradient: "from-amber-50 to-stone-100",
      accent: "bg-amber-800",
    },
    {
      name: "Moderno",
      description: "Linhas retas, vidro e espacos amplos",
      gradient: "from-slate-50 to-zinc-100",
      accent: "bg-slate-700",
    },
    {
      name: "Minimalista",
      description: "Funcional, clean, menos e mais",
      gradient: "from-gray-50 to-neutral-100",
      accent: "bg-gray-600",
    },
    {
      name: "Rustico",
      description: "Madeira, pedra natural e natureza",
      gradient: "from-orange-50 to-amber-100",
      accent: "bg-orange-800",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl">
            Estilos disponiveis
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Escolha o estilo que combina com voce. Cada comodo sera renderizado
            com consistencia visual.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {styles.map((style) => (
            <div
              key={style.name}
              className="group cursor-default overflow-hidden rounded-2xl border border-border/60 bg-white transition-all hover:border-brand-accent/40 hover:shadow-lg hover:shadow-brand-accent/5"
            >
              <div
                className={`flex h-36 items-end bg-gradient-to-br ${style.gradient} p-5`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${style.accent} ring-2 ring-white`}
                  />
                  <h3 className="font-[family-name:var(--font-dm-sans)] text-lg font-bold text-brand-primary">
                    {style.name}
                  </h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground">
                  {style.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Building2,
      title: "Planta 2D humanizada",
      description:
        "Geracao automatica de planta baixa com IA, facil de entender.",
    },
    {
      icon: Palette,
      title: "Renderizacao por comodo",
      description:
        "Cada comodo e renderizado individualmente com consistencia de estilo.",
    },
    {
      icon: Eye,
      title: "Regenere e ajuste",
      description:
        "Nao gostou? Regenere qualquer comodo mantendo a harmonia do projeto.",
    },
    {
      icon: Download,
      title: "Exporte tudo",
      description:
        "Baixe as imagens em alta resolucao para apresentar ao seu cliente.",
    },
  ];

  return (
    <section className="border-t border-border/40 bg-white/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-brand-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-primary px-8 py-16 text-center sm:px-16">
          {/* Pattern overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `
                  linear-gradient(white 1px, transparent 1px),
                  linear-gradient(90deg, white 1px, transparent 1px)
                `,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-accent/10 blur-[80px]" />

          <div className="relative z-10">
            <h2 className="font-[family-name:var(--font-dm-sans)] text-3xl font-bold text-white sm:text-4xl">
              Pronto para projetar?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-brand-surface/70">
              Comece agora e veja sua casa ganhar vida com inteligencia artificial.
            </p>
            <Link
              href="/wizard"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-accent/30 transition-all hover:shadow-xl hover:brightness-110"
            >
              Comecar Agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <AppShell>
      <HeroSection />
      <HowItWorksSection />
      <StylesSection />
      <FeaturesSection />
      <CTASection />
    </AppShell>
  );
}
