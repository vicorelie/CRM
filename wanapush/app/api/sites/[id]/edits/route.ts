// Endpoint d'édition WYSIWYG : reçoit les modifications faites depuis le
// preview /preview/{slug}/?edit=1, patche les sources du site (Home.tsx +
// index.css), et déclenche un rebuild Vite. La page rafraichit ensuite.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

const inputSchema = z.object({
  edits: z.array(
    z.object({
      kind: z.enum(["section", "theme", "element", "mutation"]),
      section: z.string().optional(), // ex "Hero", "Cta", "Contact"
      field: z.string().optional(),   // ex "title", "subtitle", "primaryColor", "*"
      prop: z.string().optional(),    // pour kind="element" : "color" | "bg"
      value: z.string().optional(),
      // Mutations structurelles (kind="mutation") :
      //   op="remove-section"     → supprime data-edit-section=section
      //   op="remove-item"        → supprime l'item index dans section
      //   op="duplicate-item"     → duplique l'item index dans section
      //   op="add-section"        → insère sectionType après afterSection (ou en début si vide)
      op: z.enum([
        "remove-section",
        "remove-item",
        "duplicate-item",
        "add-section",
        "remove-element",
        "add-element",
        "image-overlay",
        "form-input-placeholder",
        "add-form-field",
        "text-content",
        "set-form-html",
      ]).optional(),
      itemIndex: z.number().int().optional(),
      itemPrefix: z.string().optional(),       // ex "items", "blocks", "steps"
      afterSection: z.string().optional(),
      sectionType: z.string().optional(),
      afterField: z.string().optional(),       // data-edit-field après lequel insérer
      elementType: z.string().optional(),
      inputName: z.string().optional(),        // pour form-input-placeholder
      afterInputName: z.string().optional(),   // pour add-form-field
      fieldType: z.string().optional(),        // pour add-form-field (text|email|tel|…)
      formIndex: z.number().int().optional(),  // pour set-form-html
    }),
  ),
});

/**
 * Patche une prop JSX dans un appel de composant.
 * Supporte les paths simples (`title`) ET les paths array/objet (`blocks.0.title`,
 * `items.2.desc`, `stats.0.value`).
 *
 * Stratégie :
 * - Path simple : trouve `<TagName ... title={"..."}` et remplace la string.
 * - Path indexé : trouve `<TagName ... rootKey={[...JSON...]}`, parse le JSON,
 *   modifie le champ ciblé, restringify, ré-injecte.
 */
function patchJsxProp(content: string, tagName: string, fieldPath: string, newValue: string): string {
  const parts = fieldPath.split(".");
  const rootKey = parts[0];
  const tagRegex = new RegExp(`(<${tagName}\\s+[^>]*?)(/>|>)`, "g");

  return content.replace(tagRegex, (_match, body, end) => {
    // Cas 1 : path simple (1 segment) → patche directement la prop string
    if (parts.length === 1) {
      const propRegex = new RegExp(`(\\b${rootKey}=)\\{"(?:[^"\\\\]|\\\\.)*"\\}`);
      if (propRegex.test(body)) {
        return body.replace(propRegex, `$1${JSON.stringify(newValue)}`) + end;
      }
      return `${body.trimEnd()} ${rootKey}=${JSON.stringify(newValue)} ${end}`;
    }

    // Cas 2 : path indexé/imbriqué → on cherche `rootKey={[...JSON...]}`
    const arrayRegex = new RegExp(`(\\b${rootKey}=\\{)(\\[(?:[^\\[\\]]|\\[[^\\[\\]]*\\])*\\])(\\})`);
    const m = body.match(arrayRegex);
    if (!m) return body + end;
    let parsed: unknown;
    try { parsed = JSON.parse(m[2]); } catch { return body + end; }
    if (!Array.isArray(parsed)) return body + end;

    // Navigue dans parsed selon parts.slice(1) (path après rootKey)
    let target: Record<string, unknown> | unknown[] = parsed as unknown[];
    const restPath = parts.slice(1);
    for (let i = 0; i < restPath.length - 1; i++) {
      const seg = restPath[i];
      const key: string | number = /^\d+$/.test(seg) ? parseInt(seg) : seg;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const next: unknown = (target as any)[key];
      if (next === undefined || next === null) return body + end;
      target = next as Record<string, unknown> | unknown[];
    }
    const lastSeg = restPath[restPath.length - 1];
    const lastKey: string | number = /^\d+$/.test(lastSeg) ? parseInt(lastSeg) : lastSeg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target as any)[lastKey] = newValue;

    const newJson = JSON.stringify(parsed);
    return body.replace(arrayRegex, `$1${newJson}$3`) + end;
  });
}

