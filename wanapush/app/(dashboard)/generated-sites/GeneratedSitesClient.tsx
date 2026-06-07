"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CampaignFromSiteModal } from "./_components/CampaignFromSiteModal";

type GeneratedSiteListItem = {
  id: string;
  createdAt: string;
  brandName: string;
  sector: string;
  type: string;
  framework: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  designProfile: string | null;
  pageCount: number;
  homeTitle: string;
  siteSlug: string | null;
  previewUrl: string | null;
  audience?: string | null;
  tone?: string | null;
  lang?: string | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GeneratedSitesClient() {
  const [sites, setSites] = useState<GeneratedSiteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchSite, setLaunchSite] = useState<GeneratedSiteListItem | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generated-site");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Erreur de chargement");
        return;
      }
      setSites(json.sites ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function remove(id: string, brandName: string) {
    if (!confirm(`Supprimer "${brandName}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/generated-site/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Erreur : ${json?.error ?? res.status}`);
      return;
    }
    setSites((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Chargement…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        ⚠ {error}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-8 text-center space-y-4">
        <div className="text-5xl">✨</div>
        <p className="text-zinc-700">Tu n'as encore généré aucun site.</p>
        <Link
          href="/generate"
          className="inline-block rounded-lg bg-brand hover:bg-brand-400 transition-colors px-5 py-2.5 text-sm font-semibold text-white"
        >
          🎨 Générer mon premier site
        </Link>
      </div>
    );
  }

  return (
    <>
      {launchSite && (
        <CampaignFromSiteModal
          site={launchSite}
          onClose={() => setLaunchSite(null)}
        />
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {sites.length} site{sites.length > 1 ? "s" : ""} généré
            {sites.length > 1 ? "s" : ""}.
          </p>
          <Link
            href="/generate"
            className="rounded-lg bg-brand hover:bg-brand-400 transition-colors px-4 py-2 text-sm font-semibold text-white"
          >
            + Nouveau site
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((s) => (
            <SiteCard
              key={s.id}
              site={s}
              onDelete={() => remove(s.id, s.brandName)}
              onLaunch={() => setLaunchSite(s)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function SiteCard({
  site,
  onDelete,
  onLaunch,
}: {
  site: GeneratedSiteListItem;
  onDelete: () => void;
  onLaunch: () => void;
}) {
  const [rebuilding, setRebuilding] = useState(false);

  // Si le site est en React et a été extrait/buildé, on pointe sur le vrai preview React
  // (qui montre le rendu réel avec animations, composants, etc.)
  // Sinon, on retombe sur l'aperçu HTML statique servi par l'API
  const isReact = site.framework === "react" && !!site.siteSlug;
  const previewUrl = isReact
    ? (site.previewUrl ?? `/preview/${site.siteSlug}/`)
    : `/api/generated-site/${site.id}/preview/index.html`;
  const zipUrl = `/api/generated-site/${site.id}?format=zip`;

  // Clic "Aperçu" :
  // - HTML : ouverture directe (laisse le <a target="_blank"> faire)
  // - React : on ouvre tout de suite une fenêtre en about:blank pour préserver
  //   le user-gesture (sinon popup blocker après le await fetch), puis on y
  //   redirige une fois le HEAD/rebuild résolus.
  async function onPreview(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isReact) return;
    e.preventDefault();

    // Ouvre IMMÉDIATEMENT — sans noopener car on doit pouvoir naviguer la fenêtre
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      // Popup bloqué dès le départ → fallback navigation dans l'onglet courant
      window.location.href = previewUrl;
      return;
    }

    try {
      const head = await fetch(previewUrl, { method: "HEAD" });
      if (head.ok) {
        previewWindow.location.href = previewUrl;
        return;
      }
    } catch {
      // ignore — on tente le rebuild
    }

    setRebuilding(true);
    try {
      const res = await fetch(`/api/generated-site/${site.id}/rebuild`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        previewWindow.location.href = json.previewUrl ?? previewUrl;
      } else {
        previewWindow.close();
        alert("Build échoué : " + (json.error ?? "Erreur inconnue"));
      }
    } catch (err) {
      previewWindow.close();
      alert("Erreur réseau : " + (err instanceof Error ? err.message : "Inconnu"));
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur overflow-hidden flex flex-col">
      <div
        className="h-40 relative"
        style={{
          background:
            site.primaryColor && site.secondaryColor
              ? `linear-gradient(135deg, ${site.primaryColor} 0%, ${site.secondaryColor} 100%)`
              : "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
        }}
      >
        <iframe
          src={previewUrl}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: "scale(0.4)",
            transformOrigin: "top left",
            width: "250%",
            height: "250%",
          }}
          sandbox="allow-same-origin allow-scripts"
          title={`Preview ${site.brandName}`}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-white uppercase">
            {site.framework === "react" ? "React" : "HTML"}
          </span>
          <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-white uppercase">
            {site.pageCount} page{site.pageCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 truncate">
            {site.brandName}
          </h3>
          {site.sector && (
            <p className="text-xs text-zinc-500 line-clamp-2">{site.sector}</p>
          )}
          <div className="text-[11px] text-zinc-400 pt-1">
            {formatDate(site.createdAt)}
            {site.designProfile && (
              <>
                {" · "}
                <span className="text-brand-700">{site.designProfile}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onPreview}
            className={`flex-1 text-center text-xs rounded-lg transition-colors px-3 py-2 font-semibold inline-flex items-center justify-center gap-1.5 ${
              rebuilding
                ? "bg-amber-50 text-white cursor-wait"
                : "bg-brand hover:bg-brand-400 text-white"
            }`}
          >
            {rebuilding ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/></svg>
                Build en cours…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Aperçu
              </>
            )}
          </a>
          {isReact && site.siteSlug && (
            <a
              href={`/preview/${site.siteSlug}/?edit=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs rounded-lg border border-brand/40 hover:border-brand-400 hover:bg-brand/10 transition-colors px-3 py-2 text-brand-700 hover:text-brand-700 inline-flex items-center gap-1.5 font-semibold"
              title="Éditer (mode WYSIWYG)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Éditer
            </a>
          )}
          {isReact && site.siteSlug && (
            <Link
              href={`/shop/${site.siteSlug}`}
              className="text-xs rounded-lg border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-50 transition-colors px-3 py-2 text-emerald-700 hover:text-emerald-100 inline-flex items-center gap-1.5 font-semibold"
              title="Gérer la boutique"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Boutique
            </Link>
          )}
          <a
            href={zipUrl}
            download
            className="text-xs rounded-lg border border-zinc-200 hover:border-emerald-500/60 hover:bg-emerald-50 transition-colors px-3 py-2 text-zinc-700 hover:text-emerald-700"
            title="Télécharger ZIP"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          {site.siteSlug && (
            <Link
              href={`/generated-sites/${site.id}/pixel`}
              className="text-xs rounded-lg border border-zinc-200 hover:border-blue-500/60 hover:bg-blue-50 transition-colors px-3 py-2 text-zinc-700 hover:text-blue-700"
              title="Tracking publicitaire Meta Pixel + CAPI"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          )}
          <button
            onClick={onLaunch}
            className="text-xs rounded-lg border border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-colors px-3 py-2 text-violet-700 font-semibold inline-flex items-center gap-1"
            title="Lancer une campagne publicitaire"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l-4 4 4 4M3 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Pub
          </button>
          <button
            onClick={onDelete}
            className="text-xs rounded-lg border border-red-200 hover:border-red-500 hover:bg-red-50 transition-colors px-3 py-2 text-red-700"
            title="Supprimer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
