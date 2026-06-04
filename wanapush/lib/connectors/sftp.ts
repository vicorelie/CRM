import * as cheerio from "cheerio";
import SftpClient from "ssh2-sftp-client";
import type { ConnectorTestResult, FixPayload, FixResult } from "./types";

// Connecteur SFTP/SSH pour sites non-WordPress hébergés sur serveur classique.
// Permet de lire/modifier les fichiers HTML statiques (index.html, etc.) ou
// templates de tout CMS qui stocke ses pages en fichiers (Hugo, Jekyll, sites
// custom PHP/HTML).

export type SftpCredentials = {
  /** Host SSH (ex: ftp.example.com) */
  host: string;
  /** Port SSH (22 par défaut, parfois 2222 sur mutualisé) */
  port: number;
  /** Username SSH */
  username: string;
  /** Mot de passe SSH (ou clé privée — non supporté en v1) */
  password: string;
  /** Chemin racine du site web (ex: /home/user/public_html ou /var/www/html) */
  rootPath: string;
};

async function connect(c: SftpCredentials): Promise<SftpClient> {
  const sftp = new SftpClient();
  await sftp.connect({
    host: c.host,
    port: c.port,
    username: c.username,
    password: c.password,
    readyTimeout: 10_000,
  });
  return sftp;
}

/**
 * Timeout global sur une opération asynchrone — évite que des opérations SFTP
 * lentes/bloquantes freezent l'event loop Node et tout le serveur Next.js.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout SFTP (${ms}ms) — ${label}`)), ms),
    ),
  ]);
}

export async function testSftp(c: SftpCredentials): Promise<ConnectorTestResult> {
  return await withTimeout(_testSftp(c), 30_000, "testSftp").catch((err) => ({
    ok: false,
    error: err instanceof Error ? err.message : "Timeout SFTP",
  }));
}

async function _testSftp(c: SftpCredentials): Promise<ConnectorTestResult> {
  let sftp: SftpClient | null = null;
  try {
    sftp = await connect(c);
    // Vérifie que le rootPath existe
    const stats = await sftp.exists(c.rootPath);
    if (!stats) {
      return {
        ok: false,
        error: `Chemin racine introuvable : ${c.rootPath}`,
      };
    }
    if (stats !== "d") {
      return {
        ok: false,
        error: `${c.rootPath} n'est pas un répertoire (type: ${stats})`,
      };
    }

    // Liste les fichiers HTML à la racine pour confirmer qu'on peut lire
    const items = await sftp.list(c.rootPath);
    const htmlFiles = items.filter(
      (i) => i.type === "-" && /\.(html?|php)$/i.test(i.name),
    );
    const subdirs = items.filter((i) => i.type === "d").length;

    // Cherche un index.html / index.php pour estimer le nb de pages
    const hasIndex = items.some((i) => /^index\.(html?|php)$/i.test(i.name));

    return {
      ok: true,
      capabilities: {
        canEditPages: true,
        canEditPosts: true,
        canEditMeta: true,
        canUpdateImageAlt: true,
        seoPlugin: "none", // pas de plugin SEO sur fichiers statiques
      },
      info: {
        name: c.host,
        description: hasIndex
          ? `Hébergement détecté : ${htmlFiles.length} fichier(s) HTML/PHP racine, ${subdirs} sous-dossier(s)`
          : `Pas d'index trouvé dans ${c.rootPath}`,
        homeUrl: `https://${c.host}/`,
      },
    };
  } catch (err) {
    let message = err instanceof Error ? err.message : "Erreur inconnue";
    // Messages user-friendly pour les erreurs SSH classiques
    if (message.includes("All configured authentication methods failed")) {
      message = "Authentification refusée (vérifier username + password)";
    } else if (message.includes("ECONNREFUSED")) {
      message = `Connexion refusée — vérifier host:${c.host} port:${c.port}`;
    } else if (message.includes("ETIMEDOUT") || message.includes("Timed out")) {
      message = "Timeout — serveur injoignable ou port bloqué par firewall";
    } else if (message.includes("ENOTFOUND")) {
      message = `Host introuvable : ${c.host}`;
    }
    return { ok: false, error: message };
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Liste les fichiers HTML/PHP du site à partir du rootPath, récursivement
 * jusqu'à 3 niveaux de profondeur (max 50 fichiers).
 */
