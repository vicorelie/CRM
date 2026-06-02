"use client";

import { useState } from "react";
import { AccountsTab } from "./AccountsTab";
import { AudiencesTab } from "./AudiencesTab";
import { CampaignsList } from "./CampaignsList";
import { RoasOptimizer } from "./RoasOptimizer";

type Tab = "accounts" | "campaigns" | "audiences" | "optimizer";

export function AdsClient() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [refreshKey, setRefreshKey] = useState(0);

  function tabClass(t: Tab) {
    return `px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      tab === t
        ? "text-brand-700 border-brand"
        : "text-zinc-500 border-transparent hover:text-zinc-800"
    }`;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 -mb-px border-b border-zinc-200 overflow-x-auto">
        <button onClick={() => setTab("accounts")} className={tabClass("accounts")}>
          🔌 Comptes pub
        </button>
        <button onClick={() => setTab("campaigns")} className={tabClass("campaigns")}>
          📚 Mes campagnes
        </button>
        <button onClick={() => setTab("audiences")} className={tabClass("audiences")}>
          🎯 Audiences
        </button>
        <button onClick={() => setTab("optimizer")} className={tabClass("optimizer")}>
          📈 Optimiseur ROAS
        </button>
      </div>

      {tab === "accounts" && <AccountsTab onChange={() => setRefreshKey((k) => k + 1)} />}
      {tab === "campaigns" && <CampaignsList refreshKey={refreshKey} />}
      {tab === "audiences" && <AudiencesTab />}
      {tab === "optimizer" && <RoasOptimizer />}
    </div>
  );
}
