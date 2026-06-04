import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import type { FixId } from "@/lib/connectors/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  fixId: z.enum([
    "update-title",
    "update-meta-description",
    "add-canonical",
    "add-og-tags",
    "fix-image-alts",
    "fix-h1",
    "add-schema-article",
    "add-schema-faq",
    "enrich-content",
    "rewrite-content",
    "regenerate-content",
  ]),
  pageUrl: z.string().url(),
  // Données brutes de l'audit pour donner du contexte à l'IA
  audit: z
    .object({
      title: z.object({ value: z.string().nullable() }).optional(),
      metaDescription: z.object({ value: z.string().nullable() }).optional(),
      h1: z.object({ values: z.array(z.string()) }).optional(),
      wordCount: z.number().optional(),
      firstParagraph: z.string().nullable().optional(),
      images: z.object({ missingAltUrls: z.array(z.string()) }).optional(),
      openGraph: z
        .object({
          title: z.string().nullable(),
          description: z.string().nullable(),
          image: z.string().nullable(),
        })
        .optional(),
      eeat: z
        .object({
          author: z.string().nullable(),
          datePublished: z.string().nullable(),
          dateModified: z.string().nullable(),
        })
        .optional(),
    })
    .passthrough(),
});

const PROMPTS: Record<
  FixId,
  (a: z.infer<typeof inputSchema>) => string