export async function listSitePages(c: SftpCredentials, max = 50): Promise<string[]> {
  let sftp: SftpClient | null = null;
  try {
    sftp = await connect(c);
    const found: string[] = [];

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 3 || found.length >= max) return;
      const items = await sftp!.list(dir);
      for (const item of items) {
        if (found.length >= max) break;
        if (item.type === "-" && /\.(html?|php)$/i.test(item.name)) {
          found.push(`${dir}/${item.name}`);
        } else if (
          item.type === "d" &&
          !["node_modules", ".git", "vendor", "wp-admin", "wp-includes", "cache"].includes(
            item.name,
          )
        ) {
          await walk(`${dir}/${item.name}`, depth + 1);
        }
      }
    };
    await walk(c.rootPath.replace(/\/+$/, ""), 0);
    return found;
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Applique un fix SEO directement sur un fichier HTML via SFTP.
 * pageId = chemin absolu du fichier (ex: /home/user/public_html/contact.html)
 */
export async function applyFixSftp(
  c: SftpCredentials,
  payload: FixPayload,
): Promise<FixResult> {
  return await withTimeout(_applyFixSftp(c, payload), 45_000, `applyFixSftp:${payload.fixId}`).catch(
    (err) => ({
      ok: false,
      message: err instanceof Error ? err.message : "Timeout SFTP",
    }),
  );
}

