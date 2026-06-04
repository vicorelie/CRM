"use client";

import { useEffect, useState } from "react";

type Site = {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  status: "PENDING" | "CONNECTED" | "FAILED";
  lastTestAt: string | null;
  lastError: string | null;
  meta: {
    capabilities?: {
      seoPlugin?: string;
      canEditPages?: boolean;
    };
    info?: { name?: string; pagesCount?: number };
  } | null;
};

const STATUS_BADGE: Record<Site["status"], string> = {
  CONNECTED: "border-emerald-500/40 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  PENDING: "border-zinc-300/40 bg-zinc-100 text-zinc-700",
};

export function SitesClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/sites");
      const json = await res.json();
      setSites(json.sites ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {loading
            ? "Chargement…"
            : sites.length === 0
              ? "Aucun site connecté pour le moment."
              : `${sites.length} site${sites.length > 1 ? "s" : ""} connecté${sites.length > 1 ? "s" : ""}.`}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand hover:bg-brand-400 transition-colors px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Annuler" : "+ Connecter un site"}
        </button>
      </div>

      {showForm && <ConnectForm onConnected={() => { setShowForm(false); refresh(); }} />}

      {sites.length > 0 && (
        <div className="space-y-3">
          {sites.map((s) => (
            <SiteRow key={s.id} site={s} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function SiteRow({ site, onChange }: { site: Site; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function retest() {
    setBusy(true);
    await fetch(`/api/sites/${site.id}`, { method: "POST" });
    setBusy(false);
    onChange();
  }
  async function remove() {
    if (!confirm(`Déconnecter ${site.label ?? site.url} ?`)) return;
    setBusy(true);
    await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 truncate">
              {site.label || site.meta?.info?.name || site.url}
            </span>
            <span
              className={`text-[10px] font-mono uppercase rounded-full border px-2 py-0.5 ${STATUS_BADGE[site.status]}`}
            >
              {site.status}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">
              {site.platform}
            </span>
          </div>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-brand-700 truncate block"
          >
            {site.url}
          </a>
          <div className="text-xs text-zinc-500">
            Plugin SEO :{" "}
            {site.meta?.capabilities?.seoPlugin === "wanapush" ? (
              <span className="text-emerald-700">
                ✓ WanaPush SEO Bridge installé
              </span>
            ) : site.meta?.capabilities?.seoPlugin &&
              site.meta.capabilities.seoPlugin !== "none" ? (
              <span className="text-emerald-700">
                {site.meta.capabilities.seoPlugin}
              </span>
            ) : (
              <span className="text-amber-800">
                aucun (modifications meta limitées)
              </span>
            )}
            {site.meta?.info?.pagesCount !== undefined &&
              ` · ${site.meta.info.pagesCount} pages`}
          </div>

          {site.platform === "WORDPRESS" &&
            (!site.meta?.capabilities?.seoPlugin ||
              site.meta.capabilities.seoPlugin === "none") && (
              <PluginInstallSection siteId={site.id} onInstalled={onChange} />
            )}
          {site.status === "FAILED" && site.lastError && (
            <div className="text-xs text-red-700 mt-1">⚠ {site.lastError}</div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={retest}
            disabled={busy}
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 text-zinc-700 disabled:opacity-50"
          >
            {busy ? "…" : "Tester"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs rounded-lg border border-red-200 hover:border-red-500 px-3 py-1.5 text-red-700 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function PluginInstallSection({
  siteId,
  onInstalled,
}: {
  siteId: string;
  onInstalled: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  async function recheck() {
    setChecking(true);
    await fetch(`/api/sites/${siteId}`, { method: "POST" });
    setChecking(false);
    onInstalled();
  }

  return (
    <div className="mt-3 rounded-lg border border-brand/30 bg-brand/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-brand-700">
          📦 Installer le plugin <strong>WanaPush SEO Bridge</strong> pour
          activer la modification automatique des meta SEO.
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs rounded bg-brand hover:bg-brand-400 text-white px-3 py-1.5 shrink-0"
        >
          {open ? "Masquer" : "Voir comment"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pt-2 border-t border-brand/20">
          <ol className="text-xs text-zinc-700 space-y-2 list-decimal list-inside">
            <li>
              <a
                href="/api/plugin/wanapush-seo"
                download="wanapush-seo.zip"
                className="font-semibold text-brand-700 hover:text-brand-700 underline"
              >
                Télécharger le plugin (wanapush-seo.zip)
              </a>
            </li>
            <li>
              Va dans ton WordPress admin →{" "}
              <span className="font-mono text-zinc-800">
                Extensions → Ajouter → Téléverser une extension
              </span>
            </li>
            <li>Choisis le ZIP téléchargé et clique "Installer maintenant"</li>
            <li>Active le plugin</li>
            <li>
              Reviens ici et clique{" "}
              <strong>"Vérifier l'installation"</strong> ci-dessous
            </li>
          </ol>
          <button
            onClick={recheck}
            disabled={checking}
            className="w-full text-sm rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white py-2 font-semibold"
          >
            {checking ? "Vérification…" : "Vérifier l'installation"}
          </button>
        </div>
      )}
    </div>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [platform, setPlatform] = useState("WORDPRESS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    let payload: Record<string, unknown>;
    if (platform === "WORDPRESS") {
      payload = {
        platform,
        url: String(data.get("url") ?? "").trim(),
        label: String(data.get("label") ?? "").trim() || undefined,
        username: String(data.get("username") ?? "").trim(),
        appPassword: String(data.get("appPassword") ?? "").trim(),
      };
    } else if (platform === "SFTP_HTML") {
      payload = {
        platform,
        url: String(data.get("url") ?? "").trim(),
        label: String(data.get("label") ?? "").trim() || undefined,
        host: String(data.get("host") ?? "").trim(),
        port: Number(data.get("port") || 22),
        username: String(data.get("username") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        rootPath: String(data.get("rootPath") ?? "").trim(),
      };
    } else {
      setError(`Plateforme non supportée : ${platform}`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? "Erreur");
      setLoading(false);
      return;
    }
    onConnected();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-brand/30 bg-brand/5 backdrop-blur p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold">Nouvelle connexion</h3>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Plateforme</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
        >
          <option value="WORDPRESS">WordPress (REST API + App Password)</option>
          <option value="SFTP_HTML">Site HTML / PHP custom (SFTP / SSH)</option>
          <option value="SHOPIFY" disabled>Shopify (bientôt)</option>
          <option value="WEBFLOW" disabled>Webflow (bientôt)</option>
        </select>
      </div>

      {platform === "WORDPRESS" && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              URL du site WordPress
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://monsite.com"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Nom (optionnel)
            </label>
            <input
              name="label"
              type="text"
              placeholder="Mon site principal"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Username WordPress
              </label>
              <input
                name="username"
                type="text"
                required
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Application Password
              </label>
              <input
                name="appPassword"
                type="password"
                required
                autoComplete="off"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg bg-white/40 border border-zinc-200 p-3 text-xs text-zinc-500 space-y-1">
            <strong className="text-zinc-700">
              Comment générer un Application Password :
            </strong>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>
                Connecte-toi à <span className="font-mono">monsite.com/wp-admin</span>
              </li>
              <li>
                Va dans <span className="font-mono">Utilisateurs → Profil</span>
              </li>
              <li>
                Section{" "}
                <strong>"Mots de passe d'application"</strong> →
                "WanaPush" → <em>Ajouter</em>
              </li>
              <li>Copie le mot de passe à 24 caractères et colle-le ci-dessus</li>
            </ol>
            <div className="pt-1 text-zinc-400">
              Tes credentials sont chiffrés (AES-256-GCM) avant stockage.
            </div>
          </div>
        </>
      )}

      {platform === "SFTP_HTML" && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">URL publique du site</label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://monsite.com"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Nom (optionnel)</label>
            <input
              name="label"
              type="text"
              placeholder="Mon site HTML"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-zinc-700">Host SSH/SFTP</label>
              <input
                name="host"
                type="text"
                required
                placeholder="ftp.monsite.com ou IP"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Port</label>
              <input
                name="port"
                type="number"
                defaultValue={22}
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Username SSH</label>
              <input
                name="username"
                type="text"
                required
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Mot de passe SSH</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Chemin racine du site web sur le serveur
            </label>
            <input
              name="rootPath"
              type="text"
              required
              placeholder="/home/user/public_html ou /var/www/html"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none font-mono"
            />
          </div>

          <div className="rounded-lg bg-white/40 border border-zinc-200 p-3 text-xs text-zinc-500 space-y-1">
            <strong className="text-zinc-700">SFTP/SSH — comment ça marche :</strong>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>WanaPush se connecte à ton serveur via SSH/SFTP</li>
              <li>
                Lit/écrit les fichiers HTML directement (compatible avec n'importe
                quel hébergement : OVH, Hostinger, o2switch, AWS, VPS…)
              </li>
              <li>
                Crée un backup <span className="font-mono">.wanapush-backup</span>{" "}
                avant chaque modification
              </li>
              <li>
                Idéal pour : sites HTML statiques, sites PHP custom, Hugo / Jekyll,
                templates non-WP
              </li>
            </ol>
            <div className="pt-1 text-zinc-400">
              Credentials chiffrés (AES-256-GCM). Pour plus de sécurité, créer un
              user SSH dédié avec accès limité au dossier du site.
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 transition-colors py-2.5 text-sm font-semibold text-white"
      >
        {loading ? "Connexion en cours…" : "Tester et connecter"}
      </button>
    </form>
  );
}