/**
 * Met à jour une variable CSS dans :root de src/index.css.
 * Utilisé pour les edits de thème (color pickers).
 */
function patchCssColor(content: string, varName: string, hex: string): string {
  const re = new RegExp(`(${varName}:\\s*)#[0-9a-fA-F]{3,8}`);
  if (re.test(content)) return content.replace(re, `$1${hex}`);
  // Fallback : insère dans :root
  return content.replace(/:root\s*\{/, `:root {\n  ${varName}: ${hex};`);
}

/**
 * Map du nom de champ envoyé par l'éditeur → nom de variable CSS dans :root.
 */
const THEME_VAR_MAP: Record<string, string> = {
  primaryColor: "--color-primary",
  secondaryColor: "--color-secondary",
  headingColor: "--color-heading",
  textColor: "--color-text",
  pageBg: "--color-bg-page",
  sectionBg: "--color-bg-section",
};

/**
 * Bloc CSS injecté dans src/index.css pour que les vars editor-only (headingColor,
 * textColor, pageBg, sectionBg) impactent réellement le rendu. Insertion idempotente :
 * si le marqueur est présent, on ne touche pas (les vars sont déjà câblées).
 */
const OVERRIDES_MARKER = "/* WP-EDITOR-OVERRIDES v3 */";
const OVERRIDES_BLOCK = `
${OVERRIDES_MARKER}
:root {
  --color-heading: #111827;
  --color-text: #4b5563;
  --color-bg-page: #ffffff;
  --color-bg-section: #f3f4f6;
}
/* On override uniquement les classes Tailwind de gris explicites, pour ne pas
   écraser text-white (hero sur image sombre) ou text-primary (accents). */
.text-gray-900, .text-gray-800, .text-gray-700 { color: var(--color-heading) !important; }
.text-gray-500, .text-gray-600, .text-gray-400 { color: var(--color-text) !important; }
html, body { background-color: var(--color-bg-page) !important; }
main { background-color: var(--color-bg-page) !important; }
main > section:not([class*="bg-primary"]):not([class*="bg-gray-9"]):not([class*="bg-gray-8"]):not([class*="bg-brand"]):not([class*="bg-black"]):not([class*="bg-slate-9"]):not([class*="bg-zinc-9"]):not([class*="bg-neutral-9"]) {
  background-color: var(--color-bg-page) !important;
}
main > section:nth-of-type(2n+3):not([class*="bg-primary"]):not([class*="bg-gray-9"]):not([class*="bg-gray-8"]):not([class*="bg-brand"]):not([class*="bg-black"]):not([class*="bg-slate-9"]):not([class*="bg-zinc-9"]):not([class*="bg-neutral-9"]) {
  background-color: var(--color-bg-section) !important;
}
`;

function ensureOverridesBlock(content: string): string {
  // Strip toute version antérieure du bloc (v1, v2, …) avant d'insérer la v3.
  // On capture depuis "/* WP-EDITOR-OVERRIDES vN */" jusqu'à la fin du bloc CSS
  // qu'on a écrit (= juste avant le prochain bloc marqueur, sinon EOF).
  const oldBlockRe = /\/\* WP-EDITOR-OVERRIDES v\d+ \*\/[\s\S]*?(?=\/\* WP-EDITOR|$)/g;
  const stripped = content.replace(oldBlockRe, "").trimEnd();
  return stripped + "\n\n" + OVERRIDES_BLOCK + "\n";
}

/**
 * Bloc CSS contenant les overrides per-element (couleur d'un texte/titre précis,
 * fond d'une section précise). Géré comme un dictionnaire (selector → declarations).
 * Le bloc entier est ré-écrit à chaque save : pas de duplication, pas d'accumulation.
 */
const PER_EL_MARKER_START = "/* WP-EDITOR-PER-ELEMENT-START */";
const PER_EL_MARKER_END = "/* WP-EDITOR-PER-ELEMENT-END */";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const PER_EL_BLOCK_RE_GLOBAL = new RegExp(
  escapeRegex(PER_EL_MARKER_START) + "[\\s\\S]*?" + escapeRegex(PER_EL_MARKER_END),
  "g",
);

function readPerElementMap(cssContent: string): Map<string, Map<string, string>> {
  // Map<selector, Map<cssProp, value>>
  // Lit TOUS les blocs (au cas où il y en aurait plusieurs suite à un ancien bug),
  // les fusionne en une seule map. Le rewriter ensuite n'écrira qu'un seul bloc.
  const map = new Map<string, Map<string, string>>();
  // Itère sur tous les blocs (matchAll inutilisé pour rester compatible avec
  // la cible TS courante : on reset lastIndex et on boucle avec exec).
  PER_EL_BLOCK_RE_GLOBAL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PER_EL_BLOCK_RE_GLOBAL.exec(cssContent)) !== null) {
    parseRules(m[0].replace(PER_EL_MARKER_START, "").replace(PER_EL_MARKER_END, ""), map);
  }
  return map;
}

