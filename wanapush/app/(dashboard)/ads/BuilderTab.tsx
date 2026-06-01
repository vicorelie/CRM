"use client";

import { useState } from "react";
import { CampaignBuilder } from "./CampaignBuilder";
import { GoogleAdsBuilder } from "./GoogleAdsBuilder";
import { AdPlatform, PLATFORM_META } from "./types";

type Props = { onSaved: () => void };

const PLATFORMS: Array<{ id: AdPlatform; native: boolean }> = [
  { id: "META_ADS", native: false },
  { id: "GOOGLE_ADS", native: true }, // push réel implémenté
  { id: "TIKTOK_ADS", native: false },
  { id: "LINKEDIN_ADS", native: false },
];

export function BuilderTab({ onSaved }: Props) {
  const [platform, setPlatform] = useState<AdPlatform | null>(null);

  if (!platform) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Sur quelle plateforme ?</h3>
        <p className="text-sm text-zinc-500">
          Chaque plateforme a son propre formulaire spécialisé adapté à ses
          contraintes (mots-clés Google, audiences Meta, etc.).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map((p) => {
            const meta = PLATFORM_META[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className="group rounded-xl border border-zinc-200 hover:border-brand bg-white/60 px-4 py-6 text-center transition-all"
              >
                <div className="text-3xl mb-2">{meta.emoji}</div>
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="text-[10px] mt-2">
                  {p.native ? (
                    <span className="text-emerald-700">
                      ✓ Push réel sur la plateforme
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Builder + copy IA (push manuel)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setPlatform(null)}
        className="text-xs text-zinc-500 hover:text-brand-700"
      >
        ← Changer de plateforme
      </button>

      {platform === "GOOGLE_ADS" ? (
        <GoogleAdsBuilder onSaved={onSaved} />
      ) : platform === "META_ADS" ? (
        <>
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            ✨ Pour {PLATFORM_META[platform].label}, le builder génère la copy IA
            et peut pousser la campagne directement (en PAUSED) sur Meta Ads Manager
            via le bouton 🚀 Lancer depuis « Mes campagnes ». La génération d&apos;image IA
            est intégrée au flow de push.
          </div>
          <CampaignBuilder onSaved={onSaved} />
        </>
      ) : (
        <>
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠ Pour {PLATFORM_META[platform].label}, le builder génère la copy IA
            mais ne pousse pas encore la campagne automatiquement (à venir).
            En attendant : copie la copy dans l&apos;Ad Manager natif.
          </div>
          <CampaignBuilder onSaved={onSaved} />
        </>
      )}
    </div>
  );
}
