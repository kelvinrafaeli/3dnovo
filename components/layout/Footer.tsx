export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p>&copy; {new Date().getFullYear()} Construlink. Todos os direitos reservados.</p>
        <p className="hidden sm:block">Design arquitetonico inteligente com IA</p>
      </div>
    </footer>
  );
}