function parseRules(block: string, map: Map<string, Map<string, string>>) {
  const ruleRegex = /([^{}\n]+)\s*\{\s*([^{}]+)\s*\}/g;
  let match;
  while ((match = ruleRegex.exec(block)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2];
    const decls = new Map<string, string>();
    declarations.split(";").forEach((d) => {
      const i = d.indexOf(":");
      if (i < 0) return;
      const k = d.slice(0, i).trim();
      const v = d.slice(i + 1).replace(/!important/, "").trim();
      if (k && v) decls.set(k, v);
    });
    if (decls.size) map.set(selector, decls);
  }
  return map;
}

function writePerElementBlock(cssContent: string, map: Map<string, Map<string, string>>): string {
  const lines: string[] = [PER_EL_MARKER_START];
  map.forEach((decls, selector) => {
    const parts: string[] = [];
    decls.forEach((v, k) => parts.push(`${k}: ${v} !important;`));
    lines.push(`${selector} { ${parts.join(" ")} }`);
  });
  lines.push(PER_EL_MARKER_END);
  const newBlock = lines.join("\n");
  // Strip TOUS les blocs existants (peut y en avoir plusieurs suite à un ancien
  // bug où la regex de remplacement n'échappait pas le `*`), puis insère un
  // seul nouveau bloc à la fin.
  const stripped = cssContent.replace(PER_EL_BLOCK_RE_GLOBAL, "").trimEnd();
  return stripped + "\n\n" + newBlock + "\n";
}

/**
 * Map des hyperliens overridés : `"<section>.<field>" → URL`. Persistée
 * directement dans index.html via un <script data-wp-links> qui sert aussi
 * d'applier runtime (appliqué en mode édition ET en production).
 */
const LINKS_MARKER_START = "<!-- WP-LINKS-START -->";
const LINKS_MARKER_END = "<!-- WP-LINKS-END -->";

function readLinksMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const m = html.match(new RegExp(LINKS_MARKER_START + "([\\s\\S]*?)" + LINKS_MARKER_END));
  if (!m) return map;
  const jsonMatch = m[1].match(/window\.__wp_links\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!jsonMatch) return map;
  try {
    const obj = JSON.parse(jsonMatch[1]) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") map.set(k, v);
    }
  } catch {
    /* ignore */
  }
  return map;
}

/**
 * Réécrit le bloc WP-LINKS dans index.html. Si absent, l'insère juste avant
 * </body>. Inclut un petit applier qui wrap au runtime (MutationObserver).
 */
function writeLinksMap(html: string, map: Map<string, string>): string {
  const obj: Record<string, string> = {};
  map.forEach((v, k) => { obj[k] = v; });
  const block = `${LINKS_MARKER_START}
<script data-wp-links>
window.__wp_links = ${JSON.stringify(obj)};
(function(){
  function isExternal(url) { return /^(https?:)?\\/\\//i.test(url); }
  function setTarget(a, url) {
    if (isExternal(url)) a.setAttribute('target', '_blank');
    else a.removeAttribute('target');
  }
  function apply() {
    var links = window.__wp_links || {};
    Object.keys(links).forEach(function(key){
      var dot = key.indexOf('.');
      var section = key.slice(0, dot);
      var field = key.slice(dot + 1);
      var url = links[key];
      var sel = field === '*'
        ? '[data-edit-section="' + section + '"]'
        : '[data-edit-section="' + section + '"] [data-edit-field="' + field + '"]';
      document.querySelectorAll(sel).forEach(function(el){
        var a = el.closest && el.closest('a');
        if (a) { a.setAttribute('href', url); setTarget(a, url); return; }
        if (el.tagName === 'A') { el.setAttribute('href', url); setTarget(el, url); return; }
        var w = document.createElement('a');
        w.setAttribute('href', url);
        setTarget(w, url);
        w.setAttribute('data-wp-link-wrapper', '1');
        el.parentNode.insertBefore(w, el);
        w.appendChild(el);
      });
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(apply, 100);
  } else {
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 100); });
  }
  new MutationObserver(function(){ apply(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
${LINKS_MARKER_END}`;
  const re = new RegExp(LINKS_MARKER_START + "[\\s\\S]*?" + LINKS_MARKER_END);
  if (re.test(html)) return html.replace(re, block);
  return html.replace("</body>", "  " + block + "\n  </body>");
}

