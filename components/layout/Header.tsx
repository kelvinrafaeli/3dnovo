"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Construlink" className="h-8" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/wizard"
            className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md"
          >
            Iniciar Projeto
          </Link>
        </nav>
      </div>
    </header>
  );
}
