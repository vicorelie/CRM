"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  messages,
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type MessageKey,
} from "./messages";

const COOKIE_NAME = "wp_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Démarrage en DEFAULT_LOCALE pour éviter les mismatch SSR/CSR.
  // Au mount, on lit le cookie et on bascule si nécessaire (côté client uniquement).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const fromCookie = readCookie(COOKIE_NAME);
    if (fromCookie && LOCALES.includes(fromCookie as Locale)) {
      setLocaleState(fromCookie as Locale);
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    writeCookie(COOKIE_NAME, l);
  }

  function t(key: MessageKey, vars?: Record<string, string | number>): string {
    const dict = messages[locale];
    const tmpl = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return interpolate(tmpl, vars);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx;
}
