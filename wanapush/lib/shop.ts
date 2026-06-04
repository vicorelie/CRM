// Helpers e-commerce : récupération de boutique, ownership, formatting prix.
// Tous les modèles e-commerce sont scopés à un Shop (1 par siteSlug).

import { prisma } from "@/lib/prisma";
import type { Shop } from "@prisma/client";

/**
 * Récupère le Shop d'un utilisateur via le siteSlug, en vérifiant que
 * l'utilisateur en est propriétaire. Retourne null si non trouvé.
 */
export async function getShopForUser(
  userEmail: string,
  siteSlug: string,
): Promise<Shop | null> {
  return prisma.shop.findFirst({
    where: {
      siteSlug,
      user: { email: userEmail },
    },
  });
}

/**
 * Crée un Shop pour un site généré donné, ou retourne le shop existant.
 * Vérifie que l'utilisateur est bien propriétaire du GeneratedSite (via slug).
 */
export async function ensureShopForSite(
  userEmail: string,
  siteSlug: string,
  brandName?: string,
): Promise<Shop> {
  const existing = await getShopForUser(userEmail, siteSlug);
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new Error("Utilisateur introuvable");

  return prisma.shop.create({
    data: {
      userId: user.id,
      siteSlug,
      name: brandName ?? siteSlug,
      currency: "EUR",
      locale: "fr-FR",
      timezone: "Europe/Paris",
      stripeMode: "test",
      paypalMode: "sandbox",
    },
  });
}

/** Formate un nombre en chaîne monétaire selon currency/locale. */
export function formatMoney(amount: number | string, currency: string = "EUR", locale: string = "fr-FR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(num);
}

/** Slugify (a-z0-9-) pour les slugs produits / catégories. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Normalise un nom d'option pour matcher entre singulier/pluriel/accents.
 * "Couleurs"→"couleur", "Tailles"→"taille", "Matière"→"matier". */
export function normalizeOptionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(s|x)$/, "");
}

type IncomingValue = string | { value: string; color?: string | null; imageUrl?: string | null };
type IncomingOption = { name: string; values: IncomingValue[] };

/**
 * Canonicalise les noms d'options entrants contre le catalogue ShopOption du shop,
 * et upsert le catalogue pour qu'il reste la source unique de vérité visible dans
 * l'admin. Retourne les options avec leur nom potentiellement remplacé par le canonique.
 *
 * Pourquoi : sans ça, créer un produit avec "Couleur" alors que "Couleurs" existe
 * déjà au catalogue créait un doublon invisible dans /shop/[slug]/options.
 */
export async function syncOptionsWithCatalog(
  shopId: string,
  incoming: IncomingOption[],
): Promise<{ options: IncomingOption[]; renames: Map<string, string> }> {
  if (incoming.length === 0) return { options: incoming, renames: new Map() };

  const catalog = await prisma.shopOption.findMany({
    where: { shopId },
    select: { id: true, name: true, values: true, position: true },
    orderBy: { position: "asc" },
  });
  const byNorm = new Map<string, (typeof catalog)[number]>();
  for (const o of catalog) byNorm.set(normalizeOptionName(o.name), o);
  let maxPos = catalog.reduce((m, o) => Math.max(m, o.position), -1);

  const result: IncomingOption[] = [];
  const renames = new Map<string, string>(); // oldName → canonicalName
  for (const opt of incoming) {
    const norm = normalizeOptionName(opt.name);
    const existing = byNorm.get(norm);
    const canonicalName = existing?.name ?? opt.name;
    if (canonicalName !== opt.name) renames.set(opt.name, canonicalName);
    result.push({ ...opt, name: canonicalName });

    // Normalise les valeurs entrantes en objets {value, color, imageUrl}
    // PRÉSERVE le format objet : ne jamais downgrader en strings.
    const incomingValueObjs = opt.values
      .map((v) => (typeof v === "string"
        ? { value: v, color: null as string | null, imageUrl: null as string | null }
        : { value: v.value, color: v.color ?? null, imageUrl: v.imageUrl ?? null }))
      .filter((v) => typeof v.value === "string" && v.value.trim().length > 0);

    if (existing) {
      // Reconstruit le tableau existant en objets (le catalogue peut historiquement
      // contenir des strings simples ; on ne le casse pas).
      const currentRaw = Array.isArray(existing.values) ? (existing.values as unknown[]) : [];
      const current = currentRaw.map((v) =>
        typeof v === "string"
          ? { value: v, color: null as string | null, imageUrl: null as string | null }
          : (v as { value: string; color?: string | null; imageUrl?: string | null }),
      );
      // Merge : on ajoute seulement les valeurs incoming dont la string n'existe pas déjà.
      // Les couleurs / images existantes sont préservées coûte que coûte.
      const seen = new Set(current.map((v) => v.value));
      const merged = [...current];
      for (const v of incomingValueObjs) {
        if (!seen.has(v.value)) { merged.push(v); seen.add(v.value); }
      }
      if (merged.length > current.length) {
        await prisma.shopOption.update({ where: { id: existing.id }, data: { values: merged } });
      }
    } else {
      maxPos++;
      const created = await prisma.shopOption.create({
        data: { shopId, name: opt.name.trim(), values: incomingValueObjs, position: maxPos },
      });
      byNorm.set(norm, { id: created.id, name: created.name, values: incomingValueObjs, position: maxPos });
    }
  }
  return { options: result, renames };
}

/** Génère un slug unique en suffixant -2, -3... si conflit dans le shop. */
export async function uniqueProductSlug(shopId: string, baseSlug: string): Promise<string> {
  let slug = slugify(baseSlug);
  let n = 1;
  while (await prisma.product.findFirst({ where: { shopId, slug } })) {
    n++;
    slug = `${slugify(baseSlug)}-${n}`;
  }
  return slug;
}
