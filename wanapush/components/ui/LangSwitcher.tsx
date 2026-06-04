"use client";

import { useT } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/messages";

const FLAGS: Record<Locale, string> = { fr: "🇫🇷", en: "🇬🇧" };

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useT();
  const other: Locale = locale === "fr" ? "en" : "fr";
  return (
    <button
      onClick={() => setLocale(other)}
      title={other.toUpperCase()}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-slate-500 px-2.5 py-1.5 text-xs font-medium ${className}`}
    >
      <span className="text-base leading-none">{FLAGS[locale]}</span>
      <span className="uppercase text-slate-300">{locale}</span>
    </button>
  );
}