/**
 * Bloc <script data-wp-mutations> dans index.html : stocke la liste des
 * mutations structurelles (suppressions, duplications, insertions de sections)
 * et les rejoue après hydration React.
 */
const MUT_MARKER_START = "<!-- WP-MUTATIONS-START -->";
const MUT_MARKER_END = "<!-- WP-MUTATIONS-END -->";

type Mutation =
  | { op: "remove-section"; section: string }
  | { op: "remove-item"; section: string; itemPrefix: string; itemIndex: number }
  | { op: "duplicate-item"; section: string; itemPrefix: string; itemIndex: number }
  | { op: "add-section"; afterSection: string; sectionType: string; html: string }
  | { op: "remove-element"; section: string; field: string }
  | { op: "add-element"; section: string; afterField: string; elementType: string; html: string }
  | { op: "image-overlay"; section: string; field: string; value: string }
  | { op: "form-input-placeholder"; section: string; inputName: string; value: string }
  | { op: "add-form-field"; section: string; afterInputName: string; fieldType: string; html: string }
  | { op: "text-content"; section: string; field: string; value: string }
  | { op: "set-form-html"; section: string; formIndex: number; html: string };

function readMutationsList(html: string): Mutation[] {
  const m = html.match(new RegExp(MUT_MARKER_START + "([\\s\\S]*?)" + MUT_MARKER_END));
  if (!m) return [];
  const jsonMatch = m[1].match(/window\.__wp_mutations\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!jsonMatch) return [];
  try {
    const arr = JSON.parse(jsonMatch[1]);
    return Array.isArray(arr) ? (arr as Mutation[]) : [];
  } catch {
    return [];
  }
}

