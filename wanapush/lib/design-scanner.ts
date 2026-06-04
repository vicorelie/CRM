import * as cheerio from "cheerio";

// Scanner de design : analyse une page existante pour récupérer les classes CSS
// utilisées (H2, H3, p, container) afin que le contenu enrichi s'intègre
// visuellement au design existant (Bootstrap, Tailwind, Elementor, custom, etc.).

export type PageDesign = {
  /** Classes CSS du container parent qui wrappe les H2/p existants */
  containerClass: string;
  /** Classes CSS d'un éventuel <section> wrapper */
  sectionClass: string;
  /** Classes CSS prises sur le 1er H2 du contenu principal */
  h2Class: string;
  /** Classes CSS prises sur le 1er H3 */
  h3Class: string;
  /** Classes CSS prises sur le 1er paragraphe */
  pClass: string;
  /** Classes CSS d'un éventuel article wrapper */
  articleClass: string;
  /** Indique si on a trouvé suffisamment d'éléments pour reprendre le design */
  hasDesignSignals: boolean;
  /** Framework CSS détecté (info uniquement) : "bootstrap" | "tailwind" | "elementor" | "wp-blocks" | "custom" */
  detectedFramework: string;
  /** URLs Google Fonts détectées dans <head> (pour réutiliser les mêmes typographies) */
  googleFontsUrls: string[];
  /** Familles de fonts détectées dans inline styles ou stylesheets */
  fontFamilies: string[];
  /** Hex/rgb des couleurs dominantes (extraites des styles inline + CSS embarqué) */
  dominantColors: string[];
  /** Couleur de fond principale détectée */
  backgroundColor: string | null;
  /** true si page sombre (bg foncé) */
  isDark: boolean;
  /** Border-radius dominant détecté (ex: "8px", "9999px", "0") */
  borderRadius: string | null;
  /** URL d'un logo détecté (pour réutiliser ou s'en inspirer côté brand) */
  logoUrl: string | null;
  /** Titres H2 dans l'ordre (= titres de sections principales) — utile pour reproduire la structure */
  sectionHeadings: string[];
  /** Nombre approximatif de sections détectées (via <section> ou groupements visuels) */
  sectionCount: number;
};

const UA = "Mozilla/5.0 (compatible; WanaPushBot/1.0)";

