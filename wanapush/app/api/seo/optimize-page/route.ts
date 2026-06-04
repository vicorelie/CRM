import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { applyFixSftp, type SftpCredentials } from "@/lib/connectors/sftp";
import { resolveSftpFilePath } from "@/lib/connectors/sftp-paths";
import type { FixId } from "@/lib/connectors/types";
import {
  applyFix,
  findPageByUrl,
  testWordpress,
  type WpCredentials,
} from "@/lib/connectors/wordpress";
import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { crawl, scoreAudit, type Audit } from "@/lib/seo-audit";
import { isWordPressArchive } from "@/lib/sitemap";

export const runtime = "nodejs";
export const maxDuration = 180;

const inputSchema = z.object({
  siteId: z.string().min(1),
  pageUrl: z.string().url(),
});

type FixApplied = {
  fixId: string;
  ok: boolean;
  message: string;
};

// Génère toutes les suggestions IA en 1 seul appel pour économiser tokens + latence.
async function generateAllSuggestions(audit: Audit): Promise<{
  title?: string;
  metaDescription?: string;
  h1?: string;
  ogTitle?: string;
  ogDescription?: string;
  imageAlts?: Record<string, string>;
  jsonldArticle?: object;
  targetKeyword?: string;
} | null> {
  const altsBlock =
    audit.images.missingAltUrls.length > 0
      ? `\nIMAGES SANS ALT (${audit.images.missingAltUrls.length}) :\n${audit.images.missingAltUrls
          .map((u, i) => `${i + 1}. ${u}`)
          .join("\n")}`
      : "";

  const prompt = `Tu es un expert SEO. Voici une page à optimiser totalement.

URL : ${audit.url}
Title actuel : "${audit.title.value ?? "(vide)"}" (${audit.title.length} car.)
Meta description actuelle : "${audit.metaDescription.value ?? "(vide)"}" (${audit.metaDescription.length} car.)
H1 actuel : "${audit.h1.values[0] ?? "(aucun)"}"
Première phrase visible : "${audit.firstParagraph ?? "(rien)"}"
Nombre de mots : ${audit.wordCount}
Auteur détecté : ${audit.eeat.author ?? "(aucun)"}
Date publication : ${audit.eeat.datePublished ?? "(aucune)"}${altsBlock}

Génère des contenus SEO optimisés pour cette page selon les règles Google 2026 (E-E-A-T, AI Overviews, helpful content). Retourne UNIQUEMENT du JSON STRICT (pas de \`\`\`, pas de commentaire) avec ce schéma EXACT :

{
  "targetKeyword": "<mot-clé principal de la page, 2-4 mots, en français>",
  "title": "<title SEO 50-60 chars en français, contient le mot-clé naturellement>",
  "metaDescription": "<meta description 140-160 chars en français, accrocheuse, avec CTA implicite>",
  "h1": "<H1 30-70 chars en français, différent du title, engageant>",
  "ogTitle": "<title pour partage social, 30-70 chars en français>",
  "ogDescription": "<description pour partage social, 100-200 chars en français>",
  "imageAlts": { ${audit.images.missingAltUrls.length > 0 ? '"<url1>": "<alt 5-15 mots fr>", ...' : ''} },
  "jsonldArticle": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "<title>",
    "description": "<meta description>",
    "author": { "@type": "Person", "name": "${audit.eeat.author ?? "Équipe éditoriale"}" },
    "datePublished": "${audit.eeat.datePublished ?? new Date().toISOString().slice(0, 10)}",
    "dateModified": "${new Date().toISOString().slice(0, 10)}",
    "mainEntityOfPage": "${audit.url}",
    "inLanguage": "fr-FR"
  }
}`;

  const ai = await askWanapush(prompt);
  if (!ai) return null;

  // Cleanup ```json blocks
  const cleaned = ai.text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[optimize-page] AI JSON parse error", err, cleaned.slice(0, 300));
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  // 0. Détecte les pages d'archive WordPress (non éditables directement)
  if (isWordPressArchive(parsed.data.pageUrl)) {
    return NextResponse.json(
      {
        error:
          "Page d'archive WordPress (catégorie / tag / auteur / date). Ces pages sont générées dynamiquement par WordPress et ne peuvent pas être éditées comme des pages classiques. Pour les optimiser, utilise un plugin SEO (Yoast / RankMath) qui propose des paramètres SEO par taxonomy/auteur.",
        kind: "archive",
      },
      { status: 400 },
    );
  }

  // 1. Vérifie le site
  const site = await prisma.siteConnection.findFirst({
    where: { id: parsed.data.siteId, user: { email: session.user.email } },
  });
  if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });

  // 2. Setup connector selon la plateforme
  type ApplyFn = (fixId: FixId, data: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
  let applyFn: ApplyFn;

  if (site.platform === "WORDPRESS") {
    const creds = decryptJson<WpCredentials>(site.credentials);
    const test = await testWordpress(creds);
    if (!test.ok || !test.capabilities) {
      return NextResponse.json(
        { error: `Site inaccessible : ${test.error}` },
        { status: 502 },
      );
    }
    const seoPlugin = test.capabilities.seoPlugin;
    const target = await findPageByUrl(creds, parsed.data.pageUrl);
    if (!target) {
      return NextResponse.json(
        { error: `Page introuvable dans WordPress : ${parsed.data.pageUrl}` },
        { status: 404 },
      );
    }
    applyFn = async (fixId, data) =>
      applyFix(creds, { fixId, pageId: target.id, data }, seoPlugin, target.type);
  } else if (site.platform === "SFTP_HTML") {
    const creds = decryptJson<SftpCredentials>(site.credentials);
    const filePath = resolveSftpFilePath({
      siteUrl: site.url,
      pageUrl: parsed.data.pageUrl,
      rootPath: creds.rootPath,
    });
    applyFn = async (fixId, data) => applyFixSftp(creds, { fixId, pageId: filePath, data });
  } else {
    return NextResponse.json(
      { error: `Plateforme non supportée : ${site.platform}` },
      { status: 400 },
    );
  }

  // 3. Audit avant
  const auditBefore = await crawl(parsed.data.pageUrl);
  scoreAudit(auditBefore, null);

  // 4. Génère TOUTES les suggestions en 1 call IA
  const suggestions = await generateAllSuggestions(auditBefore);
  if (!suggestions) {
    return NextResponse.json(
      { error: "L'IA n'a pas généré de suggestions valides" },
      { status: 500 },
    );
  }

  // 5. Applique les fixes pertinents (selon les issues détectées)
  const applied: FixApplied[] = [];
  const issues = auditBefore.issues;
  const hasIssue = (cat: string) => issues.some((i) => i.category === cat);

  async function tryFix(fixId: string, data: Record<string, string>, label: string) {
    try {
      const result = await applyFn(fixId as FixId, data);
      applied.push({ fixId: label, ok: result.ok, message: result.message });
    } catch (err) {
      applied.push({
        fixId: label,
        ok: false,
        message: err instanceof Error ? err.message : "Erreur",
      });
    }
  }

  // a. Title (toujours, pour bénéficier du keyword)
  if (suggestions.title && (hasIssue("title") || !auditBefore.title.ok)) {
    await tryFix("update-title", { title: suggestions.title }, "Title");
  }

  // b. Meta description
  if (suggestions.metaDescription && (hasIssue("meta") || !auditBefore.metaDescription.ok)) {
    await tryFix(
      "update-meta-description",
      { description: suggestions.metaDescription },
      "Meta description",
    );
  }

  // c. H1 (seulement si manquant ou multiple — sinon on ne touche pas au contenu existant)
  if (suggestions.h1 && hasIssue("h1")) {
    await tryFix("fix-h1", { h1: suggestions.h1 }, "H1");
  }

  // d. Canonical
  if (hasIssue("canonical")) {
    await tryFix("add-canonical", { url: parsed.data.pageUrl }, "Canonical");
  }

  // e. Open Graph
  if (suggestions.ogTitle && hasIssue("og")) {
    await tryFix(
      "add-og-tags",
      {
        ogTitle: suggestions.ogTitle,
        ogDescription: suggestions.ogDescription ?? "",
      },
      "Open Graph",
    );
  }

  // f. Schema.org Article
  // Pour WP : nécessite plugin wanapush ; pour SFTP : toujours possible (on injecte direct dans HTML)
  if (suggestions.jsonldArticle && hasIssue("schema")) {
    if (site.platform === "SFTP_HTML") {
      await tryFix(
        "add-schema-article",
        { jsonld: JSON.stringify(suggestions.jsonldArticle) },
        "Schema.org Article",
      );
    } else if (site.platform === "WORDPRESS") {
      // applyFix WordPress vérifie elle-même si le plugin wanapush est installé,
      // et retourne une erreur claire sinon
      await tryFix(
        "add-schema-article",
        { jsonld: JSON.stringify(suggestions.jsonldArticle) },
        "Schema.org Article",
      );
    }
  }

  // g. Image alts en lot
  if (
    suggestions.imageAlts &&
    Object.keys(suggestions.imageAlts).length > 0 &&
    hasIssue("alt")
  ) {
    await tryFix("fix-image-alts", suggestions.imageAlts, "Image alts");
  }

  // 7. Re-audit après pour mesurer le delta
  await new Promise((r) => setTimeout(r, 1500)); // laisse les caches se vider
  const auditAfter = await crawl(parsed.data.pageUrl);
  scoreAudit(auditAfter, null);

  // Catégories d'issues qui ne peuvent PAS être auto-corrigées
  // (nécessitent une action manuelle ou infrastructure)
  const NON_AUTOFIXABLE = new Set([
    "content", // ne pas inventer du contenu (risque mensonges/hallucination)
    "https",   // configuration serveur
    "viewport", // dépend du thème
    "lang",     // dépend du thème
    "cwv",      // optimisation perf serveur/code
  ]);

  const remainingIssues = auditAfter.issues.map((i) => ({
    ...i,
    autoFixable: !NON_AUTOFIXABLE.has(i.category),
  }));

  return NextResponse.json({
    success: true,
    pageUrl: parsed.data.pageUrl,
    targetKeyword: suggestions.targetKeyword,
    scoreBefore: auditBefore.score,
    scoreAfter: auditAfter.score,
    delta: auditAfter.score - auditBefore.score,
    issuesBefore: auditBefore.issues.length,
    issuesAfter: auditAfter.issues.length,
    wordCountBefore: auditBefore.wordCount,
    wordCountAfter: auditAfter.wordCount,
    h1After: auditAfter.h1.values[0] ?? null,
    titleAfter: auditAfter.title.value,
    remainingIssues,
    applied,
    suggestions,
  });
}
