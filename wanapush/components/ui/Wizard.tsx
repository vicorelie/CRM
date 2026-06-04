"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import type { ReactNode } from "react";

export type WizardStepDef = {
  id: string;
  title: string;
  icon?: string;
};

type Props = {
  steps: WizardStepDef[];
  currentIndex: number;
  /** Total time minute estimate, optionnel. */
  estimatedMinutes?: number;
  /** Href de retour (utilisé par le bouton "Quitter" et le breadcrumb). */
  exitHref: string;
  /** Libellé de la page de retour (ex: "Publicité payante", "Réseaux sociaux"). */
  exitLabel: string;
  onExit?: () => void;
  children: ReactNode;
};

export function Wizard({
  steps,
  currentIndex,
  estimatedMinutes,
  exitHref,
  exitLabel,
  onExit,
  children,
}: Props) {
  const { t } = useT();
  const total = steps.length;
  const current = steps[currentIndex];
  const progressPct = Math.round(((currentIndex + 1) / total) * 100);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* Sub-header avec lien retour + step info + progress */}
      <div className="sticky top-[68px] z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-3">
          <Link
            href={exitHref}
            className="whitespace-nowrap text-xs text-zinc-500 transition-colors hover:text-brand-700"
          >
            ← {exitLabel}
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          <div className="min-w-[200px] flex-1">
            <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              {t("wizard.step")} {currentIndex + 1} {t("wizard.of")} {total}
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              {current?.icon && <span>{current.icon}</span>}
              {current?.title}
            </div>
          </div>
          {estimatedMinutes != null && (
            <div className="hidden text-xs text-zinc-500 sm:block">
              {t("wizard.estimatedTime", { minutes: estimatedMinutes })}
            </div>
          )}
          <LangSwitcher />
          {onExit && (
            <button
              onClick={onExit}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:border-zinc-400"
            >
              {t("wizard.exit")}
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 overflow-hidden bg-zinc-100">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stepper compact (desktop) */}
      <nav className="hidden border-b border-zinc-200 bg-zinc-50/60 md:block">
        <ol className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-6 py-3 text-xs">
          {steps.map((s, i) => {
            const isCurrent = i === currentIndex;
            const isDone = i < currentIndex;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                    isCurrent
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : isDone
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-white text-zinc-400"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden lg:inline ${
                    isCurrent ? "font-medium text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  {s.title}
                </span>
                {i < steps.length - 1 && (
                  <span className="mx-1 text-zinc-300">→</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </section>
    </main>
  );
}

/**
 * Layout réutilisable pour une étape : titre + sous-titre + corps + footer nav.
 */
type StepShellProps = {
  icon?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Boutons de footer (Back / Next custom). */
  footer?: ReactNode;
};

export function StepShell({ icon, title, subtitle, children, footer }: StepShellProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        {icon && <div className="text-5xl">{icon}</div>}
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-base text-zinc-600 sm:text-lg">{subtitle}</p>
        )}
      </header>
      <div className="space-y-6">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6">
          {footer}
        </footer>
      )}
    </div>
  );
}

/**
 * Bloc "Pourquoi ?" — explication contextuelle d'un concept.
 */
export function InfoCard({
  title,
  children,
  variant = "neutral",
}: {
  title: string;
  children: ReactNode;
  variant?: "neutral" | "tip" | "warn";
}) {
  const styles = {
    neutral: "border-zinc-200 bg-white shadow-soft",
    tip: "border-brand-200 bg-brand-50/50",
    warn: "border-amber-200 bg-amber-50",
  }[variant];
  return (
    <section className={`rounded-2xl border p-5 ${styles}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

/**
 * Liste numérotée d'instructions pour les tutos "Comment créer X".
 */
export function HowToList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-xs font-bold text-brand-700">
            {i + 1}
          </span>
          <p className="pt-0.5 text-sm leading-relaxed text-zinc-700">
            <MD>{step}</MD>
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Rendu inline du markdown minimal supporté dans nos configs : **bold** uniquement.
 */
export function MD({ children }: { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-zinc-950">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * Lien externe stylisé (ouvre un nouvel onglet).
 */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
    >
      {children}
      <span className="text-xs">↗</span>
    </a>
  );
}

/**
 * Choix binaire "Oui / Non" pour les checkpoints.
 */
export function YesNoChoice({
  yesLabel,
  noLabel,
  onYes,
  onNo,
}: {
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        onClick={onYes}
        className="group rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-lift"
      >
        <div className="mb-1 text-2xl">✅</div>
        <div className="font-semibold text-emerald-800">{yesLabel}</div>
      </button>
      <button
        onClick={onNo}
        className="group rounded-2xl border-2 border-zinc-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50/40 hover:shadow-lift"
      >
        <div className="mb-1 text-2xl">🆘</div>
        <div className="font-semibold text-zinc-900">{noLabel}</div>
      </button>
    </div>
  );
}

/**
 * Footer de navigation standard (Back / Next).
 */
export function NavFooter({
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  const { t } = useT();
  return (
    <>
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-400"
          >
            ← {backLabel ?? t("common.back")}
          </button>
        )}
      </div>
      <div>
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabel ?? t("common.next")} →
          </button>
        )}
      </div>
    </>
  );
}