export async function scanPageDesign(url: string): Promise<PageDesign> {
  const empty: PageDesign = {
    containerClass: "",
    sectionClass: "",
    h2Class: "",
    h3Class: "",
    pClass: "",
    articleClass: "",
    hasDesignSignals: false,
    detectedFramework: "unknown",
    googleFontsUrls: [],
    fontFamilies: [],
    dominantColors: [],
    backgroundColor: null,
    isDark: false,
    borderRadius: null,
    logoUrl: null,
    sectionHeadings: [],
    sectionCount: 0,
  };

  let html: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return empty;
    html = await res.text();
  } catch {
    return empty;
  }

  // Extraction couleurs / fonts AVANT de stripper les <style>, sinon on perd tout
  const inlineStyles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [])
    .map((s) => s.replace(/<\/?style[^>]*>/gi, ""))
    .join("\n");
  const allStyleSources = inlineStyles + "\n" + html;

  const colorRegex = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgb\([^)]+\)|rgba\([^)]+\)/gi;
  const colorCounts = new Map<string, number>();
  const colorMatches = Array.from(allStyleSources.matchAll(colorRegex));
  for (const match of colorMatches) {
    const c = match[0].toLowerCase();
    if (c === "#fff" || c === "#ffffff" || c === "#000" || c === "#000000") continue;
    if (/rgba?\([^)]*0\s*\)/.test(c)) continue;
    colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
  const dominantColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);

  const fontFamiliesRaw = Array.from(
    allStyleSources.matchAll(/font-family\s*:\s*([^;}'"]+)/gi),
  )
    .map((m) => m[1].trim().replace(/['"]/g, ""))
    .filter((f) => f && !f.startsWith("var(") && f.length < 200);
  const fontFamilies = Array.from(new Set(fontFamiliesRaw)).slice(0, 5);

  const radiusMatches = Array.from(
    allStyleSources.matchAll(/border-radius\s*:\s*([^;}]+)/gi),
  )
    .map((m) => m[1].trim().split(/\s+/)[0])
    .filter((r) => r && r !== "0" && r !== "0px");
  const radiusCounts = new Map<string, number>();
  radiusMatches.forEach((r) => radiusCounts.set(r, (radiusCounts.get(r) ?? 0) + 1));
  const borderRadius =
    Array.from(radiusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const $ = cheerio.load(html);

  // Google Fonts URLs (avant strip script/style/noscript)
  const googleFontsRaw = $("link[href*='fonts.googleapis.com']")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .filter(Boolean);
  const googleFontsUrls = Array.from(new Set(googleFontsRaw));

  // Logo : <img> dans le header avec class containing 'logo' OU alt containing 'logo'
  let logoUrl: string | null = null;
  const logoCandidates = $("header img, .logo img, [class*='logo'] img, img[class*='logo']");
  if (logoCandidates.length > 0) {
    const src = logoCandidates.first().attr("src") ?? "";
    if (src) {
      try {
        logoUrl = new URL(src, url).toString();
      } catch {
        logoUrl = null;
      }
    }
  }

  // Background body : depuis attribut style si présent
  const bodyStyle = $("body").attr("style") ?? "";
  let backgroundColor: string | null = null;
  const bodyBgMatch = bodyStyle.match(/background(?:-color)?\s*:\s*([^;]+)/i);
  if (bodyBgMatch) backgroundColor = bodyBgMatch[1].trim();
  // Sinon, on prend la 1ère couleur dominante (heuristique)
  if (!backgroundColor && dominantColors.length > 0) backgroundColor = dominantColors[0];

  const isDark = !!backgroundColor && /^#[0-3]/.test(backgroundColor);

  $("script, style, noscript").remove();

  // 1. Trouve le container principal du contenu
  const main = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");

  // 2. Récupère le 1er H2/H3/P qui A des classes (skip ceux sans class)
  const firstWithClass = (sel: string) =>
    main
      .find(sel)
      .filter((_, el) => {
        const cls = $(el).attr("class");
        return !!cls && cls.trim().length > 0;
      })
      .first();

  const h2 = firstWithClass("h2");
  const h3 = firstWithClass("h3");
  const p = firstWithClass("p");

  const h2Class = (h2.attr("class") ?? "").trim();
  const h3Class = (h3.attr("class") ?? "").trim();
  const pClass = (p.attr("class") ?? "").trim();

  // 3. Trouve le container parent (remonte 5 niveaux max depuis un h2 ou p)
  let containerClass = "";
  let articleClass = "";
  const target = h2.length ? h2 : p.length ? p : null;
  if (target) {
    let parent = target.parent();
    for (let i = 0; i < 5 && parent.length > 0; i++) {
      const cls = (parent.attr("class") ?? "").trim();
      const tag = parent.prop("tagName")?.toLowerCase();
      if (cls && !containerClass) {
        containerClass = cls;
      }
      if (tag === "article" && cls && !articleClass) {
        articleClass = cls;
      }
      if (containerClass && articleClass) break;
      parent = parent.parent();
    }
  }

  // 4. Section wrapper le plus représentatif
  const section = main
    .find("section")
    .filter((_, el) => {
      const cls = $(el).attr("class");
      return !!cls && cls.trim().length > 0;
    })
    .first();
  const sectionClass = (section.attr("class") ?? "").trim();

  // 5. Détection du framework CSS (info seulement)
  const allClasses = [containerClass, sectionClass, h2Class, h3Class, pClass, articleClass].join(" ");
  let detectedFramework = "custom";
  if (/\belementor[\w-]*/.test(allClasses)) detectedFramework = "elementor";
  else if (/\b(wp-block|alignwide|alignfull)\b/.test(allClasses)) detectedFramework = "wp-blocks";
  else if (/\b(container(-fluid)?|row|col-(sm|md|lg|xl)-\d+|btn-(primary|secondary)|navbar)\b/.test(allClasses))
    detectedFramework = "bootstrap";
  else if (
    /\b(text-(xs|sm|base|lg|xl|2xl|3xl)|p-\d+|m-\d+|flex|grid|bg-|text-)/.test(allClasses)
  )
    detectedFramework = "tailwind";
  else if (/\b(divi|et_pb_|et_section)\b/.test(allClasses)) detectedFramework = "divi";

  const hasDesignSignals = !!(h2Class || pClass || sectionClass || containerClass);

  // Extraction des titres de sections (H2) dans l'ordre — pour reproduire la structure
  const sectionHeadings: string[] = [];
  $("h2").each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length > 1 && t.length < 200) sectionHeadings.push(t);
  });
  // Sections détectées : on compte <section>, sinon des heuristiques sur les blocs principaux
  let sectionCount = $("section").length;
  if (sectionCount < 3) sectionCount = Math.max(sectionCount, sectionHeadings.length);

  return {
    containerClass,
    sectionClass,
    h2Class,
    h3Class,
    pClass,
    articleClass,
    hasDesignSignals,
    detectedFramework,
    googleFontsUrls,
    fontFamilies,
    dominantColors,
    backgroundColor,
    isDark,
    borderRadius,
    logoUrl,
    sectionHeadings: sectionHeadings.slice(0, 12),
    sectionCount,
  };
}

/**
 * Réécrit un bloc HTML d'enrichissement en lui appliquant les classes
 * détectées sur la page existante, pour que le design soit cohérent.
 * Préserve les classes existantes du HTML (ajoute, ne remplace pas).
 *
 * Stratégie : applique les classes sur les éléments enfants ET wrappe
 * l'ensemble dans des containers (section + container) avec les classes
 * détectées — ainsi le CSS du thème scopé aux parents (`.pagehead .h2.reveal`)
 * trouve bien son contexte.
 */
export function applyDesignToHtml(html: string, design: PageDesign): string {
  if (!design.hasDesignSignals) return html;

  const $ = cheerio.load(html, null, false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function appendClass(el: any, classToAdd: string) {
    if (!classToAdd) return;
    const existing = el.attr("class") ?? "";
    const merged = `${existing} ${classToAdd}`.trim();
    el.attr("class", merged);
  }

  $("h2").each((_, el) => appendClass($(el), design.h2Class));
  $("h3").each((_, el) => appendClass($(el), design.h3Class));
  $("p").each((_, el) => appendClass($(el), design.pClass));

  // Pour les <section> internes ajoutés par WanaPush, applique le sectionClass
  $("section").each((_, el) => appendClass($(el), design.sectionClass));

  let result = $.html();

  // Wrapper externe : container parent qui contextualise le CSS scopé.
  // Beaucoup de thèmes définissent leurs styles via `.container .h2` ou
  // `.pagehead p` : sans ce wrapper, le CSS ne s'applique pas même si on
  // met les bonnes classes sur les éléments.
  if (design.sectionClass) {
    result = `<section class="${design.sectionClass}">${result}</section>`;
  }
  if (design.containerClass && design.containerClass !== design.sectionClass) {
    result = `<div class="${design.containerClass}">${result}</div>`;
  }
  if (design.articleClass && design.articleClass !== design.sectionClass) {
    result = `<article class="${design.articleClass}">${result}</article>`;
  }

  return result;
}
