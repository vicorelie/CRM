#!/usr/bin/env node
// Met à jour le bloc WP-LINKS dans index.html des sites listés (ou tous si aucun
// argument). Préserve les URLs existantes, réécrit l'applier runtime avec la
// dernière logique (anchor → pas de target=_blank).
//
// Usage : node scripts/refresh-wp-links.js [slug1 slug2 ...]

const fs = require("fs");
const path = require("path");

const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

function buildBlock(linksObj) {
  // Applier source (en string brut, regex non échappée correctement)
  return `<!-- WP-LINKS-START -->
<script data-wp-links>
window.__wp_links = ${JSON.stringify(linksObj)};
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
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(apply, 100);
  else window.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 100); });
  new MutationObserver(function(){ apply(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
<!-- WP-LINKS-END -->`;
}

function refreshSite(slug) {
  const p = path.join(EXTRACTION_ROOT, slug, "index.html");
  if (!fs.existsSync(p)) return console.log("SKIP " + slug);
  const html = fs.readFileSync(p, "utf8");
  const re = /<!-- WP-LINKS-START -->[\s\S]*?<!-- WP-LINKS-END -->/;
  if (!re.test(html)) return console.log("NONE " + slug + " (pas de bloc WP-LINKS)");
  const m = html.match(/window\.__wp_links\s*=\s*(\{[\s\S]*?\})\s*;/);
  let obj = {};
  if (m) {
    try {
      obj = JSON.parse(m[1]);
    } catch {
      console.log("WARN " + slug + " (JSON corrompu, vidé)");
    }
  }
  const block = buildBlock(obj);
  fs.writeFileSync(p, html.replace(re, block));
  console.log("OK   " + slug + " (" + Object.keys(obj).length + " liens)");
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  fs.readdirSync(EXTRACTION_ROOT)
    .filter((d) => fs.statSync(path.join(EXTRACTION_ROOT, d)).isDirectory())
    .forEach(refreshSite);
} else {
  slugs.forEach(refreshSite);
}
