// Rendu HTML statique des sites générés (version "html" framework).
// Utilisé pour le framework "html" classique (le React passe par lib/react-template.ts).

import type { Brief, GeneratedPage, GenerationPlan } from "./schema";
import type { PageImageMap } from "@/lib/page-images";

// Exports principaux
export { renderHtml, renderSection };

function renderHtml(page: GeneratedPage, plan: GenerationPlan, brief: Brief, allPages: GeneratedPage[], imageMap: PageImageMap = {}): string {
  const escAttr = (s: string) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escHtml = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const allSchemas = [plan.organizationSchema, ...page.schemaJsonld].filter(Boolean);
  const schemaScripts = allSchemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join("\n  ");

  // Logo : si fourni, affiché dans header & footer
  const logoImg = brief.logoUrl
    ? `<img src="${escAttr(brief.logoUrl)}" alt="${escAttr(brief.brandName)}" class="wp-logo">`
    : "";

  const nav = allPages.length > 1
    ? `<nav class="wp-nav">
  <a href="./" class="wp-brand">${logoImg}<span>${escHtml(brief.brandName)}</span></a>
  <ul>
    ${allPages.map((p) => `<li><a href="${p.path === "index.html" ? "./" : p.path}" ${p.path === page.path ? 'class="wp-active"' : ""}>${escHtml(p.navLabel)}</a></li>`).join("\n    ")}
  </ul>
</nav>`
    : `<nav class="wp-nav wp-nav-single">
  <a href="./" class="wp-brand">${logoImg}<span>${escHtml(brief.brandName)}</span></a>
</nav>`;

  const secondaryColor = plan.styleGuide.secondary || plan.styleGuide.primary;
  const tagline = brief.tagline ? escHtml(brief.tagline) : "";

  const sectionsHtml = page.sections.map((sec) => renderSection(sec.type, sec.data, escHtml, escAttr, page.path, imageMap)).join("\n\n");

  return `<!DOCTYPE html>
<html lang="${brief.lang.split("-")[0]}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(page.title)}</title>
  <meta name="description" content="${escAttr(page.metaDescription)}">
  <meta name="author" content="${escAttr(brief.brandName)}">
  <link rel="canonical" href="https://exemple.com/${page.path === "index.html" ? "" : page.path}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(page.title)}">
  <meta property="og:description" content="${escAttr(page.metaDescription)}">
  <meta property="og:locale" content="${brief.lang.replace("-", "_")}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(page.title)}">
  <meta name="twitter:description" content="${escAttr(page.metaDescription)}">

  <!-- Schema.org JSON-LD -->
  ${schemaScripts}

  ${plan.styleGuide.googleFontsCssImport ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${plan.styleGuide.googleFontsCssImport}">` : ""}

  <!-- Tailwind CSS CDN — utilitaires riches (rounded, shadow, p-, grid…) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Couleurs custom : CSS vars + classes utilitaires en CSS pur (plus fiable
       que la config Tailwind dynamique qui peut subir un FOUC) -->
  <style>
    :root {
      --color-primary: ${plan.styleGuide.primary};
      --color-secondary: ${secondaryColor};
      --color-on-primary: #ffffff;
      --brand-gradient: linear-gradient(135deg, ${plan.styleGuide.primary}, ${secondaryColor});
    }
    .bg-primary{background-color:var(--color-primary)!important}
    .text-primary{color:var(--color-primary)!important}
    .border-primary{border-color:var(--color-primary)!important}
    .hover\\:border-primary:hover{border-color:var(--color-primary)!important}
    .hover\\:text-primary:hover{color:var(--color-primary)!important}
    .group:hover .group-hover\\:text-primary{color:var(--color-primary)!important}
    .bg-secondary{background-color:var(--color-secondary)!important}
    .text-secondary{color:var(--color-secondary)!important}
    .bg-brand-gradient{background-image:var(--brand-gradient)!important}
    .hover\\:border-primary\\/30:hover{border-color:color-mix(in srgb,var(--color-primary) 30%,transparent)!important}
    .font-heading{font-family:'${plan.styleGuide.headingFont || "Inter"}',system-ui,sans-serif!important}
    .font-body{font-family:'${plan.styleGuide.bodyFont || "Inter"}',system-ui,sans-serif!important}
    body{font-family:'${plan.styleGuide.bodyFont || "Inter"}',system-ui,sans-serif}
    h1,h2,h3{font-family:'${plan.styleGuide.headingFont || "Inter"}',system-ui,sans-serif}
  </style>

  <style>
    /* === DESIGN SYSTEM 2026 === */
    :root {
      --primary: ${plan.styleGuide.primary};
      --primary-soft: color-mix(in srgb, ${plan.styleGuide.primary} 12%, white);
      --secondary: ${secondaryColor};
      --gradient: linear-gradient(135deg, ${plan.styleGuide.primary} 0%, ${secondaryColor} 100%);
      --bg: #fafafa;
      --bg-alt: #ffffff;
      --text: #0a0a0a;
      --muted: #525252;
      --border: rgba(0,0,0,.08);
      --shadow-sm: 0 2px 8px rgba(0,0,0,.04);
      --shadow-md: 0 8px 24px rgba(0,0,0,.08);
      --shadow-lg: 0 20px 48px rgba(0,0,0,.12);
      --radius: 16px;
      --radius-pill: 9999px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a; --bg-alt: #141414; --text: #fafafa; --muted: #a3a3a3;
        --border: rgba(255,255,255,.08); --primary-soft: color-mix(in srgb, ${plan.styleGuide.primary} 18%, black);
      }
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
    body{font-family:${plan.styleGuide.bodyFont ? `'${plan.styleGuide.bodyFont}',` : ""}${plan.styleGuide.font},-apple-system,BlinkMacSystemFont,Inter,sans-serif;line-height:1.65;color:var(--text);background:var(--bg);font-feature-settings:"ss01","cv02"}
    h1,h2,h3{font-family:${plan.styleGuide.headingFont ? `'${plan.styleGuide.headingFont}',` : ""}${plan.styleGuide.font},-apple-system,sans-serif}
    .wp-container{max-width:1180px;margin:0 auto;padding:0 1.5rem}
    .wp-container-narrow{max-width:780px}

    /* === NAV === */
    .wp-nav{background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;max-width:1180px;margin:0 auto}
    @media(prefers-color-scheme:dark){.wp-nav{background:rgba(20,20,20,.85)}}
    .wp-brand{display:flex;align-items:center;gap:.6rem;font-weight:700;font-size:1.1rem;color:var(--text);text-decoration:none}
    .wp-logo{height:32px;width:auto;border-radius:6px;display:block}
    .wp-nav ul{display:flex;gap:1.5rem;list-style:none}
    .wp-nav a{color:var(--text);text-decoration:none;font-weight:500;font-size:.95rem;padding:.5rem .25rem;border-bottom:2px solid transparent;transition:all .2s}
    .wp-nav a:hover,.wp-nav .wp-active{border-color:var(--primary);color:var(--primary)}

    /* === TYPOGRAPHY (oversized 2026) === */
    h1,h2,h3{line-height:1.05;font-weight:800;letter-spacing:-.02em;color:var(--text)}
    h1{font-size:clamp(2.5rem,7vw,5.5rem);margin-bottom:1.5rem}
    h2{font-size:clamp(2rem,4.5vw,3.5rem);margin-bottom:1.25rem;letter-spacing:-.03em}
    h3{font-size:clamp(1.25rem,2vw,1.5rem);font-weight:700;line-height:1.3;margin-bottom:.75rem}
    p{color:var(--muted);font-size:1.05rem;line-height:1.7}
    a{color:var(--primary)}

    /* === HERO (60-70vh + gradient + bold typo + image side) === */
    .wp-hero{min-height:70vh;background:var(--gradient);color:#fff;display:flex;align-items:center;padding:5rem 0;position:relative;overflow:hidden}
    .wp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at top,rgba(255,255,255,.15),transparent 60%);pointer-events:none}
    .wp-hero-inner{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center;position:relative;z-index:2}
    .wp-hero.wp-hero-split .wp-hero-inner{grid-template-columns:1.1fr 1fr}
    @media(max-width:900px){.wp-hero.wp-hero-split .wp-hero-inner{grid-template-columns:1fr}}
    .wp-hero-text{text-align:left}
    .wp-hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.15);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.2);color:#fff;padding:.5rem 1rem;border-radius:var(--radius-pill);font-size:.875rem;font-weight:600;margin-bottom:1.5rem}
    .wp-hero-badge::before{content:'✨';font-size:.95rem}
    .wp-hero h1{color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.15)}
    .wp-hero p{color:rgba(255,255,255,.95);font-size:1.35rem;max-width:620px;margin:0 0 2.5rem;font-weight:400;line-height:1.5}
    .wp-hero-ctas{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2.5rem}
    .wp-hero-img{position:relative;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.3);transform:rotate(2deg);transition:transform .4s}
    .wp-hero-img:hover{transform:rotate(0)}
    .wp-hero-img img{width:100%;height:auto;display:block;aspect-ratio:4/3;object-fit:cover}
    .wp-hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;max-width:500px}
    .wp-hero-stat{text-align:left}
    .wp-stat-value{font-size:2rem;font-weight:800;line-height:1;color:#fff;letter-spacing:-.02em}
    .wp-stat-label{font-size:.85rem;color:rgba(255,255,255,.85);margin-top:.25rem;line-height:1.3}

    /* === STATS SECTION === */
    .wp-stats-section{background:var(--bg-alt);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .wp-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem;margin-top:2rem}
    .wp-stat-card{background:var(--bg);padding:2.5rem 2rem;border-radius:var(--radius);text-align:center;border:1px solid var(--border)}
    .wp-stat-value-big{font-size:clamp(2.5rem,5vw,4rem);font-weight:900;background:var(--gradient);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;letter-spacing:-.03em}
    .wp-stat-label-big{font-size:1rem;color:var(--muted);margin-top:.75rem;font-weight:500}

    /* === PROCESS === */
    .wp-process{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;margin-top:3rem;counter-reset:step}
    .wp-step{background:var(--bg-alt);padding:2.5rem 2rem;border-radius:var(--radius);border:1px solid var(--border);position:relative;transition:all .25s}
    .wp-step:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);border-color:var(--primary-soft)}
    .wp-step-number{font-size:3rem;font-weight:900;background:var(--gradient);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;margin-bottom:1rem;letter-spacing:-.05em}

    /* === ABOUT (avec image side) === */
    .wp-about-grid{display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}
    .wp-about-split .wp-about-grid{grid-template-columns:1.2fr 1fr}
    @media(max-width:900px){.wp-about-split .wp-about-grid{grid-template-columns:1fr}}
    .wp-about-text p{margin-bottom:1.25rem}
    .wp-about-img{border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-lg)}
    .wp-about-img img{width:100%;height:auto;display:block;aspect-ratio:4/5;object-fit:cover}

    /* === GALLERY === */
    .wp-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:3rem}
    .wp-gallery-item{aspect-ratio:4/3;border-radius:var(--radius);overflow:hidden;position:relative}
    .wp-gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
    .wp-gallery-item:hover img{transform:scale(1.05)}

    /* === FEATURES (avec image en haut optionnel) === */
    .wp-feature-img{margin:-2.25rem -2.25rem 1.5rem;aspect-ratio:16/9;overflow:hidden;border-radius:var(--radius) var(--radius) 0 0}
    .wp-feature-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
    .wp-feature:hover .wp-feature-img img{transform:scale(1.05)}

    /* === CTA reassurance === */
    .wp-cta-reassurance{margin-top:1rem;font-size:.85rem;opacity:.8}

    /* === FAQ avec details/summary === */
    .wp-faq-item summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:1rem}
    .wp-faq-item summary::-webkit-details-marker{display:none}
    .wp-faq-item summary::after{content:'+';font-size:1.5rem;font-weight:300;color:var(--primary);transition:transform .2s}
    .wp-faq-item[open] summary::after{transform:rotate(45deg)}
    .wp-faq-item summary h3{margin:0}
    .wp-faq-item p{margin-top:1rem;color:var(--muted)}

    /* === BUTTONS (44px+ thumb-friendly) === */
    .wp-btn{display:inline-flex;align-items:center;gap:.5rem;background:#fff;color:var(--primary);padding:1rem 2.25rem;border-radius:var(--radius-pill);text-decoration:none;font-weight:700;font-size:1rem;transition:all .2s;box-shadow:var(--shadow-md);min-height:48px;justify-content:center;border:none;cursor:pointer}
    .wp-btn:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
    .wp-btn-primary{background:var(--primary);color:#fff}
    .wp-btn-secondary{background:var(--secondary);color:#fff}
    .wp-btn-outline{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5);box-shadow:none}
    .wp-btn-outline:hover{border-color:#fff;background:rgba(255,255,255,.1)}

    /* === SECTIONS === */
    .wp-section{padding:6rem 0}
    .wp-section:nth-child(even){background:var(--bg-alt)}
    .wp-section-header{text-align:center;max-width:700px;margin:0 auto 3rem}
    .wp-section-eyebrow{display:inline-block;color:var(--primary);font-weight:700;font-size:.875rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem}
    .wp-section-subtitle{font-size:1.125rem;color:var(--muted);max-width:600px;margin:.5rem auto 0;line-height:1.6}
    .wp-faq-list{display:flex;flex-direction:column;gap:.75rem;margin-top:3rem}
    .wp-faq-item summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;gap:1rem}
    .wp-faq-item summary h3{display:inline;color:var(--text);font-size:1.05rem;font-weight:700}

    /* === FEATURES === */
    .wp-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:3rem}
    .wp-feature{background:var(--bg-alt);padding:2.25rem;border-radius:var(--radius);border:1px solid var(--border);transition:all .25s;position:relative;overflow:hidden}
    .wp-feature::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--gradient);transform:scaleX(0);transform-origin:left;transition:transform .3s}
    .wp-feature:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);border-color:var(--primary-soft)}
    .wp-feature:hover::before{transform:scaleX(1)}
    .wp-feature .wp-emoji{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:var(--primary-soft);border-radius:14px;font-size:1.75rem;margin-bottom:1.25rem}

    /* === CTA SECTION === */
    .wp-cta{background:var(--gradient);color:#fff;text-align:center;padding:5rem 0;position:relative;overflow:hidden}
    .wp-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,255,255,.1),transparent 70%);pointer-events:none}
    .wp-cta h2{color:#fff}
    .wp-cta p{color:rgba(255,255,255,.95);margin-bottom:2rem;max-width:600px;margin-left:auto;margin-right:auto}

    /* === FAQ === */
    .wp-faq-item{background:var(--bg-alt);padding:1.75rem 2rem;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:1rem;transition:all .2s}
    .wp-faq-item:hover{border-color:var(--primary-soft);box-shadow:var(--shadow-sm)}
    .wp-faq-item h3{color:var(--primary);margin-bottom:.5rem}

    /* === CONTACT === */
    .wp-contact-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-top:3rem}
    .wp-contact-grid-with-form{grid-template-columns:1fr;gap:2.5rem}
    @media(min-width:768px){.wp-contact-grid-with-form{grid-template-columns:1fr 1.3fr}}
    .wp-contact-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;align-content:start}
    .wp-contact-info-only{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .wp-contact-card{display:block;background:var(--bg-alt);padding:1.5rem;border-radius:var(--radius);border:1px solid var(--border);text-align:left;transition:all .2s;text-decoration:none;color:inherit}
    .wp-contact-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);border-color:var(--primary-soft)}
    .wp-contact-icon{font-size:1.75rem;margin-bottom:.75rem}
    .wp-contact-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:.4rem}
    .wp-contact-value{font-size:1rem;font-weight:600;color:var(--text);word-break:break-word}

    /* === FORM === */
    .wp-form{background:var(--bg-alt);padding:2rem;border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow-md)}
    @media(min-width:768px){.wp-form{padding:2.5rem}}
    .wp-form-title{font-size:1.5rem;margin-bottom:1.5rem;color:var(--text)}
    .wp-form-fields{display:flex;flex-direction:column;gap:1.1rem}
    .wp-field{display:flex;flex-direction:column;gap:.4rem}
    .wp-field span{font-size:.85rem;font-weight:600;color:var(--text)}
    .wp-field input,.wp-field textarea{padding:.85rem 1rem;border:1.5px solid var(--border);border-radius:calc(var(--radius) * 0.6);background:var(--bg);color:var(--text);font-family:inherit;font-size:1rem;transition:all .15s;width:100%}
    .wp-field input:focus,.wp-field textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 15%,transparent)}
    .wp-field textarea{resize:vertical;min-height:120px;font-family:inherit}
    .wp-form-submit{margin-top:.5rem;padding:1rem 2rem;background:var(--gradient,var(--primary));color:#fff;border:none;border-radius:var(--radius);font-weight:700;font-size:1rem;cursor:pointer;transition:transform .15s,box-shadow .15s}
    .wp-form-submit:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg)}
    .wp-form-note{font-size:.78rem;color:var(--muted);text-align:center;margin-top:.5rem}
    .wp-form-success{padding:2rem;text-align:center;background:color-mix(in srgb,#10b981 10%,transparent);border:1px solid #10b981;border-radius:var(--radius);font-size:1.1rem;font-weight:600;color:#065f46}

    /* === STICKY CTA (mobile-first 2026) === */
    .wp-sticky-cta{position:fixed;bottom:1rem;right:1rem;z-index:40;background:var(--gradient);color:#fff;padding:.85rem 1.5rem;border-radius:var(--radius-pill);text-decoration:none;font-weight:700;box-shadow:var(--shadow-lg);transform:translateY(150%);transition:transform .3s;font-size:.95rem}
    .wp-sticky-cta.visible{transform:translateY(0)}

    /* === FOOTER === */
    .wp-footer{background:#0a0a0a;color:#a3a3a3;padding:3rem 0 2rem;text-align:center;font-size:.9rem;border-top:1px solid rgba(255,255,255,.05)}
    .wp-footer .wp-brand{justify-content:center;color:#fff;margin-bottom:1rem}
    .wp-footer a{color:#fff}

    @media(max-width:600px){
      .wp-nav ul{gap:.75rem;font-size:.9rem}
      .wp-section{padding:4rem 0}
      .wp-hero{padding:4rem 0;min-height:60vh}
    }

    /* === CUSTOM CSS GÉNÉRÉ PAR L'IA selon le designProfile === */
    /* Override le CSS de base pour donner sa personnalité au site */
    ${plan.styleGuide.customCss ?? "/* (pas de customCss — fallback design de base) */"}
  </style>
  <script>
    // Sticky CTA visible après 50vh de scroll
    document.addEventListener('DOMContentLoaded',()=>{
      const cta=document.querySelector('.wp-sticky-cta');
      if(!cta)return;
      window.addEventListener('scroll',()=>{
        cta.classList.toggle('visible',window.scrollY>window.innerHeight*.5);
      },{passive:true});
    });
  </script>
</head>
<body>
${nav}
<main>
${sectionsHtml}
</main>
<a href="#contact" class="wp-sticky-cta">💬 Nous contacter</a>
<footer class="wp-footer">
  <div class="wp-container">
    <div class="wp-brand">${logoImg}<span>${escHtml(brief.brandName)}</span></div>
    ${tagline ? `<p style="margin-bottom:1rem;color:#a3a3a3">${tagline}</p>` : ""}
    © ${new Date().getFullYear()} ${escHtml(brief.brandName)} · Site optimisé SEO par <a href="https://wanapush.com">WanaPush</a>
  </div>
</footer>
</body>
</html>`;
}

/**
 * Construit une URL d'image thématique gratuite (loremflickr.com).
 * source.unsplash.com a été déprécié en 2024. loremflickr est l'alternative
 * stable : photos par tags, gratuite, pas de clé API requise.
 * Pattern : https://loremflickr.com/{w}/{h}/{tags}?lock={seed}
 */
function unsplashUrl(keywords: string, w = 1200, h = 800, seed?: string): string {
  // Tags doivent être en commonwords sans espaces. Remplace espaces par virgules.
  const tags = keywords.trim().toLowerCase().replace(/\s+/g, ",").replace(/[^a-z,]/g, "");
  // lock=N → photo déterministe (même seed = même photo) → évite que les images
  // changent à chaque rechargement
  const lock = seed
    ? `?lock=${Math.abs(hashString(seed)) % 10000}`
    : "";
  return `https://loremflickr.com/${w}/${h}/${tags}${lock}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function renderSection(
  type: string,
  data: Record<string, unknown>,
  escH: (s: string) => string,
  escA: (s: string) => string,
  pagePath: string = "index.html",
  imageMap: PageImageMap = {},
): string {
  // Helper : récupère l'URL préchargée Unsplash, ou tombe sur loremflickr si absent
  const img = (seed: string, fallbackKw: string, w: number, h: number): { url: string; alt: string } => {
    const cached = imageMap[seed];
    if (cached) return cached;
    return { url: unsplashUrl(fallbackKw, w, h, seed), alt: fallbackKw };
  };
  switch (type) {
    case "hero": {
      const d = data as {
        title: string;
        subtitle: string;
        ctaText?: string;
        ctaHref?: string;
        ctaSecondaryText?: string;
        imageKeywords?: string;
        stats?: { value: string; label: string }[];
      };
      const heroPhoto = d.imageKeywords ? img(`hero-${pagePath}`, d.imageKeywords, 1200, 900) : null;
      const heroImg = heroPhoto
        ? `<div class="wp-hero-img">
          <img src="${escA(heroPhoto.url)}" alt="${escA(heroPhoto.alt || d.title)}" loading="eager">
        </div>`
        : "";
      const statsHtml = d.stats && d.stats.length > 0
        ? `<div class="wp-hero-stats">
            ${d.stats.map((s) => `<div class="wp-hero-stat">
              <div class="wp-stat-value">${escH(s.value)}</div>
              <div class="wp-stat-label">${escH(s.label)}</div>
            </div>`).join("")}
          </div>`
        : "";
      return `<section class="wp-hero${heroImg ? " wp-hero-split" : ""}" id="top">
  <div class="wp-container wp-hero-inner">
    <div class="wp-hero-text">
      <span class="wp-hero-badge">${escH(d.subtitle.split(".")[0].slice(0, 60))}</span>
      <h1>${escH(d.title)}</h1>
      <p>${escH(d.subtitle)}</p>
      <div class="wp-hero-ctas">
        ${d.ctaText ? `<a href="${escA(d.ctaHref || "#contact")}" class="wp-btn">${escH(d.ctaText)} →</a>` : ""}
        ${d.ctaSecondaryText ? `<a href="${escA(d.ctaHref || "#contact")}" class="wp-btn wp-btn-outline">${escH(d.ctaSecondaryText)}</a>` : ""}
      </div>
      ${statsHtml}
    </div>
    ${heroImg}
  </div>
</section>`;
    }

    case "features": {
      const d = data as {
        title: string;
        subtitle?: string;
        items: { emoji?: string; title: string; desc: string; imageKeywords?: string }[];
      };
      return `<section class="wp-section wp-features-section" id="services">
  <div class="wp-container">
    <div class="wp-section-header">
      <span class="wp-section-eyebrow">Nos services</span>
      <h2>${escH(d.title)}</h2>
      ${d.subtitle ? `<p class="wp-section-subtitle">${escH(d.subtitle)}</p>` : ""}
    </div>
    <div class="wp-features">
      ${d.items
        .map((it, i) => {
          const featPhoto = it.imageKeywords ? img(`feat-${pagePath}-${i}`, it.imageKeywords, 600, 400) : null;
          return `<div class="wp-feature">
        ${featPhoto ? `<div class="wp-feature-img"><img src="${escA(featPhoto.url)}" alt="${escA(featPhoto.alt || it.title)}" loading="lazy"></div>` : ""}
        <div class="wp-emoji">${it.emoji ?? "✨"}</div>
        <h3>${escH(it.title)}</h3>
        <p>${escH(it.desc)}</p>
      </div>`;
        })
        .join("\n      ")}
    </div>
  </div>
</section>`;
    }

    case "stats": {
      const d = data as { title: string; items: { value: string; label: string }[] };
      return `<section class="wp-section wp-stats-section">
  <div class="wp-container">
    <div class="wp-section-header">
      <h2>${escH(d.title)}</h2>
    </div>
    <div class="wp-stats-grid">
      ${d.items
        .map(
          (it) => `<div class="wp-stat-card">
        <div class="wp-stat-value-big">${escH(it.value)}</div>
        <div class="wp-stat-label-big">${escH(it.label)}</div>
      </div>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;
    }

    case "process": {
      const d = data as {
        title: string;
        subtitle?: string;
        steps: { number: string; title: string; desc: string }[];
      };
      return `<section class="wp-section wp-process-section" id="process">
  <div class="wp-container">
    <div class="wp-section-header">
      <span class="wp-section-eyebrow">Comment ça marche</span>
      <h2>${escH(d.title)}</h2>
      ${d.subtitle ? `<p class="wp-section-subtitle">${escH(d.subtitle)}</p>` : ""}
    </div>
    <div class="wp-process">
      ${d.steps
        .map(
          (s) => `<div class="wp-step">
        <div class="wp-step-number">${escH(s.number)}</div>
        <h3>${escH(s.title)}</h3>
        <p>${escH(s.desc)}</p>
      </div>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;
    }

    case "about": {
      const d = data as { title: string; paragraphs: string[]; imageKeywords?: string };
      const aboutPhoto = d.imageKeywords ? img(`about-${pagePath}`, d.imageKeywords, 800, 1000) : null;
      const aboutImgHtml = aboutPhoto
        ? `<div class="wp-about-img">
          <img src="${escA(aboutPhoto.url)}" alt="${escA(aboutPhoto.alt || d.title)}" loading="lazy">
        </div>`
        : "";
      return `<section class="wp-section wp-about-section${aboutImgHtml ? " wp-about-split" : ""}" id="a-propos">
  <div class="wp-container">
    <div class="wp-about-grid">
      <div class="wp-about-text">
        <span class="wp-section-eyebrow">À propos</span>
        <h2>${escH(d.title)}</h2>
        ${d.paragraphs.map((p) => `<p>${escH(p)}</p>`).join("\n        ")}
      </div>
      ${aboutImgHtml}
    </div>
  </div>
</section>`;
    }

    case "gallery": {
      const d = data as { title: string; imageKeywords: string[] };
      return `<section class="wp-section wp-gallery-section">
  <div class="wp-container">
    <div class="wp-section-header">
      <h2>${escH(d.title)}</h2>
    </div>
    <div class="wp-gallery">
      ${d.imageKeywords
        .map((kw, i) => {
          const galPhoto = img(`gal-${pagePath}-${i}`, kw, 600, 800);
          return `<div class="wp-gallery-item">
        <img src="${escA(galPhoto.url)}" alt="${escA(galPhoto.alt || kw)}" loading="lazy">
      </div>`;
        })
        .join("\n      ")}
    </div>
  </div>
</section>`;
    }

    case "cta": {
      const d = data as {
        title: string;
        subtitle: string;
        buttonText: string;
        buttonHref?: string;
        secondaryText?: string;
      };
      return `<section class="wp-cta">
  <div class="wp-container">
    <h2>${escH(d.title)}</h2>
    <p>${escH(d.subtitle)}</p>
    <a href="${escA(d.buttonHref || "#contact")}" class="wp-btn">${escH(d.buttonText)} →</a>
    ${d.secondaryText ? `<div class="wp-cta-reassurance">${escH(d.secondaryText)}</div>` : ""}
  </div>
</section>`;
    }

    case "faq": {
      const d = data as { title: string; subtitle?: string; items: { q: string; a: string }[] };
      return `<section class="wp-section wp-faq-section" id="faq">
  <div class="wp-container wp-container-narrow">
    <div class="wp-section-header">
      <span class="wp-section-eyebrow">FAQ</span>
      <h2>${escH(d.title)}</h2>
      ${d.subtitle ? `<p class="wp-section-subtitle">${escH(d.subtitle)}</p>` : ""}
    </div>
    <div class="wp-faq-list">
      ${d.items
        .map(
          (it) => `<details class="wp-faq-item">
        <summary><h3>${escH(it.q)}</h3></summary>
        <p>${escH(it.a)}</p>
      </details>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;
    }

    case "contact": {
      const d = data as {
        title: string;
        subtitle?: string;
        email?: string;
        phone?: string;
        address?: string;
        showForm?: boolean;
        formTitle?: string;
        formSubmitText?: string;
        formFields?: {
          name: string;
          label: string;
          type: "text" | "email" | "tel" | "textarea";
          required?: boolean;
        }[];
      };

      const hasForm = d.showForm !== false; // par défaut on inclut un formulaire
      const formFields =
        d.formFields && d.formFields.length > 0
          ? d.formFields
          : [
              { name: "name", label: "Votre nom", type: "text" as const, required: true },
              { name: "email", label: "Votre email", type: "email" as const, required: true },
              { name: "phone", label: "Téléphone", type: "tel" as const, required: false },
              { name: "message", label: "Votre message", type: "textarea" as const, required: true },
            ];

      const infoCards = [
        d.email
          ? `<a href="mailto:${escA(d.email)}" class="wp-contact-card">
        <div class="wp-contact-icon">📧</div>
        <div class="wp-contact-label">Email</div>
        <div class="wp-contact-value">${escH(d.email)}</div>
      </a>`
          : "",
        d.phone
          ? `<a href="tel:${escA(d.phone)}" class="wp-contact-card">
        <div class="wp-contact-icon">📞</div>
        <div class="wp-contact-label">Téléphone</div>
        <div class="wp-contact-value">${escH(d.phone)}</div>
      </a>`
          : "",
        d.address
          ? `<div class="wp-contact-card">
        <div class="wp-contact-icon">📍</div>
        <div class="wp-contact-label">Adresse</div>
        <div class="wp-contact-value">${escH(d.address)}</div>
      </div>`
          : "",
      ]
        .filter(Boolean)
        .join("\n      ");

      const formHtml = hasForm
        ? `<form class="wp-form" onsubmit="event.preventDefault();this.querySelector('.wp-form-success').style.display='block';this.querySelector('.wp-form-fields').style.display='none';">
      ${
        d.formTitle
          ? `<h3 class="wp-form-title">${escH(d.formTitle)}</h3>`
          : ""
      }
      <div class="wp-form-fields">
        ${formFields
          .map((f) => {
            const req = f.required ? "required" : "";
            if (f.type === "textarea") {
              return `<label class="wp-field"><span>${escH(f.label)}${f.required ? " *" : ""}</span><textarea name="${escA(f.name)}" rows="5" ${req}></textarea></label>`;
            }
            return `<label class="wp-field"><span>${escH(f.label)}${f.required ? " *" : ""}</span><input type="${escA(f.type)}" name="${escA(f.name)}" ${req}></label>`;
          })
          .join("\n        ")}
        <button type="submit" class="wp-btn wp-form-submit">${escH(d.formSubmitText ?? "Envoyer")}</button>
        <p class="wp-form-note">En soumettant ce formulaire, vous acceptez d'être recontacté. Vos données ne sont jamais revendues.</p>
      </div>
      <div class="wp-form-success" style="display:none">
        ✅ Merci ! Nous reviendrons vers vous très rapidement.
      </div>
    </form>`
        : "";

      return `<section class="wp-section wp-contact-section" id="contact">
  <div class="wp-container">
    <div class="wp-section-header">
      <h2>${escH(d.title)}</h2>
      ${d.subtitle ? `<p class="wp-section-subtitle">${escH(d.subtitle)}</p>` : ""}
    </div>
    <div class="wp-contact-grid${hasForm ? " wp-contact-grid-with-form" : ""}">
      ${
        hasForm
          ? `<div class="wp-contact-info">${infoCards}</div>${formHtml}`
          : `<div class="wp-contact-info wp-contact-info-only">${infoCards}</div>`
      }
    </div>
  </div>
</section>`;
    }

    default:
      return "";
  }
}