> = {
  "update-title": (a) =>
    `On veut optimiser le <title> SEO de la page ${a.pageUrl}.

Title actuel : "${a.audit.title?.value ?? "(vide)"}"
H1 de la page : ${a.audit.h1?.values.join(" / ") || "(aucun)"}

Propose un title SEO entre 50 et 60 caractères, en français, qui :
- Inclut le bénéfice principal pour l'utilisateur
- Contient les mots-clés naturellement
- Évite le keyword stuffing
- N'inclut PAS le nom de la marque sauf s'il est très court

Réponds UNIQUEMENT avec le title, sans guillemets, sans préfixe, sans explication.`,

  "update-meta-description": (a) =>
    `On veut écrire la meta description de la page ${a.pageUrl}.

Title : "${a.audit.title?.value ?? "(vide)"}"
H1 : ${a.audit.h1?.values.join(" / ") || "(aucun)"}
Description actuelle : "${a.audit.metaDescription?.value ?? "(aucune)"}"

Propose une meta description en français, entre 140 et 160 caractères, qui :
- Résume le contenu de la page
- Donne envie de cliquer
- Contient un appel à l'action implicite ou explicite
- Inclut le mot-clé principal naturellement

Réponds UNIQUEMENT avec la description, sans guillemets, sans préfixe, sans explication.`,

  "add-canonical": (a) =>
    `URL canonique pour la page ${a.pageUrl} : retourne simplement l'URL nettoyée (sans paramètres de tracking, en HTTPS, avec slash final cohérent). Pas d'explication.`,

  "add-og-tags": (a) =>
    `On veut écrire les balises Open Graph de la page ${a.pageUrl} pour les partages Facebook/LinkedIn/WhatsApp.

Title actuel : "${a.audit.title?.value ?? "(vide)"}"
Meta description actuelle : "${a.audit.metaDescription?.value ?? "(aucune)"}"
H1 : ${a.audit.h1?.values.join(" / ") || "(aucun)"}

Propose en JSON STRICT (pas de markdown, pas de \`\`\`):
{
  "ogTitle": "...",          // 30-70 caractères, accrocheur, en français
  "ogDescription": "..."     // 100-200 caractères, donne envie de cliquer, en français
}

Pas d'autre champ. Pas d'explication. JSON pur.`,

  "fix-image-alts": (a) => {
    const urls = a.audit.images?.missingAltUrls ?? [];
    if (urls.length === 0) return "Aucune image sans alt à corriger. Réponds : {}";
    return `On veut générer des attributs alt descriptifs pour ${urls.length} images sur ${a.pageUrl}.

Contexte : title="${a.audit.title?.value ?? ""}", H1="${a.audit.h1?.values?.[0] ?? ""}".

Pour chacune des URLs ci-dessous, propose un alt en français court (5-15 mots), qui décrit visuellement l'image dans son contexte (pas juste "image", "logo", etc.). Devine le contenu probable à partir du nom de fichier et du contexte de la page.

Images :
${urls.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Réponds en JSON STRICT (pas de markdown) avec un objet ayant pour clés les URLs :
{
  "${urls[0]}": "Alt 1",
  ...
}`;
  },

  "fix-h1": (a) =>
    `On veut générer un H1 pour la page ${a.pageUrl}.

Title actuel : "${a.audit.title?.value ?? "(vide)"}"
Meta description : "${a.audit.metaDescription?.value ?? "(vide)"}"
Première phrase visible : "${a.audit.firstParagraph ?? "(rien)"}"

Propose un H1 en français de 30-70 caractères qui :
- Diffère du title (le title est pour Google, le H1 pour le visiteur)
- Inclut le mot-clé principal naturellement
- Promet un bénéfice ou pose une question engageante

Réponds UNIQUEMENT avec le H1, sans guillemets, sans préfixe, sans explication.`,

  "add-schema-article": (a) =>
    `On veut générer un bloc schema.org JSON-LD de type Article (ou BlogPosting) pour la page ${a.pageUrl}, conforme aux recommandations Google 2026 pour AI Overviews.

Contexte de la page :
- Title : "${a.audit.title?.value ?? "(vide)"}"
- Meta description : "${a.audit.metaDescription?.value ?? "(vide)"}"
- H1 : "${a.audit.h1?.values?.[0] ?? "(vide)"}"
- Première phrase : "${a.audit.firstParagraph ?? ""}"
- Auteur détecté : "${a.audit.eeat?.author ?? "(non détecté — utiliser nom du site)"}"
- Date publiée : "${a.audit.eeat?.datePublished ?? new Date().toISOString().slice(0, 10)}"
- URL : ${a.pageUrl}

Génère un objet JSON-LD valide schema.org/Article avec : @context, @type, headline, description, author (Person ou Organization), datePublished, dateModified, mainEntityOfPage, image (URL imagine plausible), inLanguage="fr-FR".

Réponds UNIQUEMENT le JSON brut (pas de \`\`\`, pas de commentaire) sous forme :
{"jsonld": "{...JSON sérialisé en string...}"}`,

  "add-schema-faq": (a) =>
    `On veut générer un bloc schema.org JSON-LD de type FAQPage pour la page ${a.pageUrl}, basé sur le contenu probable de la page.

Contexte :
- Title : "${a.audit.title?.value ?? ""}"
- H1 : "${a.audit.h1?.values?.[0] ?? ""}"
- Première phrase : "${a.audit.firstParagraph ?? ""}"

Génère 3 à 5 questions/réponses pertinentes que les utilisateurs se posent probablement sur ce sujet, au format schema.org FAQPage.

Réponds UNIQUEMENT en JSON brut (pas de \`\`\`) :
{"jsonld": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"FAQPage\\",\\"mainEntity\\":[...]}"}`,

  // Endpoints dédiés (pas de prompt simple ici) :
  // - enrich-content    → /api/seo/suggest-content
  // - rewrite-content   → /api/seo/suggest-rewrite
  // - regenerate-content → (à venir)
  "enrich-content": () =>
    `Voir endpoint dédié /api/seo/suggest-content`,
  "rewrite-content": () =>
    `Voir endpoint dédié /api/seo/suggest-rewrite`,
  "regenerate-content": () =>
    `Voir endpoint dédié /api/seo/regenerate-content (à implémenter)`,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body;
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

  const promptFn = PROMPTS[parsed.data.fixId];
  if (!promptFn) {
    return NextResponse.json(
      { error: `Fix non supporté : ${parsed.data.fixId}` },
      { status: 400 },
    );
  }

  const prompt = promptFn(parsed.data);
  const ai = await askWanapush(prompt);

  if (!ai) {
    return NextResponse.json(
      { error: "Aucune clé IA configurée (OPENAI_API_KEY ou ANTHROPIC_API_KEY)" },
      { status: 500 },
    );
  }

  // Cleanup standard du retour IA (enlève ```json blocks, guillemets parasites)
  const cleanText = ai.text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  let suggestion: Record<string, string>;
  if (parsed.data.fixId === "add-og-tags" || parsed.data.fixId === "fix-image-alts") {
    try {
      suggestion = JSON.parse(cleanText);
    } catch {
      return NextResponse.json(
        { error: `IA n'a pas retourné du JSON valide : ${cleanText.slice(0, 200)}` },
        { status: 500 },
      );
    }
  } else if (
    parsed.data.fixId === "add-schema-article" ||
    parsed.data.fixId === "add-schema-faq"
  ) {
    try {
      const parsedJsonld = JSON.parse(cleanText);
      // S'assure qu'on a bien le wrapper {jsonld: "..."} attendu
      if (parsedJsonld.jsonld) {
        suggestion = { jsonld: parsedJsonld.jsonld };
      } else {
        // L'IA a renvoyé le JSON-LD direct sans wrapper → on l'enveloppe
        suggestion = { jsonld: JSON.stringify(parsedJsonld) };
      }
    } catch {
      return NextResponse.json(
        { error: `IA n'a pas retourné du JSON valide : ${cleanText.slice(0, 300)}` },
        { status: 500 },
      );
    }
  } else if (parsed.data.fixId === "update-title") {
    suggestion = { title: cleanText.replace(/^["']|["']$/g, "") };
  } else if (parsed.data.fixId === "update-meta-description") {
    suggestion = { description: cleanText.replace(/^["']|["']$/g, "") };
  } else if (parsed.data.fixId === "add-canonical") {
    suggestion = { url: cleanText };
  } else if (parsed.data.fixId === "fix-h1") {
    suggestion = { h1: cleanText.replace(/^["']|["']$/g, "") };
  } else {
    suggestion = { text: cleanText };
  }

  return NextResponse.json({
    fixId: parsed.data.fixId,
    suggestion,
    provider: ai.provider,
    model: ai.model,
  });
}
