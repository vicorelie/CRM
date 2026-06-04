"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SeoAuditClient } from "./SeoAuditClient";
import { SitewideOptimizer } from "./SitewideOptimizer";

type SiteSummary = {
  id: string;
  url: string;
  label: string | null;
  platform: string;
  status: string;
  meta?: { rootPath?: string; capabilities?: { seoPlugin?: string } } | null;
};

type Mode = "page" | "site";

export function SeoModeSwitcher() {
  const [mode, setMode] = useState<Mode>("page");
  const [sites, setSites] = useState<SiteSummary[] | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((j) => {
        const list: SiteSummary[] = j.sites ?? [];
        setSites(list);
        const connected = list.find((s) => s.status === "CONNECTED");
        if (connected) setSelectedSiteId(connected.id);
      })
      .catch(() => setSites([]));
  }, []);

  const connected = sites?.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex gap-1 -mb-px">
          <button
            onClick={() => setMode("page")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              mode === "page"
                ? "text-brand-700 border-brand"
                : "text-zinc-500 border-transparent hover:text-zinc-800"
            }`}
          >
            🔍 Une page
          </button>
          <button
            onClick={() => setMode("site")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              mode === "site"
                ? "text-brand-700 border-brand"
                : "text-zinc-500 border-transparent hover:text-zinc-800"
            }`}
          >
            🌐 Site complet
          </button>
        </div>
        {sites && sites.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Site :</span>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white/60 px-2 py-1 text-zinc-800 max-w-[420px]"
            >
              <option value="">— Aucun —</option>
              {sites.map((s) => {
                // Affiche URL publique en priorité, label en suffixe si fourni
                // Pour SFTP : ajoute le rootPath pour différencier 2 sites sur le même serveur
                const baseLabel = s.url + (s.label ? ` — ${s.label}` : "");
                const suffix =
                  s.platform === "SFTP_HTML" && s.meta?.rootPath
                    ? ` [${s.meta.rootPath}]`
                    : "";
                return (
                  <option key={s.id} value={s.id}>
                    {baseLabel}{suffix} ({s.platform})
                  </option>
                );
              })}
            </select>
            <Link
              href="/sites"
              className="text-zinc-400 hover:text-brand-700 underline"
            >
              gérer
            </Link>
          </div>
        )}
      </div>

      {/* Panneau info détaillé du site sélectionné */}
      {connected && (
        <div className="rounded-lg border border-zinc-200 bg-white/40 p-3 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-zinc-400">Site sélectionné :</span>
          <span className="text-brand-700 font-mono">{connected.url}</span>
          <span className="text-zinc-300">·</span>
          <span className="text-zinc-500">
            <span className="text-zinc-400">Plateforme :</span> {connected.platform}
          </span>
          {connected.platform === "SFTP_HTML" && connected.meta?.rootPath && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-500">
                <span className="text-zinc-400">Serveur :</span>{" "}
                <code className="text-amber-800 font-mono">{connected.meta.rootPath}</code>
              </span>
            </>
          )}
          {connected.platform === "WORDPRESS" && connected.meta?.capabilities?.seoPlugin && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-500">
                <span className="text-zinc-400">Plugin SEO :</span>{" "}
                <span className="text-emerald-700">{connected.meta.capabilities.seoPlugin}</span>
              </span>
            </>
          )}
        </div>
      )}

      {mode === "page" && <SeoAuditClient />}
      {mode === "site" && (
        <>
          {!connected && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-amber-200">
                  Aucun site connecté
                </h3>
                <p className="text-sm text-amber-100/80">
                  Pour optimiser tout un site, il faut le connecter via le
                  module "Mes sites" (le plugin WordPress doit être installé).
                </p>
                <Link
                  href="/sites"
                  className="inline-block rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 mt-1"
                >
                  + Connecter mon site
                </Link>
              </div>
            </div>
          )}
          {connected && (
            <SitewideOptimizer rootUrl={connected.url} siteId={connected.id} />
          )}
        </>
      )}
    </div>
  );
}
