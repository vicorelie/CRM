"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <I18nProvider>{children}</I18nProvider>
    </SessionProvider>
  );
}