async function _applyFixSftp(
  c: SftpCredentials,
  payload: FixPayload,
): Promise<FixResult> {
  const { fixId, pageId, data } = payload;
  const filePath = String(pageId);

  let sftp: SftpClient | null = null;
  try {
    sftp = await connect(c);

    const buffer = await sftp.get(filePath);
    const original = buffer.toString();
    const $ = cheerio.load(original);

    let changed = false;

    switch (fixId) {
      case "update-title": {
        const newTitle = String(data.title ?? "").trim();
        if (!newTitle) return { ok: false, message: "Title vide" };
        if ($("head > title").length === 0) {
          $("head").prepend(`<title>${escapeHtml(newTitle)}</title>`);
        } else {
          $("head > title").first().text(newTitle);
        }
        changed = true;
        break;
      }
      case "update-meta-description": {
        const desc = String(data.description ?? "").trim();
        if (!desc) return { ok: false, message: "Description vide" };
        if ($('meta[name="description"]').length === 0) {
          $("head").append(
            `<meta name="description" content="${escapeAttr(desc)}">`,
          );
        } else {
          $('meta[name="description"]').attr("content", desc);
        }
        changed = true;
        break;
      }
      case "add-canonical": {
        const url = String(data.url ?? "").trim();
        if (!url) return { ok: false, message: "URL vide" };
        if ($('link[rel="canonical"]').length === 0) {
          $("head").append(`<link rel="canonical" href="${escapeAttr(url)}">`);
        } else {
          $('link[rel="canonical"]').attr("href", url);
        }
        changed = true;
        break;
      }
      case "add-og-tags": {
        const ogTitle = String(data.ogTitle ?? "").trim();
        const ogDesc = String(data.ogDescription ?? "").trim();
        const ogImage = String(data.ogImage ?? "").trim();
        for (const [prop, val] of [
          ["og:title", ogTitle],
          ["og:description", ogDesc],
          ["og:image", ogImage],
        ] as const) {
          if (!val) continue;
          if ($(`meta[property="${prop}"]`).length === 0) {
            $("head").append(
              `<meta property="${prop}" content="${escapeAttr(val)}">`,
            );
          } else {
            $(`meta[property="${prop}"]`).attr("content", val);
          }
          changed = true;
        }
        break;
      }
      case "fix-h1": {
        const newH1 = String(data.h1 ?? "").trim();
        if (!newH1) return { ok: false, message: "H1 vide" };
        if ($("h1").length === 0) {
          $("body").prepend(`<h1>${escapeHtml(newH1)}</h1>`);
        } else {
          $("h1").first().text(newH1);
        }
        changed = true;
        break;
      }
      case "fix-image-alts": {
        const updates = Object.entries(data).filter(
          ([, v]) => String(v).trim().length > 0,
        );
        let n = 0;
        $("img").each((_, el) => {
          const src = $(el).attr("src");
          if (!src) return;
          const filename = src.split("/").pop() ?? "";
          for (const [imgUrl, alt] of updates) {
            const targetFilename = imgUrl.split("/").pop() ?? "";
            if (
              src === imgUrl ||
              filename === targetFilename ||
              src.endsWith(targetFilename)
            ) {
              $(el).attr("alt", String(alt));
              n++;
              changed = true;
              break;
            }
          }
        });
        if (n === 0) return { ok: false, message: "Aucune image trouvée" };
        break;
      }
      case "add-schema-article": {
        const jsonld = String(data.jsonld ?? "").trim();
        if (!jsonld) return { ok: false, message: "JSON-LD vide" };
        try {
          JSON.parse(jsonld);
        } catch {
          return { ok: false, message: "JSON-LD invalide" };
        }
        $("head").append(
          `<script type="application/ld+json">${jsonld}</script>`,
        );
        changed = true;
        break;
      }
      case "rewrite-content": {
        const rewritesJson = String(data.rewrites ?? "").trim();
        if (!rewritesJson) return { ok: false, message: "Aucune réécriture fournie" };
        let pairs: { original: string; replacement: string }[];
        try {
          pairs = JSON.parse(rewritesJson);
        } catch {
          return { ok: false, message: "Format JSON invalide" };
        }
        let replaced = 0;
        const notFound: string[] = [];
        // Pour chaque paire, on cible l'élément par son texte exact dans le HTML
        for (const { original, replacement } of pairs) {
          if (!original || !replacement) continue;
          let found = false;
          // Cherche dans p, h2, h3 — l'élément qui contient EXACTEMENT ce texte
          $("p, h2, h3").each((_, el) => {
            if (found) return;
            if ($(el).text().trim() === original.trim()) {
              $(el).text(replacement);
              replaced++;
              found = true;
              changed = true;
            }
          });
          if (!found) notFound.push(original.slice(0, 40));
        }
        if (replaced === 0) {
          return {
            ok: false,
            message: `Aucun texte trouvé. Fragments cherchés : ${notFound.slice(0, 2).join(" | ")}`,
          };
        }
        // changed=true → la suite du switch écrit le fichier (avec backup)
        break;
      }

      case "enrich-content": {
        const extraHtml = String(data.html ?? "").trim();
        if (!extraHtml) return { ok: false, message: "Contenu vide" };

        // Détecte si le HTML reçu a déjà des classes du thème (appliquées par
        // applyDesignToHtml côté serveur via lib/design-scanner.ts)
        const hasThemeClasses = /<(h2|h3|p|section|article)\s[^>]*class\s*=\s*["'][^"']+["']/i.test(
          extraHtml,
        );

        // Idempotent : remplace l'ancienne injection si elle existe (par data-attribute)
        $('div.wanapush-extra-content, [data-wanapush-injected]').remove();
        $('style[data-wanapush-extra-css]').remove();

        let payload: string;
        if (hasThemeClasses) {
          // HTML déjà stylé par le thème → on injecte tel quel, sans wrapper neutre
          payload = `\n<!-- WanaPush extra content (theme classes) -->\n<div data-wanapush-injected>\n${extraHtml}\n</div>\n`;
        } else {
          // Fallback : wrapper neutre avec CSS scoped pour rendu propre
          const styleBlock = `<style data-wanapush-extra-css>
.wanapush-extra-content{max-width:800px;margin:3rem auto 2rem;padding:2rem 1.5rem 0;font-family:inherit;color:inherit;border-top:1px solid rgba(0,0,0,.08)}
.wanapush-extra-content section{margin-bottom:2.25rem}
.wanapush-extra-content section:last-child{margin-bottom:0}
.wanapush-extra-content h2{font-size:1.5rem;font-weight:700;line-height:1.3;margin:0 0 .75rem;color:inherit}
.wanapush-extra-content h3{font-size:1.15rem;font-weight:600;line-height:1.4;margin:1.25rem 0 .5rem}
.wanapush-extra-content p{font-size:1rem;line-height:1.65;margin:0 0 1rem;color:inherit}
.wanapush-extra-content p:last-child{margin-bottom:0}
.wanapush-extra-content ul,.wanapush-extra-content ol{margin:0 0 1rem 1.25rem;padding:0;line-height:1.65}
.wanapush-extra-content li{margin-bottom:.4rem}
@media(prefers-color-scheme:dark){.wanapush-extra-content{border-color:rgba(255,255,255,.12)}}
</style>`;
          if ($("head").length > 0) {
            $("head").append(styleBlock);
          }
          payload = `\n<!-- WanaPush extra content (neutral wrapper) -->\n<div class="wanapush-extra-content">\n${extraHtml}\n</div>\n`;
        }

        if ($("main").length > 0) {
          $("main").last().append(payload);
        } else if ($("body").length > 0) {
          $("body").append(payload);
        } else {
          return { ok: false, message: "Pas de <main> ni <body> trouvé dans le HTML" };
        }
        changed = true;
        break;
      }
      default:
        return { ok: false, message: `Fix non implémenté pour SFTP : ${fixId}` };
    }

    if (!changed) {
      return { ok: false, message: "Aucune modification appliquée" };
    }

    // Backup avant écriture (optionnel mais sûr)
    const backupPath = filePath + ".wanapush-backup";
    try {
      await sftp.put(Buffer.from(original), backupPath);
    } catch {
      /* ignore backup error */
    }

    // Réécriture
    await sftp.put(Buffer.from($.html()), filePath);

    return {
      ok: true,
      message: `Fichier mis à jour : ${filePath} (backup créé : ${backupPath})`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur SFTP",
    };
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch {
        /* ignore */
      }
    }
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

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
