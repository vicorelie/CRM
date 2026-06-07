// Utilitaire partagé : injecte (ou met à jour) le snippet Pixel + CAPI dans le
// dist/index.html d'un site déjà buildé.
//
// Appelé depuis :
//   - app/api/sites/[id]/pixel/route.ts (PUT — après upsert SitePixel)
//   - app/api/generated-site/[id]/rebuild/route.ts (après extractAndBuildSite)
//
// Ne throw jamais : retourne { ok: false, reason } en cas d'échec partiel.
// La route appelante peut choisir de logger l'erreur sans bloquer sa réponse.

import { promises as fs } from "fs";
import path from "path";
import { EXTRACTION_ROOT } from "@/lib/site-extraction";
import { injectPixelIntoHtml, type PixelInjectionConfig } from "@/lib/capi/pixel-script";
import { prisma } from "@/lib/prisma";

export type InjectResult =
  | { ok: true; injected: true }
  | { ok: true; injected: false; reason: "no_pixel" | "not_built" | "disabled" }
  | { ok: false; injected: false; reason: string };

/**
 * Injecte le snippet Pixel+CAPI dans dist/index.html pour un site donné.
 *
 * @param siteId  - GeneratedSite.id (utilisé pour lookup SitePixel en DB)
 * @param siteSlug - slug physique du site (dossier dans EXTRACTION_ROOT)
 */
export async function injectPixelIntoBuiltSite(
  siteId: string,
  siteSlug: string,
): Promise<InjectResult> {
  // 1) Lookup SitePixel actif
  const sitePixel = await prisma.sitePixel.findUnique({
    where: { generatedSiteId: siteId },
    select: {
      pixelId: true,
      events: true,
      consentRequired: true,
      enabled: true,
    },
  });

  if (!sitePixel) {
    return { ok: true, injected: false, reason: "no_pixel" };
  }

  if (!sitePixel.enabled) {
    return { ok: true, injected: false, reason: "disabled" };
  }

  // 2) Vérifier que le dist/index.html existe
  const indexHtmlPath = path.join(EXTRACTION_ROOT, siteSlug, "dist", "index.html");
  let html: string;
  try {
    html = await fs.readFile(indexHtmlPath, "utf8");
  } catch {
    return { ok: true, injected: false, reason: "not_built" };
  }

  // 3) Construire la config du snippet
  const events = Array.isArray(sitePixel.events) ? (sitePixel.events as string[]) : [];
  const config: PixelInjectionConfig = {
    pixelId: sitePixel.pixelId,
    slug: siteSlug,
    events,
    consentRequired: sitePixel.consentRequired,
  };

  // 4) Injecter (ou remplacer l'ancien snippet si déjà présent)
  let patched: string;
  try {
    patched = injectPixelIntoHtml(html, config);
  } catch (e) {
    return {
      ok: false,
      injected: false,
      reason: e instanceof Error ? e.message : "buildPixelSnippet failed",
    };
  }

  // 5) Écrire le fichier patché
  try {
    await fs.writeFile(indexHtmlPath, patched, "utf8");
  } catch (e) {
    return {
      ok: false,
      injected: false,
      reason: `writeFile failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return { ok: true, injected: true };
}
