#!/usr/bin/env node
// Nettoie les doublons d'options de boutique (ex: "Couleur" vs "Couleurs").
// Pour chaque shop :
//   - Aggrège ShopOption + ProductOption par nom normalisé (singulier/pluriel/accents)
//   - Choisit un nom canonique (priorité au ShopOption existant, sinon le 1er rencontré)
//   - Renomme tous les ProductOption vers le canonical
//   - Upsert le catalogue ShopOption en mergeant les valeurs
//
// Usage : node scripts/cleanup-option-duplicates.mjs [--dry-run]
// Réversible via snapshot DB. Idempotent.

import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

function normalizeOptionName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(s|x)$/, "");
}

const shops = await prisma.shop.findMany({ select: { id: true, siteSlug: true, name: true } });
console.log(`${shops.length} boutiques à inspecter${DRY ? " (DRY-RUN)" : ""}.\n`);

let totalRenames = 0;
let totalUpserts = 0;

for (const shop of shops) {
  const [catalog, prodOpts] = await Promise.all([
    prisma.shopOption.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true, values: true, position: true },
      orderBy: { position: "asc" },
    }),
    prisma.productOption.findMany({
      where: { product: { shopId: shop.id } },
      select: { id: true, name: true, values: { select: { value: true } } },
    }),
  ]);

  if (catalog.length === 0 && prodOpts.length === 0) continue;

  // Construit le mapping norm → canonical name (priorité au catalog)
  const byNorm = new Map();
  const valuesByCanon = new Map(); // canonical name → Set<string>
  function record(name, values, isCatalog) {
    const norm = normalizeOptionName(name);
    if (!byNorm.has(norm) || isCatalog) byNorm.set(norm, name);
    const canon = byNorm.get(norm);
    const set = valuesByCanon.get(canon) ?? new Set();
    for (const v of values) if (v) set.add(v);
    valuesByCanon.set(canon, set);
  }
  for (const o of catalog) {
    const vals = Array.isArray(o.values) ? o.values.filter((v) => typeof v === "string") : [];
    record(o.name, vals, true);
  }
  for (const o of prodOpts) record(o.name, o.values.map((v) => v.value), false);

  // Si toutes les variations partagent le même nom, rien à faire pour ce shop.
  const distinctNames = new Set([...catalog.map((c) => c.name), ...prodOpts.map((p) => p.name)]);
  const distinctNorms = new Set([...distinctNames].map(normalizeOptionName));
  if (distinctNames.size === distinctNorms.size) {
    // Mais il peut quand même y avoir des ProductOption pas encore dans catalog → upsert
  }

  console.log(`── Shop "${shop.name}" (${shop.siteSlug})`);
  console.log(`   Catalog: ${catalog.map((c) => c.name).join(", ") || "(vide)"}`);
  console.log(`   ProductOption distincts: ${[...new Set(prodOpts.map((p) => p.name))].join(", ") || "(aucun)"}`);

  // 1) Rename des ProductOption qui n'ont pas le nom canonique
  for (const po of prodOpts) {
    const canon = byNorm.get(normalizeOptionName(po.name));
    if (canon && canon !== po.name) {
      console.log(`   RENAME ProductOption "${po.name}" → "${canon}" (id=${po.id})`);
      if (!DRY) {
        await prisma.productOption.update({ where: { id: po.id }, data: { name: canon } });
      }
      totalRenames++;
    }
  }

  // 2) Upsert ShopOption pour chaque norm avec union des valeurs (FORMAT OBJET).
  // Préserve les couleurs / images du catalog existant.
  let maxPos = catalog.reduce((m, o) => Math.max(m, o.position), -1);
  for (const [, canonName] of byNorm) {
    const existing = catalog.find((c) => c.name === canonName);
    const newValueStrings = Array.from(valuesByCanon.get(canonName) ?? []);
    if (existing) {
      const currentRaw = Array.isArray(existing.values) ? existing.values : [];
      const current = currentRaw.map((v) =>
        typeof v === "string" ? { value: v, color: null, imageUrl: null } : v,
      );
      const seen = new Set(current.map((v) => v.value));
      const merged = [...current];
      for (const value of newValueStrings) {
        if (!seen.has(value)) { merged.push({ value, color: null, imageUrl: null }); seen.add(value); }
      }
      if (merged.length > current.length) {
        console.log(`   UPDATE ShopOption "${canonName}": valeurs ${current.length} → ${merged.length}`);
        if (!DRY) await prisma.shopOption.update({ where: { id: existing.id }, data: { values: merged } });
        totalUpserts++;
      }
    } else if (newValueStrings.length > 0) {
      maxPos++;
      const objs = newValueStrings.map((value) => ({ value, color: null, imageUrl: null }));
      console.log(`   CREATE ShopOption "${canonName}" (${objs.length} valeurs)`);
      if (!DRY) {
        await prisma.shopOption.create({
          data: { shopId: shop.id, name: canonName, values: objs, position: maxPos },
        });
      }
      totalUpserts++;
    }
  }

  // 3) Supprime les ShopOption orphelins dont la norm est en doublon (autre ShopOption gagne)
  const seenCanon = new Set();
  for (const c of catalog) {
    const canon = byNorm.get(normalizeOptionName(c.name));
    if (canon !== c.name) {
      console.log(`   DELETE ShopOption doublon "${c.name}" (canonique = "${canon}")`);
      if (!DRY) await prisma.shopOption.delete({ where: { id: c.id } });
    } else {
      if (seenCanon.has(canon)) {
        console.log(`   DELETE ShopOption doublon redondant "${c.name}" (id=${c.id})`);
        if (!DRY) await prisma.shopOption.delete({ where: { id: c.id } });
      } else {
        seenCanon.add(canon);
      }
    }
  }
}

console.log(`\n=== Terminé ===`);
console.log(`Renames ProductOption: ${totalRenames}`);
console.log(`Upserts ShopOption: ${totalUpserts}`);
console.log(DRY ? "Lance sans --dry-run pour appliquer." : "Modifications appliquées.");

await prisma.$disconnect();
