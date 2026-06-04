// POST /api/shop/[siteSlug]/products/ai-generate
// Analyse 1+ photos d'un produit avec l'IA vision et renvoie titre, description,
// excerpt, tags, productType, meta SEO.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { askAi } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Normalise un nom d'option pour matcher entre singulier/pluriel/accents.
// "Couleurs" → "couleur", "Tailles" → "taille", "Matière" → "matier".
function normalizeOptionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(s|x)$/, "");
}

export const runtime = "nodejs";
export const maxDuration = 90;

type Params = { params: Promise<{ siteSlug: string }> };

const inputSchema = z.object({
  // Plusieurs images en data URL (data:image/jpeg;base64,...)
  images: z.array(z.string().min(20)).min(1).max(8),
  // Hints optionnels pour guider l'IA
  vendor: z.string().max(80).optional(),
  hint: z.string().max(500).optional(),
});

const SYSTEM = `Tu es un copywriter e-commerce senior spécialisé dans le SEO et la conversion.
On te fournit UNE OU PLUSIEURS photos d'un produit. Ces photos peuvent montrer :
- Le MÊME produit sous différents angles → tu écris une seule fiche descriptive
- Le MÊME produit dans DIFFÉRENTES COULEURS / variantes → tu détectes les coloris distincts et tu les listes dans "options"
- Plusieurs tailles, finitions ou matières visibles → tu les ajoutes dans "options"

Règles strictes :
- Analyse VISUELLEMENT chaque photo : matière, couleur(s) distincte(s), coupe, style, usage, cible.
- Le TITRE doit être GÉNÉRIQUE (ex. "Sweat à capuche Supergirl"), surtout PAS spécifique à une seule couleur si tu détectes plusieurs coloris. Les coloris vont dans options.
- Si tu vois plusieurs couleurs sur des photos distinctes du même produit → ajoute une option "Couleur" avec une valeur par coloris détecté. Reflète le nom exact de la couleur en français (Noir, Vert sapin, Blanc cassé, etc.).
- Si le produit est typiquement vendu en tailles (vêtement, chaussure) → ajoute une option "Taille" avec une plage standard adaptée (XS S M L XL pour vêtements adultes ; 36-46 pour chaussures EU ; 6-14 ans pour enfants ; etc.). Ne devine PAS la taille à partir de la photo, propose une plage cohérente avec le type de produit.
- Pas d'options inventées : si rien n'est visuellement évident comme variant, renvoie "options": [].
- Tu ne fais AUCUNE supposition sur le prix ou la marque (sauf si fournie en hint).
- Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans fence, sans préfixe.

Format strict :
{
  "title": "Nom court GÉNÉRIQUE (3-7 mots max, sans préciser une couleur si plusieurs détectées)",
  "excerpt": "Phrase courte (max 200 caractères) qui résume le produit et son bénéfice principal.",
  "description": "Description longue en Markdown. 200-400 mots. Inclus :\\n## En bref\\n- caractéristique\\n- ...\\n\\n## Détails\\nparagraphe descriptif riche\\n\\n## Composition / matières\\n- ...\\n\\n## Conseils d'entretien\\n- ...",
  "productType": "PHYSICAL" | "DIGITAL" | "SERVICE",
  "tags": ["tag1", "tag2", "tag3"],
  "options": [
    { "name": "Couleur", "values": ["Noir", "Vert"] },
    { "name": "Taille", "values": ["S", "M", "L", "XL"] }
  ],
  "metaTitle": "Titre SEO (max 60 caractères, inclut le mot-clé principal)",
  "metaDescription": "Meta description SEO (max 155 caractères, accroche + CTA implicite)"
}`;

const outputSchema = z.object({
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500),
  description: z.string().max(5000),
  productType: z.enum(["PHYSICAL", "DIGITAL", "SERVICE"]).default("PHYSICAL"),
  tags: z.array(z.string()).max(20),
  options: z.array(z.object({
    name: z.string().min(1).max(80),
    values: z.array(z.string().min(1).max(80)).min(1).max(20),
  })).max(3).default([]),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(400).optional(),
});

