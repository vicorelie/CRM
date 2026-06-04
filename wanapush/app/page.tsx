import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo height={36} priority />
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 font-medium text-zinc-700 hover:text-zinc-950 transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-zinc-950 px-4 py-2 font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Créer un compte
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-16 pb-24 text-center sm:pt-24 sm:pb-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            Plateforme en cours d&apos;initialisation
          </div>

          <h1 className="text-balance text-5xl font-black tracking-tight text-zinc-950 sm:text-7xl">
            Marketing digital,{" "}
            <span className="text-brand">full-stack</span>, propulsé par l&apos;IA.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-zinc-600 sm:text-lg">
            Réseaux sociaux, ads, SEO, GBP, leads, analytics — un seul tableau
            de bord, douze modules connectés.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-zinc-800 transition-colors"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p className="mt-16 text-xs uppercase tracking-widest text-zinc-400">
            Next.js · Prisma · Tailwind · Claude Opus 4.7
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
          <span>© {new Date().getFullYear()} WanaPush</span>
          <span>Conçu pour aller vite.</span>
        </div>
      </footer>
    </main>
  );
}
