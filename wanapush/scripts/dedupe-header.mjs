#!/usr/bin/env node
// Retire les duplications de header (email user + back-link) maintenant que
// le layout (dashboard) fournit le header global avec logo + email + sign out.
// Conserve les breadcrumbs "← Retour au dashboard" comme affordance secondaire.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../app/(dashboard)/", import.meta.url).pathname;

const RULES = [
  // Retire la span email seule (laissée orpheline dans un header)
  [
    /\s*<span className="text-xs text-zinc-400(?:\s+hidden\s+sm:inline)?">\{session\.user\?\.email\}<\/span>/g,
    "",
    "email-span",
  ],
  // Retire l'import inutile s'il n'y a plus de référence à session.user.email
  // (on laisse les autres usages de session inchangés)
];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name === "page.tsx" || e.name === "layout.tsx") out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
let touched = 0;
const counts = new Map();
for (const f of files) {
  let src = await readFile(f, "utf8");
  const before = src;
  for (const [re, rep, label] of RULES) {
    const m = src.match(re);
    if (m) {
      src = src.replace(re, rep);
      counts.set(label, (counts.get(label) ?? 0) + m.length);
    }
  }
  if (src !== before) {
    await writeFile(f, src);
    touched++;
  }
}

console.log(`Dédup. terminée. Fichiers touchés: ${touched}/${files.length}`);
for (const [k, v] of counts) console.log(`  ${v}  ${k}`);
