#!/usr/bin/env node
// Migration mécanique dark→light pour le redesign WanaPush.
// Lance: node scripts/migrate-design.mjs
// Cible: tous les .tsx sous app/(dashboard)/
// Réversible via git checkout.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../app/(dashboard)/", import.meta.url).pathname;

// Mappings ordonnés : les plus spécifiques en premier (gradients, opacités) avant les bases.
// Chaque entrée: [regex, replacement, label]
const RULES = [
  // ---- Gradients hero/page (les plus spécifiques) ----
  [/bg-gradient-to-br\s+from-slate-950\s+via-slate-900\s+to-indigo-950/g, "bg-white", "hero-gradient"],
  [/bg-gradient-to-r\s+from-white\s+via-indigo-200\s+to-indigo-400\s+bg-clip-text\s+text-transparent/g, "text-zinc-950", "title-gradient"],
  [/from-slate-950/g, "from-white", "from-slate-950"],
  [/via-slate-900/g, "via-white", "via-slate-900"],
  [/to-indigo-950/g, "to-white", "to-indigo-950"],
  [/from-indigo-950/g, "from-white", "from-indigo-950"],
  [/to-slate-950/g, "to-white", "to-slate-950"],
  [/from-slate-900/g, "from-zinc-50", "from-slate-900"],
  [/to-slate-900/g, "to-zinc-50", "to-slate-900"],

  // ---- Backgrounds slate ----
  [/bg-slate-950\/(\d{1,3})/g, "bg-white/$1", "bg-slate-950/N"],
  [/bg-slate-900\/(\d{1,3})/g, "bg-white/$1", "bg-slate-900/N"],
  [/bg-slate-800\/(\d{1,3})/g, "bg-zinc-100/$1", "bg-slate-800/N"],
  [/bg-slate-700\/(\d{1,3})/g, "bg-zinc-200/$1", "bg-slate-700/N"],
  [/bg-slate-600\/(\d{1,3})/g, "bg-zinc-300/$1", "bg-slate-600/N"],
  [/bg-slate-500\/(\d{1,3})/g, "bg-zinc-100", "bg-slate-500/N"],
  [/\bbg-slate-950\b/g, "bg-white", "bg-slate-950"],
  [/\bbg-slate-900\b/g, "bg-zinc-50", "bg-slate-900"],
  [/\bbg-slate-800\b/g, "bg-zinc-100", "bg-slate-800"],
  [/\bbg-slate-700\b/g, "bg-zinc-200", "bg-slate-700"],

  // ---- Text slate ----
  [/\btext-slate-50\b/g, "text-zinc-950", "text-slate-50"],
  [/\btext-slate-100\b/g, "text-zinc-900", "text-slate-100"],
  [/\btext-slate-200\b/g, "text-zinc-800", "text-slate-200"],
  [/\btext-slate-300\b/g, "text-zinc-700", "text-slate-300"],
  [/\btext-slate-400\b/g, "text-zinc-500", "text-slate-400"],
  [/\btext-slate-500\b/g, "text-zinc-400", "text-slate-500"],
  [/\btext-slate-600\b/g, "text-zinc-300", "text-slate-600"],

  // ---- Borders slate ----
  [/\bborder-slate-950\b/g, "border-zinc-200", "border-slate-950"],
  [/\bborder-slate-900\b/g, "border-zinc-200", "border-slate-900"],
  [/\bborder-slate-800\b/g, "border-zinc-200", "border-slate-800"],
  [/\bborder-slate-700\b/g, "border-zinc-200", "border-slate-700"],
  [/\bborder-slate-600\b/g, "border-zinc-300", "border-slate-600"],
  [/\bborder-slate-500\b/g, "border-zinc-300", "border-slate-500"],

  // ---- Hover variantes slate ----
  [/\bhover:bg-slate-950\b/g, "hover:bg-zinc-50", "hover:bg-slate-950"],
  [/\bhover:bg-slate-900\b/g, "hover:bg-zinc-50", "hover:bg-slate-900"],
  [/\bhover:bg-slate-800\b/g, "hover:bg-zinc-100", "hover:bg-slate-800"],
  [/\bhover:text-slate-100\b/g, "hover:text-zinc-950", "hover:text-slate-100"],
  [/\bhover:text-slate-200\b/g, "hover:text-zinc-900", "hover:text-slate-200"],
  [/\bhover:text-slate-300\b/g, "hover:text-zinc-700", "hover:text-slate-300"],
  [/\bhover:border-slate-500\b/g, "hover:border-zinc-300", "hover:border-slate-500"],
  [/\bhover:border-slate-600\b/g, "hover:border-zinc-300", "hover:border-slate-600"],
  [/\bhover:border-slate-700\b/g, "hover:border-zinc-300", "hover:border-slate-700"],

  // ---- Placeholders ----
  [/\bplaceholder-slate-400\b/g, "placeholder-zinc-400", "placeholder-slate-400"],
  [/\bplaceholder-slate-500\b/g, "placeholder-zinc-400", "placeholder-slate-500"],
  [/\bplaceholder-slate-600\b/g, "placeholder-zinc-400", "placeholder-slate-600"],

  // ---- Ring slate ----
  [/\bring-slate-(\d{2,3})\b/g, (_, n) => `ring-zinc-${n}`, "ring-slate-N"],
  [/\bdivide-slate-(\d{2,3})\b/g, (_, n) => `divide-zinc-${n}`, "divide-slate-N"],
  [/\bfill-slate-(\d{2,3})\b/g, (_, n) => `fill-zinc-${n}`, "fill-slate-N"],
  [/\bstroke-slate-(\d{2,3})\b/g, (_, n) => `stroke-zinc-${n}`, "stroke-slate-N"],

  // ---- Indigo → brand ----
  // Avec opacité
  [/bg-indigo-500\/(\d{1,3})/g, "bg-brand/$1", "bg-indigo-500/N"],
  [/bg-indigo-400\/(\d{1,3})/g, "bg-brand-400/$1", "bg-indigo-400/N"],
  [/border-indigo-500\/(\d{1,3})/g, "border-brand/$1", "border-indigo-500/N"],
  [/ring-indigo-500\/(\d{1,3})/g, "ring-brand/$1", "ring-indigo-500/N"],
  [/text-indigo-(\d{2,3})\/(\d{1,3})/g, (_, n, op) => `text-brand-${n}/${op}`, "text-indigo-N/op"],

  // Bases
  [/\bbg-indigo-50\b/g, "bg-brand-50", "bg-indigo-50"],
  [/\bbg-indigo-100\b/g, "bg-brand-100", "bg-indigo-100"],
  [/\bbg-indigo-400\b/g, "bg-brand-400", "bg-indigo-400"],
  [/\bbg-indigo-500\b/g, "bg-brand", "bg-indigo-500"],
  [/\bbg-indigo-600\b/g, "bg-brand-600", "bg-indigo-600"],
  [/\bbg-indigo-700\b/g, "bg-brand-700", "bg-indigo-700"],

  [/\btext-indigo-100\b/g, "text-brand-700", "text-indigo-100"],
  [/\btext-indigo-200\b/g, "text-brand-700", "text-indigo-200"],
  [/\btext-indigo-300\b/g, "text-brand-700", "text-indigo-300"],
  [/\btext-indigo-400\b/g, "text-brand-700", "text-indigo-400"],
  [/\btext-indigo-500\b/g, "text-brand", "text-indigo-500"],
  [/\btext-indigo-600\b/g, "text-brand-700", "text-indigo-600"],
  [/\btext-indigo-700\b/g, "text-brand-800", "text-indigo-700"],

  [/\bborder-indigo-500\b/g, "border-brand", "border-indigo-500"],
  [/\bborder-indigo-400\b/g, "border-brand-400", "border-indigo-400"],
  [/\bborder-indigo-600\b/g, "border-brand-600", "border-indigo-600"],

  [/\bhover:bg-indigo-400\b/g, "hover:bg-brand-400", "hover:bg-indigo-400"],
  [/\bhover:bg-indigo-500\b/g, "hover:bg-brand", "hover:bg-indigo-500"],
  [/\bhover:bg-indigo-600\b/g, "hover:bg-brand-600", "hover:bg-indigo-600"],
  [/\bhover:text-indigo-300\b/g, "hover:text-brand-700", "hover:text-indigo-300"],
  [/\bhover:text-indigo-400\b/g, "hover:text-brand-700", "hover:text-indigo-400"],
  [/\bhover:border-indigo-500\b/g, "hover:border-brand", "hover:border-indigo-500"],

  [/\bfocus:border-indigo-500\b/g, "focus:border-brand", "focus:border-indigo-500"],
  [/\bfocus:ring-indigo-500\b/g, "focus:ring-brand", "focus:ring-indigo-500"],

  // ---- Red/Amber sur dark theme (opacités tonales) → versions light ----
  [/\bbg-red-500\/(\d{1,2})\b/g, "bg-red-50", "bg-red-500/N"],
  [/\bborder-red-500\/(\d{1,3})\b/g, "border-red-200", "border-red-500/N"],
  [/\btext-red-300\b/g, "text-red-700", "text-red-300"],
  [/\btext-red-400\b/g, "text-red-700", "text-red-400"],
  [/\bbg-amber-500\/(\d{1,3})\b/g, "bg-amber-50", "bg-amber-500/N"],
  [/\btext-amber-300\b/g, "text-amber-800", "text-amber-300"],
  [/\btext-amber-400\b/g, "text-amber-800", "text-amber-400"],
  [/\bbg-emerald-500\/(\d{1,3})\b/g, "bg-emerald-50", "bg-emerald-500/N"],
  [/\btext-emerald-300\b/g, "text-emerald-700", "text-emerald-300"],
  [/\btext-emerald-400\b/g, "text-emerald-700", "text-emerald-400"],

  // ---- Cleanup backdrop-blur sur surfaces qui sont devenues blanches ----
  // (on garde backdrop-blur, ça ne fait juste rien sur du blanc — pas de casse)
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(p)));
    } else if (e.isFile() && (p.endsWith(".tsx") || p.endsWith(".ts"))) {
      files.push(p);
    }
  }
  return files;
}

const files = await walk(ROOT);
let totalChanges = 0;
let touched = 0;
const perRule = new Map();

for (const file of files) {
  let src = await readFile(file, "utf8");
  const before = src;
  for (const [re, rep, label] of RULES) {
    const matches = src.match(re);
    if (matches) {
      src = src.replace(re, rep);
      perRule.set(label, (perRule.get(label) ?? 0) + matches.length);
      totalChanges += matches.length;
    }
  }
  if (src !== before) {
    await writeFile(file, src);
    touched++;
  }
}

console.log(`\n=== Migration terminée ===`);
console.log(`Fichiers touchés: ${touched} / ${files.length}`);
console.log(`Remplacements totaux: ${totalChanges}\n`);
const top = [...perRule.entries()].sort((a, b) => b[1] - a[1]);
for (const [label, n] of top) console.log(`  ${n.toString().padStart(4)}  ${label}`);
