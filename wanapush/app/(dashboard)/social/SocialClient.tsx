"use client";

import { useState } from "react";
import { AccountsTab } from "./tabs/AccountsTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { ScheduleTab } from "./tabs/ScheduleTab";

const TABS = [
  { id: "accounts", label: "Comptes" },
  { id: "schedule", label: "Calendrier & Composer" },
  { id: "analytics", label: "Analytics" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SocialClient() {
  const [tab, setTab] = useState<TabId>("accounts");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-brand text-brand-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "accounts" && <AccountsTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}