function writeMutationsList(html: string, mutations: Mutation[]): string {
  const block = `${MUT_MARKER_START}
<script data-wp-mutations>
window.__wp_mutations = ${JSON.stringify(mutations)};
(function(){
  function apply() {
    var muts = window.__wp_mutations || [];
    muts.forEach(function(m){
      try {
        if (m.op === 'remove-section') {
          var s = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (s) s.remove();
        } else if (m.op === 'remove-item') {
          var sec = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!sec) return;
          var f = sec.querySelector('[data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."]');
          if (!f) return;
          var box = f;
          while (box.parentElement && box.parentElement !== sec) {
            var p = box.parentElement;
            var others = p.querySelectorAll('[data-edit-field^="' + m.itemPrefix + '."]:not([data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."])');
            if (others.length === 0 && p.querySelectorAll('[data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."]').length > 0) {
              box = p;
            } else break;
          }
          box.remove();
        } else if (m.op === 'duplicate-item') {
          var sec2 = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!sec2) return;
          var f2 = sec2.querySelector('[data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."]');
          if (!f2) return;
          var box2 = f2;
          while (box2.parentElement && box2.parentElement !== sec2) {
            var p2 = box2.parentElement;
            var others2 = p2.querySelectorAll('[data-edit-field^="' + m.itemPrefix + '."]:not([data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."])');
            if (others2.length === 0 && p2.querySelectorAll('[data-edit-field^="' + m.itemPrefix + '.' + m.itemIndex + '."]').length > 0) {
              box2 = p2;
            } else break;
          }
          var clone = box2.cloneNode(true);
          var newIdx = 0;
          sec2.querySelectorAll('[data-edit-field^="' + m.itemPrefix + '."]').forEach(function(el){
            var mm = el.getAttribute('data-edit-field').match(/^[^.]+\\.(\\d+)\\./);
            if (mm) { var n = parseInt(mm[1]); if (n >= newIdx) newIdx = n + 1; }
          });
          clone.querySelectorAll('[data-edit-field]').forEach(function(el){
            var v = el.getAttribute('data-edit-field');
            el.setAttribute('data-edit-field', v.replace(/^([^.]+)\\.\\d+\\./, '$1.' + newIdx + '.'));
            el.removeAttribute('data-edit-attached');
            el.removeAttribute('data-edit-key');
            el.removeAttribute('data-edit-original');
          });
          box2.parentNode.insertBefore(clone, box2.nextSibling);
        } else if (m.op === 'add-section') {
          var after = document.querySelector('[data-edit-section="' + m.afterSection + '"]');
          var wrap = document.createElement('div');
          wrap.innerHTML = m.html;
          var newSec = wrap.firstElementChild;
          if (after && newSec) after.parentNode.insertBefore(newSec, after.nextSibling);
          else if (newSec) { var main = document.querySelector('main') || document.body; main.appendChild(newSec); }
        } else if (m.op === 'remove-element') {
          var sece = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!sece) return;
          var fe = sece.querySelector('[data-edit-field="' + m.field + '"]');
          if (fe) {
            // Cas option de select/radio : field se termine par _opt<N>
            var fOpt = String(m.field || '');
            var fOptIdx = fOpt.lastIndexOf('_opt');
            var isOpt = fOptIdx >= 0 && /^\d+$/.test(fOpt.slice(fOptIdx + 4));
            if (isOpt) {
              if (fe.tagName === 'OPTION') { fe.remove(); }
              else {
                var lbl = fe.closest('label');
                if (lbl) lbl.remove();
                else fe.remove();
              }
              return;
            }
            // Si le field est à l'intérieur d'un bouton (<a>/<button> avec
            // bg-/border-), on retire le bouton entier, pas juste le texte.
            var interact = fe.closest('a, button');
            var visual = fe;
            if (interact && interact !== fe && interact.contains(fe)) {
              var iClasses = String(interact.className || '').split(' ');
              var iLike = interact.tagName === 'BUTTON' || iClasses.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; });
              if (iLike) visual = interact;
            }
            visual.remove();
          }
        } else if (m.op === 'add-element') {
          var seca = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!seca) return;
          var fa = seca.querySelector('[data-edit-field="' + m.afterField + '"]');
          if (!fa || !fa.parentNode) return;
          var anchor = fa;
          // Cas option de select/radio : on insère après le container
          // (label pour radio, option pour select), pas après le texte span.
          var aOpt = String(m.afterField || '');
          var aOptIdx = aOpt.lastIndexOf('_opt');
          var isOptA = aOptIdx >= 0 && /^\d+$/.test(aOpt.slice(aOptIdx + 4));
          if (isOptA) {
            if (fa.tagName === 'OPTION') anchor = fa;
            else {
              var lblA = fa.closest('label');
              if (lblA) anchor = lblA;
            }
          } else {
            // Insère APRÈS le bouton entier si le field est à l'intérieur d'un.
            var interactA = fa.closest('a, button');
            if (interactA && interactA !== fa && interactA.contains(fa)) {
              var aClasses = String(interactA.className || '').split(' ');
              var aLike = interactA.tagName === 'BUTTON' || aClasses.some(function (c) { return c.indexOf('bg-') === 0 || c.indexOf('border-') === 0; });
              if (aLike) anchor = interactA;
            }
          }
          var wrapa = document.createElement('div');
          wrapa.innerHTML = m.html;
          var newEl = wrapa.firstElementChild;
          if (newEl && anchor.parentNode) anchor.parentNode.insertBefore(newEl, anchor.nextSibling);
        } else if (m.op === 'image-overlay') {
          var secov = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!secov) return;
          var img = secov.querySelector('img[data-edit-field="' + m.field + '"]');
          if (!img || !m.value) return;
          var icss = getComputedStyle(img);
          var imgIsAbs = icss.position === 'absolute' || icss.position === 'fixed';
          if (imgIsAbs) {
            // Sibling : ne casse pas le layout absolu existant
            var par = img.parentNode;
            if (!par) return;
            var existing = par.querySelector(':scope > .wp-veil[data-veil-for="' + m.field + '"]');
            if (!existing) {
              existing = document.createElement('span');
              existing.className = 'wp-veil';
              existing.setAttribute('data-veil-for', m.field);
              existing.setAttribute('aria-hidden', 'true');
              existing.style.cssText = 'position:' + icss.position
                + ';top:' + icss.top + ';right:' + icss.right
                + ';bottom:' + icss.bottom + ';left:' + icss.left
                + ';width:' + icss.width + ';height:' + icss.height
                + ';pointer-events:none;';
              img.parentNode.insertBefore(existing, img.nextSibling);
            }
            existing.style.backgroundColor = m.value;
          } else {
            // Wrap pour les img en flow
            var pw = img.parentElement;
            var hasWrap = pw && pw.classList && pw.classList.contains('wp-veil-wrap');
            if (!hasWrap) {
              var nw = document.createElement('span');
              nw.className = 'wp-veil-wrap';
              nw.style.cssText = 'position:relative;display:inline-block;line-height:0;';
              img.parentNode.insertBefore(nw, img);
              nw.appendChild(img);
              pw = nw;
            }
            var veil = pw.querySelector(':scope > .wp-veil');
            if (!veil) {
              veil = document.createElement('span');
              veil.className = 'wp-veil';
              veil.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
              pw.appendChild(veil);
            }
            veil.style.backgroundColor = m.value;
          }
        } else if (m.op === 'form-input-placeholder') {
          var secfp = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!secfp) return;
          var inps = secfp.querySelectorAll('input[name="' + m.inputName + '"], textarea[name="' + m.inputName + '"]');
          inps.forEach(function (inp) { inp.setAttribute('placeholder', m.value); });
        } else if (m.op === 'set-form-html') {
          var secsf = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!secsf) return;
          var forms = secsf.querySelectorAll('form');
          var fidx = m.formIndex || 0;
          if (forms[fidx]) {
            // Préserve les éventuels honeypots/scripts critiques (input hidden)
            forms[fidx].innerHTML = m.html;
          }
        } else if (m.op === 'text-content') {
          var sectc = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!sectc) return;
          var elTc = sectc.querySelector('[data-edit-field="' + m.field + '"]');
          if (elTc) elTc.textContent = m.value;
        } else if (m.op === 'add-form-field') {
          var secff = document.querySelector('[data-edit-section="' + m.section + '"]');
          if (!secff) return;
          var formEl = secff.querySelector('form');
          if (!formEl) return;
          var afterInp = m.afterInputName
            ? formEl.querySelector('input[name="' + m.afterInputName + '"], textarea[name="' + m.afterInputName + '"], select[name="' + m.afterInputName + '"]')
            : null;
          var wrapff = document.createElement('div');
          wrapff.innerHTML = m.html;
          var newField = wrapff.firstElementChild;
          if (!newField) return;
          if (afterInp && afterInp.parentNode) {
            afterInp.parentNode.insertBefore(newField, afterInp.nextSibling);
          } else {
            // Pas d'ancre → insère AVANT le wrapper du submit (sinon le
            // bouton est wrappé dans un <div flex> et nos champs deviennent
            // inline avec lui).
            var submit = formEl.querySelector('button[type="submit"], input[type="submit"]');
            var anchorSub = submit;
            while (anchorSub && anchorSub.parentNode !== formEl) anchorSub = anchorSub.parentNode;
            if (anchorSub) anchorSub.parentNode.insertBefore(newField, anchorSub);
            else formEl.appendChild(newField);
          }
        }
      } catch(e) { console.warn('[wp-mutations]', e); }
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(apply, 150);
  } else {
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 150); });
  }
})();
</script>
${MUT_MARKER_END}`;
  const re = new RegExp(MUT_MARKER_START + "[\\s\\S]*?" + MUT_MARKER_END);
  if (re.test(html)) return html.replace(re, block);
  return html.replace("</body>", "  " + block + "\n  </body>");
}