function tryParseJson(text: string): unknown | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  try { return JSON.parse(cleaned); } catch {}
  return null;
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });

  const nImages = parsed.data.images.length;

  // Charge les options déjà utilisées dans la boutique pour éviter que l'IA crée
  // des doublons (ex. "Couleur" alors que "Couleurs" existe déjà).
  // Sources : ShopOption (catalogue formel) + ProductOption (utilisées sur produits existants).
  const [shopOptions, productOptions] = await Promise.all([
    prisma.shopOption.findMany({
      where: { shopId: shop.id },
      select: { name: true, values: true },
      orderBy: { position: "asc" },
    }),
    prisma.productOption.findMany({
      where: { product: { shopId: shop.id } },
      select: { name: true, values: { select: { value: true } } },
    }),
  ]);

  // Agrège par nom canonique (le premier rencontré gagne) ; collecte aussi les valeurs.
  const existingNameByNorm = new Map<string, string>();
  const valuesByName = new Map<string, Set<string>>();
  function record(name: string, values: string[]) {
    const norm = normalizeOptionName(name);
    if (!existingNameByNorm.has(norm)) existingNameByNorm.set(norm, name);
    const canonical = existingNameByNorm.get(norm)!;
    const set = valuesByName.get(canonical) ?? new Set<string>();
    for (const v of values) if (v) set.add(v);
    valuesByName.set(canonical, set);
  }
  for (const o of shopOptions) {
    const vals = Array.isArray(o.values) ? (o.values as string[]).filter((v) => typeof v === "string") : [];
    record(o.name, vals);
  }
  for (const o of productOptions) {
    record(o.name, o.values.map((v) => v.value));
  }

  const existingBlock = existingNameByNorm.size > 0
    ? `\n\nOPTIONS DÉJÀ UTILISÉES dans cette boutique (utilise EXACTEMENT le même nom si l'option correspond, ne crée PAS de doublon singulier/pluriel) :\n${Array.from(existingNameByNorm.values())
        .map((name) => {
          const vals = Array.from(valuesByName.get(name) ?? []);
          return `- "${name}"${vals.length > 0 ? ` (valeurs déjà utilisées : ${vals.join(", ")})` : ""}`;
        })
        .join("\n")}`
    : "";

  const hintLines = [
    parsed.data.vendor ? `Marque / vendeur : ${parsed.data.vendor}` : null,
    parsed.data.hint ? `Indications du marchand : ${parsed.data.hint}` : null,
    existingBlock || null,
  ].filter(Boolean).join("\n");

  const stepInstr = nImages > 1
    ? `${nImages} PHOTOS sont fournies. AVANT TOUT, tu dois suivre ce raisonnement à voix haute (uniquement mentalement, ne l'écris pas dans la réponse, mais APPLIQUE-LE) :

1. Identifie chaque photo : objet visible, angles, couleurs DOMINANTES.
2. Détermine si les photos montrent :
   (a) le MÊME produit identique sous différents angles → 1 produit, 0 option couleur
   (b) le MÊME produit dans DES COULEURS DIFFÉRENTES → 1 produit, option Couleur avec une valeur par coloris distinct
   (c) des produits différents → ne traite que le 1er, mais ignore ce cas (rare)
3. Si (b) : la valeur "title" doit être GÉNÉRIQUE (jamais "Sweat noir Supergirl", mais "Sweat Supergirl"), et l'option "Couleur" doit lister chaque coloris détecté. Le mot "noir", "blanc", etc. ne doit jamais apparaître dans le title si plusieurs coloris.
4. Si le produit est typiquement vendu en tailles : ajoute aussi "Taille" avec une plage standard cohérente (vêtement adulte = XS S M L XL).`
    : `1 photo fournie. Analyse-la pour la fiche. Pas d'option Couleur sauf si plusieurs coloris du même produit y sont visiblement présents. Ajoute "Taille" avec plage standard si c'est un vêtement / chaussure.`;

  const userPrompt = `${hintLines ? hintLines + "\n\n" : ""}${stepInstr}\n\nGénère MAINTENANT la fiche produit au format JSON décrit. La clé "options" est OBLIGATOIRE dans ta réponse — un tableau vide [] si aucune variante détectée, sinon un tableau de { name, values }.`;

  let aiRes;
  try {
    aiRes = await askAi({
      prompt: userPrompt,
      system: SYSTEM,
      temperature: 0.6,
      maxTokens: 2000,
      imagesBase64: parsed.data.images,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Erreur IA : ${msg}` }, { status: 502 });
  }

  if (!aiRes?.text) return NextResponse.json({ error: "Pas de réponse IA" }, { status: 502 });

  console.log(`[ai-generate] ${nImages} images → AI (${aiRes.provider}/${aiRes.model}). Raw response:\n${aiRes.text.slice(0, 1500)}`);

  const raw = tryParseJson(aiRes.text);
  if (!raw) return NextResponse.json({ error: "JSON IA invalide", rawSnippet: aiRes.text.slice(0, 300) }, { status: 502 });

  const validated = outputSchema.safeParse(raw);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.issues[0]?.message ?? "Schéma IA invalide", raw }, { status: 502 });
  }

  // Post-traitement : remap les noms d'options IA vers les noms existants
  // de la boutique quand la forme normalisée matche (singulier ↔ pluriel, accents).
  const remappedOptions = validated.data.options.map((opt) => {
    const norm = normalizeOptionName(opt.name);
    const canonical = existingNameByNorm.get(norm);
    if (canonical && canonical !== opt.name) {
      console.log(`[ai-generate] Remap option "${opt.name}" → "${canonical}" (déjà existante dans la boutique)`);
      return { ...opt, name: canonical };
    }
    return opt;
  });

  console.log(`[ai-generate] Options finales: ${JSON.stringify(remappedOptions)}`);

  return NextResponse.json({
    ...validated.data,
    options: remappedOptions,
    provider: aiRes.provider,
    model: aiRes.model,
  });
}
