// Helper partagé pour extraire les fichiers React d'un site et lancer le build.
// Utilisé par /api/generate-site (build initial) et /api/generated-site/[id]/rebuild.

import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

export const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";
export const TEMPLATE_SITE = path.join(EXTRACTION_ROOT, "wanapush-site");

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Vérifie si le site a été buildé (dist/index.html existe).
 */
export async function isSiteBuilt(siteSlug: string): Promise<boolean> {
  try {
    await fs.access(path.join(EXTRACTION_ROOT, siteSlug, "dist", "index.html"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrait tous les fichiers du site React dans website-extraction/{slug}/
 * puis lance npm run build (synchrone si waitForBuild=true).
 */
/**
 * Sanitize un fichier TS/TSX généré pour compenser des incompatibilités de schéma
 * entre la version du générateur stockée et la version actuelle des composants.
 * Ajoute `imageKeywords?: string` aux types Item qui ne l'ont pas — corrige
 * les sites générés avant que ce champ soit accepté dans tous les composants.
 */
function sanitizeGeneratedFile(filePath: string, content: string): string {
  if (!/\.tsx?$/.test(filePath)) return content;
  // Patch tout `type Item = { ... }` ET `type Slide = { ... }` pour accepter imageKeywords
  return content.replace(
    /type (Item|Slide) = \{ ([^}]*?) \}/g,
    (match, name, inner) => {
      if (/imageKeywords/.test(inner)) return match;
      return `type ${name} = { ${inner}; imageKeywords?: string }`;
    },
  );
}

export async function extractAndBuildSite(
  siteSlug: string,
  files: Record<string, string>,
  options: { waitForBuild?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const siteDir = path.join(EXTRACTION_ROOT, siteSlug);

  // 1. Écrire tous les fichiers (avec sanitize pass pour compat)
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(siteDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, sanitizeGeneratedFile(filePath, content), "utf8");
  }

  // 2. Copier node_modules si absent
  const nmDest = path.join(siteDir, "node_modules");
  const nmSrc = path.join(TEMPLATE_SITE, "node_modules");
  try {
    await fs.access(nmDest);
  } catch {
    await fs.cp(nmSrc, nmDest, { recursive: true });
  }

  // 3. Build
  if (options.waitForBuild) {
    return await new Promise((resolve) => {
      const child = spawn("npm", ["run", "build"], {
        cwd: siteDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      let stdout = "";
      child.stdout?.on("data", (d) => { stdout += d.toString(); });
      child.stderr?.on("data", (d) => { stderr += d.toString(); });
      child.on("close", (code) => {
        if (code === 0) resolve({ ok: true });
        else {
          // tsc écrit ses erreurs sur stdout, vite sur stderr — concatène les deux
          const combined = (stderr + "\n" + stdout).trim();
          const msg = combined.length > 0 ? combined.slice(-800) : `Build exited with code ${code}`;
          console.error(`[site-extraction] build failed for ${siteSlug} (exit ${code}):\n${msg}`);
          resolve({ ok: false, error: msg });
        }
      });
      child.on("error", (err) => resolve({ ok: false, error: err.message }));
    });
  } else {
    const child = spawn("npm", ["run", "build"], {
      cwd: siteDir,
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.unref();
    return { ok: true };
  }
}
