import type { ConnectorTestResult, FixPayload, FixResult, Page } from "./types";

// Connecteur WordPress via REST API + Application Password.
// Doc : https://developer.wordpress.org/rest-api/reference/
// Application Passwords : https://wordpress.org/documentation/article/application-passwords/

export type WpCredentials = {
  /** URL racine du site, ex: https://exemple.com (sans /wp-json) */
  url: string;
  /** Username WordPress */
  username: string;
  /** Application Password (24 caractères, espaces autorisés) */
  appPassword: string;
};

function authHeader(c: WpCredentials): string {
  const token = Buffer.from(
    `${c.username}:${c.appPassword.replace(/\s+/g, "")}`,
  ).toString("base64");
  return `Basic ${token}`;
}

function apiBase(c: WpCredentials): string {
  return c.url.replace(/\/+$/, "") + "/wp-json/wp/v2";
}

async function wpFetch(c: WpCredentials, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", authHeader(c));
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(apiBase(c) + path, {
      ...init,
      headers,
      signal: ctrl.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function testWordpress(c: WpCredentials): Promise<ConnectorTestResult> {
  try {
    // 1. /users/me — vérifie que les credentials sont valides
    const meRes = await wpFetch(c, "/users/me?context=edit");
    if (!meRes.ok) {
      const txt = await meRes.text().catch(() => "");
      return {
        ok: false,
        error:
          meRes.status === 401
            ? "Credentials invalides (vérifier username + Application Password)"
            : `WordPress a répondu ${meRes.status} : ${txt.slice(0, 200)}`,
      };
    }

    // 2. Détection des capacités SEO :
    //    a) Notre plugin WanaPush SEO (priorité 1, géré par nous)
    //    b) Yoast / RankMath / AIOSEO (plugins tiers — on peut écrire leur meta_key)
    type Plugin = "wanapush" | "yoast" | "rankmath" | "aioseo" | "none" | "unknown";
    let seoPlugin: Plugin = "none";

    // a) Probe du plugin WanaPush via son endpoint dédié
    const wanapushBase = c.url.replace(/\/+$/, "") + "/wp-json/wanapush/v1/ping";
    try {
      const wanapushPing = await fetch(wanapushBase, {
        signal: AbortSignal.timeout(5000),
      });
      if (wanapushPing.ok) {
        const j = await wanapushPing.json().catch(() => null);
        if (j?.plugin === "wanapush-seo") seoPlugin = "wanapush";
      }
    } catch {
      /* plugin pas installé, on continue */
    }

    // b) Si pas WanaPush, on cherche les plugins tiers
    if (seoPlugin === "none") {
      const probeRes = await wpFetch(c, "/pages?per_page=1&_fields=id,yoast_head_json,rank_math_seo,_aioseo");
      if (probeRes.ok) {
        const arr = await probeRes.json();
        const sample = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
        if (sample) {
          if (sample.yoast_head_json) seoPlugin = "yoast";
          else if (sample.rank_math_seo) seoPlugin = "rankmath";
          else if (sample._aioseo) seoPlugin = "aioseo";
        }
      }
    }

    // 3. Infos générales du site
    const settingsRes = await wpFetch(c, "/../").catch(() => null);
    let info: ConnectorTestResult["info"] = {};
    if (settingsRes && settingsRes.ok) {
      const root = await settingsRes.json().catch(() => null);
      if (root && typeof root === "object") {
        info = {
          name: root.name,
          description: root.description,
          homeUrl: root.home,
        };
      }
    }

    // 4. Compte de pages
    const pagesRes = await wpFetch(c, "/pages?per_page=1");
    const totalPages = parseInt(pagesRes.headers.get("X-WP-Total") ?? "0", 10);
    if (info) info.pagesCount = totalPages;

    return {
      ok: true,
      capabilities: {
        canEditPages: true,
        canEditPosts: true,
        canEditMeta: true,
        canUpdateImageAlt: true,
        seoPlugin,
      },
      info,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message.includes("aborted")
            ? "Timeout : le site WordPress ne répond pas (>10s)"
            : err.message
          : "Erreur inconnue",
    };
  }
}

export async function listPages(c: WpCredentials, max = 50): Promise<Page[]> {
  const res = await wpFetch(
    c,
    `/pages?per_page=${max}&_fields=id,title,slug,link,excerpt,meta`,
  );
  if (!res.ok) throw new Error(`WordPress GET /pages → ${res.status}`);
  const arr = await res.json();
  return (Array.isArray(arr) ? arr : []).map((p) => ({
    id: p.id,
    type: "page" as const,
    title: typeof p.title === "object" ? p.title.rendered : String(p.title),
    slug: p.slug,
    url: p.link,
    metaDescription: null, // récupéré séparément si Yoast/RankMath
  }));
}

/**
 * Trouve l'ID de page/post WordPress qui correspond à une URL donnée.
 * Cherche dans pages d'abord, puis posts. Tolère les variantes de slash.
 */
export async function findPageByUrl(
  c: WpCredentials,
  url: string,
): Promise<{ id: number; type: "page" | "post"; link: string } | null> {
  const target = new URL(url);
  // Normalisation : retire le slash final, le hash, les query params.
  const normalize = (u: string) => {
    try {
      const x = new URL(u);
      return (x.origin + x.pathname).replace(/\/+$/, "");
    } catch {
      return u.replace(/\/+$/, "");
    }
  };
  const targetNorm = normalize(target.toString());

  // 1. Cas spécial : page d'accueil → on cherche la page configurée comme front_page
  const homeUrl = new URL(c.url);
  const isHome = normalize(homeUrl.toString()) === targetNorm;
  if (isHome) {
    // /wp/v2/settings (admin only) renvoie page_on_front
    const settingsRes = await wpFetch(c, "/settings");
    if (settingsRes.ok) {
      const s = await settingsRes.json();
      if (s.show_on_front === "page" && s.page_on_front) {
        return { id: s.page_on_front, type: "page", link: target.toString() };
      }
    }
  }

  // 2. Recherche dans toutes les pages (max 100)
  const pagesRes = await wpFetch(c, "/pages?per_page=100&_fields=id,link");
  if (pagesRes.ok) {
    const arr = (await pagesRes.json()) as Array<{ id: number; link: string }>;
    const match = arr.find((p) => normalize(p.link) === targetNorm);
    if (match) return { id: match.id, type: "page", link: match.link };
  }

  // 3. Sinon dans les posts (max 100)
  const postsRes = await wpFetch(c, "/posts?per_page=100&_fields=id,link");
  if (postsRes.ok) {
    const arr = (await postsRes.json()) as Array<{ id: number; link: string }>;
    const match = arr.find((p) => normalize(p.link) === targetNorm);
    if (match) return { id: match.id, type: "post", link: match.link };
  }

  return null;
}

export async function applyFix(
  c: WpCredentials,
  payload: FixPayload,
  seoPlugin: "wanapush" | "yoast" | "rankmath" | "aioseo" | "none" | "unknown",
  postType: "page" | "post" = "page",
): Promise<FixResult> {
  const { fixId, pageId, data } = payload;
  const endpoint = postType === "post" ? "/posts" : "/pages";

  // Helper qui choisit le bon meta_key selon le plugin SEO actif.
  function metaKey(field: "title" | "description" | "canonical" | "ogTitle" | "ogDesc" | "ogImage"): string | null {
    if (seoPlugin === "wanapush") {
      return {
        title: "_wanapush_meta_title",
        description: "_wanapush_meta_description",
        canonical: "_wanapush_canonical",
        ogTitle: "_wanapush_og_title",
        ogDesc: "_wanapush_og_description",
        ogImage: "_wanapush_og_image",
      }[field];
    }
    if (seoPlugin === "yoast") {
      return {
        title: "_yoast_wpseo_title",
        description: "_yoast_wpseo_metadesc",
        canonical: "_yoast_wpseo_canonical",
        ogTitle: "_yoast_wpseo_opengraph-title",
        ogDesc: "_yoast_wpseo_opengraph-description",
        ogImage: "_yoast_wpseo_opengraph-image",
      }[field];
    }
    if (seoPlugin === "rankmath") {
      return {
        title: "rank_math_title",
        description: "rank_math_description",
        canonical: "rank_math_canonical_url",
        ogTitle: "rank_math_facebook_title",
        ogDesc: "rank_math_facebook_description",
        ogImage: "rank_math_facebook_image",
      }[field];
    }
    return null;
  }

  async function patchMeta(meta: Record<string, string>): Promise<FixResult> {
    if (Object.keys(meta).length === 0) {
      return { ok: false, message: "Aucun champ à mettre à jour" };
    }
    const res = await wpFetch(c, `${endpoint}/${pageId}`, {
      method: "POST",
      body: JSON.stringify({ meta }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        message: `WordPress a répondu ${res.status} : ${txt.slice(0, 200)}`,
      };
    }
    const updated = await res.json();
    return { ok: true, message: "Modifications appliquées", verifyUrl: updated.link };
  }

  switch (fixId) {
    case "update-title": {
      const newTitle = String(data.title ?? "").trim();
      if (!newTitle) return { ok: false, message: "Title vide" };
      const key = metaKey("title");
      if (!key) {
        return {
          ok: false,
          message:
            "Plugin SEO requis pour modifier le title SEO sans toucher au titre visible (installer WanaPush SEO Bridge)",
        };
      }
      return patchMeta({ [key]: newTitle });
    }

    case "update-meta-description": {
      const newDesc = String(data.description ?? "").trim();
      if (!newDesc) return { ok: false, message: "Description vide" };
      const key = metaKey("description");
      if (!key) {
        return {
          ok: false,
          message:
            "Plugin SEO requis. Installer WanaPush SEO Bridge.",
        };
      }
      return patchMeta({ [key]: newDesc });
    }

    case "add-canonical": {
      const url = String(data.url ?? "").trim();
      if (!url) return { ok: false, message: "URL canonical vide" };
      const key = metaKey("canonical");
      if (!key) {
        return {
          ok: false,
          message: "Plugin SEO requis. Installer WanaPush SEO Bridge.",
        };
      }
      return patchMeta({ [key]: url });
    }

    case "add-og-tags": {
      const ogTitle = String(data.ogTitle ?? "").trim();
      const ogDesc = String(data.ogDescription ?? "").trim();
      const ogImage = String(data.ogImage ?? "").trim();
      const meta: Record<string, string> = {};
      const keyTitle = metaKey("ogTitle");
      const keyDesc = metaKey("ogDesc");
      const keyImg = metaKey("ogImage");
      if (!keyTitle || !keyDesc) {
        return {
          ok: false,
          message: "Plugin SEO requis. Installer WanaPush SEO Bridge.",
        };
      }
      if (ogTitle) meta[keyTitle] = ogTitle;
      if (ogDesc) meta[keyDesc] = ogDesc;
      if (ogImage && keyImg) meta[keyImg] = ogImage;
      return patchMeta(meta);
    }

    case "fix-h1": {
      const newH1 = String(data.h1 ?? "").trim();
      if (!newH1) return { ok: false, message: "H1 vide" };

      const getRes = await wpFetch(c, `${endpoint}/${pageId}?context=edit&_fields=content,link`);
      if (!getRes.ok) return { ok: false, message: `WordPress GET → ${getRes.status}` };
      const page = await getRes.json();
      const currentContent = page.content?.raw ?? "";

      // Compte les H1 existants dans le post_content
      const existingH1s = (currentContent.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) ?? []).length;

      let newContent: string;
      if (existingH1s > 1) {
        // Plusieurs H1 → on transforme TOUS les H1 supplémentaires en H2 et on remplace le 1er
        let isFirst = true;
        newContent = currentContent.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/gi, (_match: string, attrs: string, inner: string) => {
          if (isFirst) {
            isFirst = false;
            return `<h1>${escapeHtml(newH1)}</h1>`;
          }
          // Les H1 surnuméraires deviennent H2 (préserve leur contenu)
          return `<h2${attrs}>${inner}</h2>`;
        });
      } else if (existingH1s === 1) {
        // 1 seul H1 → on le remplace
        newContent = currentContent.replace(
          /<h1[^>]*>[\s\S]*?<\/h1>/i,
          `<h1>${escapeHtml(newH1)}</h1>`,
        );
      } else {
        // Aucun H1 → on l'ajoute en haut
        newContent = `<h1>${escapeHtml(newH1)}</h1>\n\n${currentContent}`;
      }

      // On envoie content + meta dans la même requête.
      // Le meta _wanapush_normalize_h1=1 active le hook plugin v1.5+ qui transforme
      // les H1 surnuméraires (venant du thème) en H2 au rendu.
      const body: Record<string, unknown> = { content: newContent };
      if (seoPlugin === "wanapush") {
        body.meta = { _wanapush_normalize_h1: "1" };
      }

      const updRes = await wpFetch(c, `${endpoint}/${pageId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!updRes.ok) {
        return { ok: false, message: `WordPress a répondu ${updRes.status}` };
      }

      let action: string;
      if (existingH1s === 0) action = "ajouté";
      else if (existingH1s === 1) action = "remplacé";
      else action = `remplacé + ${existingH1s - 1} H1 surnuméraire(s) du content convertis en H2`;

      const themeNote = seoPlugin === "wanapush"
        ? " · normalisation H1 du thème activée (plugin v1.5+)"
        : " · note : si le thème WP ajoute encore des H1, installer/upgrader plugin WanaPush v1.5+";

      return {
        ok: true,
        message: `H1 ${action}${themeNote} : "${newH1}"`,
        verifyUrl: page.link,
      };
    }

    case "fix-image-alts": {
      // data = { "url-1": "alt 1", "url-2": "alt 2", ... }
      const updates = Object.entries(data).filter(([, v]) => String(v).trim().length > 0);
      if (updates.length === 0) return { ok: false, message: "Aucun alt fourni" };
      const updatesStr: [string, string][] = updates.map(([k, v]) => [k, String(v)]);

      // ── Étape 1 : update la médiathèque (pour les futures insertions / Gutenberg) ──
      let mediaUpdated = 0;
      const mediaListRes = await wpFetch(
        c,
        "/media?per_page=100&_fields=id,source_url,alt_text",
      );
      if (mediaListRes.ok) {
        const media = (await mediaListRes.json()) as Array<{
          id: number;
          source_url: string;
          alt_text: string;
        }>;
        for (const [imgUrl, newAlt] of updatesStr) {
          const filename = imgUrl.split("/").pop() ?? "";
          const found = media.find(
            (m) =>
              m.source_url === imgUrl ||
              (filename && m.source_url.endsWith(filename)),
          );
          if (!found) continue;
          const upd = await wpFetch(c, `/media/${found.id}`, {
            method: "POST",
            body: JSON.stringify({ alt_text: newAlt }),
          });
          if (upd.ok) mediaUpdated++;
        }
      }

      // ── Étape 2 : patcher le HTML inline de la page (CRITIQUE — sans ça, les
      //              <img alt=""> existants restent vides même après update média) ──
      let contentPatched = 0;
      const pageRes = await wpFetch(
        c,
        `${endpoint}/${pageId}?context=edit&_fields=content,link`,
      );
      if (pageRes.ok) {
        const page = await pageRes.json();
        let content = (page.content?.raw ?? "") as string;

        for (const [imgUrl, newAlt] of updatesStr) {
          const filename = imgUrl.split("/").pop() ?? "";
          if (!filename) continue;
          const escFilename = escapeRegex(filename);
          const altAttr = `alt="${escapeHtml(newAlt)}"`;

          // Match toute balise <img> dont le src contient ce filename
          const imgRegex = new RegExp(
            `<img\\b([^>]*?)\\bsrc=(["'])[^"']*${escFilename}\\2([^>]*)>`,
            "gi",
          );

          content = content.replace(imgRegex, (match) => {
            // Cas 1 : alt non vide → on remplace
            if (/\balt\s*=\s*["'][^"']+["']/i.test(match)) {
              contentPatched++;
              return match.replace(/\balt\s*=\s*["'][^"']*["']/i, altAttr);
            }
            // Cas 2 : alt="" vide → on remplit
            if (/\balt\s*=\s*["']["']/.test(match)) {
              contentPatched++;
              return match.replace(/\balt\s*=\s*["']["']/, altAttr);
            }
            // Cas 3 : pas d'alt du tout → on insère après <img
            contentPatched++;
            return match.replace(/<img\b/i, `<img ${altAttr}`);
          });
        }

        if (contentPatched > 0) {
          await wpFetch(c, `${endpoint}/${pageId}`, {
            method: "POST",
            body: JSON.stringify({ content }),
          });
        }
      }

      // ── Étape 3 (CRITIQUE pour page builders Elementor/Divi/WPBakery) :
      //    le plugin v1.2+ patche les <img> au rendu via output buffering en
      //    lisant ce meta_key. Marche peu importe d'où viennent les <img>. ──
      let pluginPatchActive = false;
      if (seoPlugin === "wanapush") {
        const altsMapping: Record<string, string> = Object.fromEntries(updatesStr);
        // Merge avec le mapping existant
        const getMetaRes = await wpFetch(
          c,
          `${endpoint}/${pageId}?context=edit&_fields=meta`,
        );
        let existing: Record<string, string> = {};
        if (getMetaRes.ok) {
          const p = await getMetaRes.json();
          const raw = p.meta?._wanapush_image_alts;
          if (typeof raw === "string" && raw.trim()) {
            try {
              existing = JSON.parse(raw);
            } catch {
              /* ignore */
            }
          }
        }
        const merged = { ...existing, ...altsMapping };
        const upd = await wpFetch(c, `${endpoint}/${pageId}`, {
          method: "POST",
          body: JSON.stringify({
            meta: { _wanapush_image_alts: JSON.stringify(merged) },
          }),
        });
        pluginPatchActive = upd.ok;
      }

      const parts: string[] = [];
      if (pluginPatchActive)
        parts.push(`${updatesStr.length} alts injectés via plugin (compatible page builder)`);
      if (contentPatched > 0)
        parts.push(`${contentPatched} <img> patchés dans post_content`);
      if (mediaUpdated > 0)
        parts.push(`${mediaUpdated} alts en médiathèque`);

      if (parts.length === 0) {
        return {
          ok: false,
          message:
            "Aucune image modifiée. Si ton site utilise un page builder, installer/upgrader le plugin WanaPush SEO Bridge en v1.2+.",
        };
      }
      return { ok: true, message: parts.join(" · ") };
    }

    case "add-schema-article": {
      // data = { jsonld: "{...}" } — JSON sérialisé du bloc schema.org Article
      const jsonld = String(data.jsonld ?? "").trim();
      if (!jsonld) return { ok: false, message: "JSON-LD vide" };
      try {
        JSON.parse(jsonld); // valide
      } catch {
        return { ok: false, message: "JSON-LD invalide (parse error)" };
      }
      if (seoPlugin !== "wanapush") {
        return {
          ok: false,
          message:
            "L'injection de JSON-LD via WanaPush nécessite le plugin WanaPush SEO Bridge (seul à supporter ce meta key).",
        };
      }
      return patchMeta({ _wanapush_schema_jsonld: jsonld });
    }

    case "add-schema-faq": {
      const jsonld = String(data.jsonld ?? "").trim();
      if (!jsonld) return { ok: false, message: "JSON-LD vide" };
      try {
        JSON.parse(jsonld);
      } catch {
        return { ok: false, message: "JSON-LD FAQ invalide" };
      }
      if (seoPlugin !== "wanapush") {
        return {
          ok: false,
          message: "Plugin WanaPush SEO Bridge requis.",
        };
      }
      return patchMeta({ _wanapush_schema_jsonld: jsonld });
    }

    case "enrich-content": {
      // data.html = bloc HTML à injecter avant </main> via le plugin v1.3
      const html = String(data.html ?? "").trim();
      if (!html) return { ok: false, message: "Contenu vide" };
      if (seoPlugin !== "wanapush") {
        return {
          ok: false,
          message:
            "Plugin WanaPush SEO Bridge v1.3+ requis pour l'enrichissement de contenu.",
        };
      }
      return patchMeta({ _wanapush_extra_html: html });
    }

    case "rewrite-content": {
      // data = { "rewrites": "[{original, replacement}, ...]" } sérialisé en string
      const rewritesJson = String(data.rewrites ?? "").trim();
      if (!rewritesJson) return { ok: false, message: "Aucune réécriture fournie" };
      let pairs: { original: string; replacement: string }[];
      try {
        pairs = JSON.parse(rewritesJson);
      } catch {
        return { ok: false, message: "Format JSON invalide" };
      }
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return { ok: false, message: "Liste de réécritures vide" };
      }

      const getRes = await wpFetch(c, `${endpoint}/${pageId}?context=edit&_fields=content,link`);
      if (!getRes.ok) return { ok: false, message: `WordPress GET → ${getRes.status}` };
      const page = await getRes.json();
      let content = (page.content?.raw ?? "") as string;

      let replaced = 0;
      const notFound: string[] = [];
      for (const { original, replacement } of pairs) {
        if (!original || !replacement) continue;
        // Find&replace SEUL le 1er match pour éviter de toucher à des doublons accidentels
        if (content.includes(original)) {
          content = content.replace(original, replacement);
          replaced++;
        } else {
          notFound.push(original.slice(0, 40));
        }
      }

      if (replaced === 0) {
        return {
          ok: false,
          message: `Aucun texte trouvé à remplacer dans post_content (les paragraphes viennent peut-être d'un page builder type Elementor — non éditable via REST). Premiers fragments cherchés : ${notFound.slice(0, 2).join(" | ")}`,
        };
      }

      const updRes = await wpFetch(c, `${endpoint}/${pageId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!updRes.ok) {
        return { ok: false, message: `WordPress a répondu ${updRes.status}` };
      }
      return {
        ok: true,
        message: `${replaced}/${pairs.length} bloc(s) réécrit(s)${notFound.length > 0 ? ` · ${notFound.length} non trouvé(s) (probablement page builder)` : ""}`,
        verifyUrl: page.link,
      };
    }

    default:
      return { ok: false, message: `Fix non implémenté : ${fixId}` };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
