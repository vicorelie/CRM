"use client";

import { useT } from "@/lib/i18n/context";
import type { LocalizedString } from "./types";

/**
 * Hook qui résout une LocalizedString selon la locale active.
 */
export function useLocalized() {
  const { locale } = useT();
  return (s: LocalizedString): string => s[locale];
}