/**
 * Applique un edit per-element au map. section/field/prop déterminent le selector :
 * - prop="color" (et autres CSS std) → sur l'élément lui-même
 * - prop="bg" (legacy) + field=* → background-color sur la section
 * - prop="container-X" → CSS X sur le <a>/<button> ancêtre du field
 * - prop="section-X" → CSS X sur la section
 * - prop="containerBg"/"containerBorder" (legacy) → équivalent container-background-color/border-color
 */
function applyElementEdit(
  map: Map<string, Map<string, string>>,
  section: string,
  field: string,
  prop: string,
  value: string,
) {
  const isWhole = !field || field === "*";
  const isContainer = prop === "containerBg" || prop === "containerBorder" || prop.startsWith("container-");
  const isSection = prop.startsWith("section-") || (prop === "bg" && isWhole);
  const isIcon = prop.startsWith("icon-");

  let selector: string;
  if (isContainer) {
    selector = `[data-edit-section="${section}"] a:has([data-edit-field="${field}"]), [data-edit-section="${section}"] button:has([data-edit-field="${field}"])`;
  } else if (isIcon) {
    selector = isWhole
      ? `[data-edit-section="${section}"] svg, [data-edit-section="${section}"] svg *`
      : `[data-edit-section="${section}"] [data-edit-field="${field}"] svg, [data-edit-section="${section}"] [data-edit-field="${field}"] svg *`;
  } else if (isSection) {
    selector = `[data-edit-section="${section}"]`;
  } else if (isWhole) {
    selector = `[data-edit-section="${section}"]`;
  } else {
    selector = `[data-edit-section="${section}"] [data-edit-field="${field}"]`;
  }

  let cssProp = prop;
  if (prop === "bg" || prop === "containerBg") cssProp = "background-color";
  else if (prop === "containerBorder") cssProp = "border-color";
  else if (prop.startsWith("container-")) cssProp = prop.slice("container-".length);
  else if (prop.startsWith("section-")) cssProp = prop.slice("section-".length);
  else if (prop.startsWith("icon-")) cssProp = prop.slice("icon-".length);

  const decls = map.get(selector) ?? new Map<string, string>();
  decls.set(cssProp, value);
  map.set(selector, decls);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Note : auth désactivée ici car appelée depuis /preview/ où le cookie NextAuth
  // (Path=/wanapush) ne traverse pas. Le slug doit pointer vers un site existant
  // sur disque (vérifié juste après) — minimum acceptable pour une session de test.
  void getServerSession; void authOptions;

  const { id: slug } = await params;
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
  }

  const siteDir = path.join(EXTRACTION_ROOT, slug);
  try { await fs.access(siteDir); } catch {
    return NextResponse.json({ error: `Site introuvable: ${slug}` }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }

  const homePath = path.join(siteDir, "src/pages/Home.tsx");
  const cssPath = path.join(siteDir, "src/index.css");

  let homeContent = await fs.readFile(homePath, "utf8");
  let cssContent = await fs.readFile(cssPath, "utf8");
  let homeModified = false;
  let cssModified = false;

  // Charge le dictionnaire d'overrides per-element existant (s'il existe), on le
  // mettra à jour au fil des edits puis on le réécrira en une seule passe.
  const perElMap = readPerElementMap(cssContent);
  let perElModified = false;

  // Charge la map de liens existante (lue depuis index.html, persistée dans le
  // même fichier pour que les overrides survivent au rebuild Vite).
  const indexHtmlPath = path.join(siteDir, "index.html");
  let indexHtmlContent = await fs.readFile(indexHtmlPath, "utf8");
  const linksMap = readLinksMap(indexHtmlContent);
  let linksModified = false;

  // Mutations structurelles (suppressions, duplications, insertions de sections).
  // Persistées dans index.html sous forme d'un script qui les rejoue runtime.
  let mutationsList = readMutationsList(indexHtmlContent);
  let mutationsModified = false;

  for (const edit of parsed.data.edits) {
    if (edit.kind === "mutation" && edit.op) {
      if (edit.op === "remove-section" && edit.section) {
        // Idempotent : s'il y a déjà une mutation pour cette section, on garde
        mutationsList = mutationsList.filter((m) => !(m.op === "remove-section" && m.section === edit.section));
        mutationsList.push({ op: "remove-section", section: edit.section });
        mutationsModified = true;
      } else if (edit.op === "remove-item" && edit.section && edit.itemPrefix && edit.itemIndex != null) {
        mutationsList.push({
          op: "remove-item",
          section: edit.section,
          itemPrefix: edit.itemPrefix,
          itemIndex: edit.itemIndex,
        });
        mutationsModified = true;
      } else if (edit.op === "duplicate-item" && edit.section && edit.itemPrefix && edit.itemIndex != null) {
        mutationsList.push({
          op: "duplicate-item",
          section: edit.section,
          itemPrefix: edit.itemPrefix,
          itemIndex: edit.itemIndex,
        });
        mutationsModified = true;
      } else if (edit.op === "add-section" && edit.afterSection && edit.sectionType && edit.value) {
        // value contient le HTML de la section à insérer (préparé côté éditeur
        // à partir d'un template prédéfini, avec un data-edit-section unique).
        mutationsList.push({
          op: "add-section",
          afterSection: edit.afterSection,
          sectionType: edit.sectionType,
          html: edit.value,
        });
        mutationsModified = true;
      } else if (edit.op === "remove-element" && edit.section && edit.field) {
        mutationsList.push({ op: "remove-element", section: edit.section, field: edit.field });
        mutationsModified = true;
      } else if (edit.op === "add-element" && edit.section && edit.afterField && edit.elementType && edit.value) {
        mutationsList.push({
          op: "add-element",
          section: edit.section,
          afterField: edit.afterField,
          elementType: edit.elementType,
          html: edit.value,
        });
        mutationsModified = true;
      } else if (edit.op === "image-overlay" && edit.section && edit.field != null) {
        // Dédupe : on garde la dernière valeur d'overlay par section+field
        mutationsList = mutationsList.filter(
          (m) => !(m.op === "image-overlay" && m.section === edit.section && m.field === edit.field),
        );
        if (edit.value) {
          mutationsList.push({
            op: "image-overlay",
            section: edit.section,
            field: edit.field,
            value: edit.value,
          });
        }
        mutationsModified = true;
      } else if (edit.op === "form-input-placeholder" && edit.section && edit.inputName != null) {
        // Dédupe : on garde le dernier placeholder par section + nom d'input
        mutationsList = mutationsList.filter(
          (m) => !(m.op === "form-input-placeholder" && m.section === edit.section && m.inputName === edit.inputName),
        );
        mutationsList.push({
          op: "form-input-placeholder",
          section: edit.section,
          inputName: edit.inputName,
          value: edit.value ?? "",
        });
        mutationsModified = true;
      } else if (edit.op === "add-form-field" && edit.section && edit.fieldType && edit.value) {
        mutationsList.push({
          op: "add-form-field",
          section: edit.section,
          afterInputName: edit.afterInputName ?? "",
          fieldType: edit.fieldType,
          html: edit.value,
        });
        mutationsModified = true;
      } else if (edit.op === "text-content" && edit.section && edit.field) {
        mutationsList = mutationsList.filter(
          (m) => !(m.op === "text-content" && m.section === edit.section && m.field === edit.field),
        );
        mutationsList.push({
          op: "text-content",
          section: edit.section,
          field: edit.field,
          value: edit.value ?? "",
        });
        mutationsModified = true;
      } else if (edit.op === "set-form-html" && edit.section && edit.value != null) {
        const fIdx = edit.formIndex ?? 0;
        mutationsList = mutationsList.filter(
          (m) => !(m.op === "set-form-html" && m.section === edit.section && m.formIndex === fIdx),
        );
        mutationsList.push({
          op: "set-form-html",
          section: edit.section,
          formIndex: fIdx,
          html: edit.value,
        });
        mutationsModified = true;
      }
      continue;
    }
    // Tous les autres kinds (theme/section/element) requièrent field + value
    if (edit.field == null || edit.value == null) continue;
    if (edit.kind === "theme") {
      const varName = THEME_VAR_MAP[edit.field];
      if (varName) {
        // Pour les vars editor-only (heading/text/bg), s'assure que les overrides
        // sont présents dans le CSS avant d'écrire la valeur.
        if (edit.field !== "primaryColor" && edit.field !== "secondaryColor") {
          cssContent = ensureOverridesBlock(cssContent);
        }
        cssContent = patchCssColor(cssContent, varName, edit.value);
        cssModified = true;
      }
    } else if (edit.kind === "section" && edit.section) {
      const next = patchJsxProp(homeContent, edit.section, edit.field, edit.value);
      if (next !== homeContent) {
        homeContent = next;
        homeModified = true;
      }
    } else if (edit.kind === "element" && edit.section && edit.prop) {
      if (edit.prop === "href") {
        const key = edit.section + "." + (edit.field || "*");
        if (edit.value) linksMap.set(key, edit.value);
        else linksMap.delete(key);
        linksModified = true;
      } else {
        applyElementEdit(perElMap, edit.section, edit.field, edit.prop, edit.value);
        perElModified = true;
      }
    }
  }

  if (perElModified) {
    cssContent = writePerElementBlock(cssContent, perElMap);
    cssModified = true;
  }

  if (linksModified || mutationsModified) {
    if (linksModified) indexHtmlContent = writeLinksMap(indexHtmlContent, linksMap);
    if (mutationsModified) indexHtmlContent = writeMutationsList(indexHtmlContent, mutationsList);
    await fs.writeFile(indexHtmlPath, indexHtmlContent, "utf8");
  }

  if (homeModified) await fs.writeFile(homePath, homeContent, "utf8");
  if (cssModified) await fs.writeFile(cssPath, cssContent, "utf8");

  if (!homeModified && !cssModified && !linksModified && !mutationsModified) {
    return NextResponse.json({ ok: true, message: "Aucun changement appliqué" });
  }

  // Trigger rebuild Vite (blocking — l'utilisateur attend le refresh)
  const t0 = Date.now();
  const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const child = spawn("npm", ["run", "build"], { cwd: siteDir, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: stderr.slice(-400) });
    });
    child.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
  const rebuildMs = Date.now() - t0;

  if (!result.ok) {
    return NextResponse.json({ error: `Build échoué : ${result.error}`, rebuildMs }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    rebuildMs,
    applied: parsed.data.edits.length,
    homeModified,
    cssModified,
  });
}
