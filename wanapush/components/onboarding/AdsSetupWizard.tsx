"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { useLocalized } from "@/lib/onboarding/helpers";
import type { PlatformWizardConfig } from "@/lib/onboarding/types";
import { Wizard, type WizardStepDef } from "@/components/ui/Wizard";
import { PlatformWizardStep } from "./AdsSetupSteps";

export function AdsSetupWizard({ cfg }: { cfg: PlatformWizardConfig }) {
  const { t } = useT();
  const L = useLocalized();
  const router = useRouter();
  const params = useSearchParams();
  const storageKey = `wp:wizard:${cfg.slug}:step`;
  const total = cfg.checkpoints.length + 4; // welcome + N + connect + select + success
  const SELECT_INDEX = cfg.checkpoints.length + 2;
  const CONNECT_INDEX = cfg.checkpoints.length + 1;

  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const SUCCESS_INDEX = total - 1;

  useEffect(() => {
    const postOauth = params.get("postOauth") === "1";
    const oauthError = params.get("error");
    if (postOauth) {
      setIndex(SELECT_INDEX);
      localStorage.setItem(storageKey, String(SELECT_INDEX));
    } else if (oauthError) {
      setIndex(CONNECT_INDEX);
    } else {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = parseInt(saved, 10);
        // Si on a fini précédemment (étape success), on vérifie qu'au moins un
        // compte est encore connecté — sinon on repart de zéro (= l'user a
        // probablement déconnecté ses comptes et veut reconfigurer).
        if (n === SUCCESS_INDEX) {
          fetch(cfg.accountsApiPath)
            .then((r) => r.json())
            .then((j) => {
              const has = (j.accounts ?? []).some(
                (a: { platform: string }) => a.platform === cfg.platform,
              );
              if (has) {
                setIndex(SUCCESS_INDEX);
              } else {
                setIndex(0);
                localStorage.removeItem(storageKey);
              }
            })
            .catch(() => setIndex(0));
        } else if (!isNaN(n) && n >= 0 && n < total) {
          setIndex(n);
        }
      }
    }
    setHydrated(true);
  }, [
    params,
    SELECT_INDEX,
    CONNECT_INDEX,
    SUCCESS_INDEX,
    storageKey,
    total,
    cfg.accountsApiPath,
    cfg.platform,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, String(index));
  }, [index, hydrated, storageKey]);

  function goNext() {
    setIndex((i) => Math.min(i + 1, total - 1));
  }
  function goBack() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  const steps: WizardStepDef[] = [
    { id: "welcome", title: L(cfg.welcome.title), icon: cfg.icon },
    ...cfg.checkpoints.map((c) => ({
      id: c.id,
      title: L(c.title),
      icon: c.icon,
    })),
    { id: "connect", title: L(cfg.connect.title), icon: "🔐" },
    { id: "select", title: t("selectAccount.title"), icon: "🎯" },
    { id: "success", title: L(cfg.success.title), icon: "🎉" },
  ];

  const oauthError = params.get("error");

  return (
    <Wizard
      steps={steps}
      currentIndex={index}
      estimatedMinutes={cfg.estimatedMinutes}
      exitHref={cfg.exitHref}
      exitLabel={cfg.kind === "ads" ? "Publicité payante" : "Réseaux sociaux"}
      onExit={() => {
        if (confirm(t("wizard.exitConfirm"))) {
          // Reset complet du wizard pour ne pas se retrouver coincé sur Select
          // ou Success au prochain passage.
          localStorage.removeItem(storageKey);
          router.push(cfg.exitHref);
        }
      }}
    >
      {oauthError && index === CONNECT_INDEX && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
          ⚠ {oauthError}
        </div>
      )}
      <PlatformWizardStep
        cfg={cfg}
        stepIndex={index}
        onNext={goNext}
        onBack={goBack}
      />
    </Wizard>
  );
}
