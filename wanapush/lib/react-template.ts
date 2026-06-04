// Génère un projet Vite + React + TypeScript + Tailwind buildable.
// Le résultat est un Map<filename, content> qui peut être ZIPé et déployé.

import { searchPhoto, searchPhotos } from "@/lib/unsplash";
import { editorScript } from "@/lib/site-editor";
import {
  shopConfigFile, cartContextFile, useShopProductsFile,
  productCardFile, shopGridFile, shopFeaturedFile, shopCategoriesFile,
  shopBrowseFile,
  cartButtonFile, cartDrawerFile, shopHydratorFile,
  customerContextFile, accountButtonFile, accountModalFile,
  productPageFile, categoryPageFile,
} from "@/lib/shop-react-components";

export type ReactBrief = {
  brandName: string;
  logoUrl?: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  lang: string;
  headingFont?: string;
  bodyFont?: string;
  designProfile?: string;
  customCss?: string;
};

type Section = {
  type: string;
  data: Record<string, unknown>;
};

type Page = {
  path: string; // "index.html", "services.html", etc.
  title: string;
  metaDescription: string;
  h1: string;
  navLabel: string;
  sections: Section[];
  schemaJsonld?: object[];
};

/**
 * Slugifie le path "services.html" → "Services" (nom composant React).
 */
function pageToComponentName(path: string): string {
  const base = path.replace(/\.html$/, "");
  if (base === "index" || base === "") return "Home";
  return base
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

/** Convertit "services.html" → "/services" pour les routes */
function pageToRoute(path: string): string {
  if (path === "index.html") return "/";
  return "/" + path.replace(/\.html$/, "");
}

/**
 * Pré-charge toutes les images Unsplash pour les sections (1 seul batch).
 * Retourne un Map<keywords:dim:seed, url> que les composants utilisent.
 */
async function preloadImages(
  pages: Page[],
): Promise<Record<string, { url: string; alt: string }>> {
  const queries: { keywords: string; width: number; height: number; seed: string }[] = [];

  for (const page of pages) {
    for (const section of page.sections) {
      const d = section.data;
      switch (section.type) {
        case "hero":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 1200, height: 900, seed: `hero-${page.path}` });
          break;
        case "features":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string; title?: string };
              const kw = item.imageKeywords || item.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 600, height: 400, seed: `feat-${page.path}-${i}` });
            }
          }
          break;
        case "highlights":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string; title?: string };
              const kw = item.imageKeywords || item.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 800, height: 500, seed: `hl-${page.path}-${i}` });
            }
          }
          break;
        case "service_tiles":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string; title?: string };
              const kw = item.imageKeywords || item.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 600, height: 800, seed: `tile-${page.path}-${i}` });
            }
          }
          break;
        case "circles":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string; title?: string };
              const kw = item.imageKeywords || item.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 500, height: 500, seed: `circle-${page.path}-${i}` });
            }
          }
          break;
        case "video":
          if (d.posterKeywords)
            queries.push({ keywords: String(d.posterKeywords), width: 1600, height: 900, seed: `video-${page.path}` });
          break;
        case "promo_split":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 800, height: 1000, seed: `promo-${page.path}` });
          break;
        case "hero_split":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 1600, height: 1000, seed: `hsplit-${page.path}` });
          break;
        case "hero_slider":
          if (Array.isArray(d.slides)) {
            for (let i = 0; i < d.slides.length; i++) {
              const slide = d.slides[i] as { imageKeywords?: string; title?: string };
              const kw = slide.imageKeywords || slide.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 1600, height: 1000, seed: `hslide-${page.path}-${i}` });
            }
          }
          break;
        case "hero_blob":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 1600, height: 1000, seed: `hblob-${page.path}` });
          break;
        case "services_grid":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string; title?: string };
              const kw = item.imageKeywords || item.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 600, height: 400, seed: `sg-${page.path}-${i}` });
            }
          }
          break;
        case "features_phone":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 400, height: 800, seed: `phone-${page.path}` });
          break;
        case "actions_grid":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 1600, height: 1000, seed: `actions-${page.path}` });
          break;
        case "about_cards":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 800, height: 1000, seed: `aboutc-${page.path}` });
          break;
        case "feature_split":
          if (Array.isArray(d.blocks)) {
            for (let i = 0; i < d.blocks.length; i++) {
              const bl = d.blocks[i] as { imageKeywords?: string; title?: string; codeSnippet?: string };
              if (bl.codeSnippet) continue;
              const kw = bl.imageKeywords || bl.title;
              if (kw)
                queries.push({ keywords: String(kw), width: 1000, height: 750, seed: `fsplit-${page.path}-${i}` });
            }
          }
          break;
        case "about":
          if (d.imageKeywords)
            queries.push({ keywords: String(d.imageKeywords), width: 800, height: 1000, seed: `about-${page.path}` });
          break;
        case "gallery":
          if (Array.isArray(d.imageKeywords)) {
            d.imageKeywords.forEach((kw, i) =>
              queries.push({ keywords: String(kw), width: 600, height: 800, seed: `gal-${page.path}-${i}` }),
            );
          }
          break;
      }
    }
  }

  // Dédoublonne par seed
  const unique = Array.from(new Map(queries.map((q) => [q.seed, q])).values());
  const photos = await searchPhotos(unique);
  const map: Record<string, { url: string; alt: string }> = {};
  unique.forEach((q, i) => {
    map[q.seed] = { url: photos[i].url, alt: photos[i].alt };
  });
  return map;
}

const ESC_TS = (s: string): string =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

/**
 * Génère un projet Vite + React + TS + Tailwind complet.
 * Retourne un Map<filename, content>.
 */
export async function generateReactProject(
  pages: Page[],
  brief: ReactBrief,
  organizationSchema: object,
  siteSlug?: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const imageMap = await preloadImages(pages);

  // === package.json ===
  files.set(
    "package.json",
    JSON.stringify(
      {
        name: brief.brandName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        private: true,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc -b && vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.3.1",
          "react-dom": "^18.3.1",
          "react-router-dom": "^6.26.2",
          "framer-motion": "^11.3.0",
        },
        devDependencies: {
          "@types/react": "^18.3.12",
          "@types/react-dom": "^18.3.1",
          "@vitejs/plugin-react": "^4.3.3",
          autoprefixer: "^10.4.20",
          postcss: "^8.4.47",
          tailwindcss: "^3.4.14",
          typescript: "^5.6.3",
          vite: "^5.4.10",
        },
      },
      null,
      2,
    ),
  );

  // === Configs ===
  files.set(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: false,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }],
      },
      null,
      2,
    ),
  );

  files.set(
    "tsconfig.node.json",
    JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true,
          strict: true,
        },
        include: ["vite.config.ts"],
      },
      null,
      2,
    ),
  );

  files.set(
    "vite.config.ts",
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  ${siteSlug ? `base: "/preview/${siteSlug}/",` : ""}
});
`,
  );

  files.set(
    "tailwind.config.ts",
    `import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
      },
      fontFamily: {
        heading: ["${brief.headingFont || "Inter"}", "system-ui", "sans-serif"],
        body: ["${brief.bodyFont || "Inter"}", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "var(--brand-gradient)",
      },
    },
  },
  plugins: [],
} satisfies Config;
`,
  );

  files.set(
    "postcss.config.js",
    `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
  );

  // === index.html (entry) ===
  const fontsLink = brief.headingFont || brief.bodyFont
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(brief.headingFont || "Inter").replace(/%20/g, "+")}:wght@400;500;600;700;800;900&family=${encodeURIComponent(brief.bodyFont || "Inter").replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap">`
    : "";

  const homeTitle = pages[0]?.title ?? brief.brandName;
  const homeDesc = pages[0]?.metaDescription ?? "";

  files.set(
    "index.html",
    `<!DOCTYPE html>
<html lang="${brief.lang.split("-")[0] ?? "fr"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${homeTitle}</title>
    <meta name="description" content="${homeDesc.replace(/"/g, "&quot;")}" />
    ${fontsLink}
    <script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
  </head>
  <body class="font-body bg-white text-gray-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    ${siteSlug ? editorScript(siteSlug) : ""}
  </body>
</html>
`,
  );

  // === src/main.tsx ===
  files.set(
    "src/main.tsx",
    `/// <reference types="vite/client" />
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\\/+$/, "")}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`,
  );

  // === src/index.css — CSS variables + thème par designProfile ===
  const profile = brief.designProfile ?? "bold-vibrant";
  const isDark = ["tech-modern", "luxury-elegant"].includes(profile);

  const profileCss: Record<string, string> = {
    "tech-modern": `
  --bg: #060914; --bg-alt: #131a2e; --bg-card: #1f283f; --text: #f1f5f9; --muted: #94a3b8;
  --border: rgba(255,255,255,.1); --shadow-color: rgba(0,0,0,.6);
  --brand-gradient: linear-gradient(135deg, #0d1428 0%, color-mix(in srgb, var(--color-primary) 35%, #060914) 100%);`,
    "luxury-elegant": `
  --bg: #08070a; --bg-alt: #1a171f; --bg-card: #2a2532; --text: #faf7f2; --muted: #a8a29e;
  --border: rgba(255,255,255,.12); --shadow-color: rgba(0,0,0,.7);
  --brand-gradient: linear-gradient(135deg, #18141a 0%, color-mix(in srgb, var(--color-secondary) 25%, #08070a) 100%);`,
    "minimal": `
  --bg: #ffffff; --bg-alt: #f8fafc; --text: #0f172a; --muted: #64748b;
  --border: rgba(0,0,0,.07); --shadow-color: rgba(0,0,0,.06);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
    "wellness-soft": `
  --bg: #fdfaf7; --bg-alt: #f5f0eb; --text: #2d1f14; --muted: #7c6a5e;
  --border: rgba(0,0,0,.06); --shadow-color: rgba(0,0,0,.05);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
    "trust-corporate": `
  --bg: #f8faff; --bg-alt: #eef2ff; --text: #0f172a; --muted: #475569;
  --border: rgba(0,0,0,.08); --shadow-color: rgba(0,0,0,.07);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
    "editorial": `
  --bg: #fffef9; --bg-alt: #f7f5f0; --text: #1a1108; --muted: #6b5f51;
  --border: rgba(0,0,0,.1); --shadow-color: rgba(0,0,0,.05);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
    "playful-startup": `
  --bg: #ffffff; --bg-alt: #fafafa; --text: #111827; --muted: #6b7280;
  --border: rgba(0,0,0,.07); --shadow-color: rgba(0,0,0,.06);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
    "bold-vibrant": `
  --bg: #ffffff; --bg-alt: #f9fafb; --text: #111827; --muted: #6b7280;
  --border: rgba(0,0,0,.08); --shadow-color: rgba(0,0,0,.08);
  --brand-gradient: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);`,
  };

  const themeVars = profileCss[profile] ?? profileCss["bold-vibrant"];

  // Extrait tous les `@import url('...');` du customCss et les hoist en haut du fichier
  // (la spec CSS impose que @import précède toute autre règle, sinon ils sont DROPPÉS
  // silencieusement par le browser — fonts jamais chargées).
  const customCss = brief.customCss ?? "";
  const importRegex = /@import\s+url\([^)]+\)\s*;/gi;
  const hoistedImports = (customCss.match(importRegex) ?? []).join("\n");
  const customCssWithoutImports = customCss.replace(importRegex, "").trim();

  files.set(
    "src/index.css",
    `${hoistedImports ? hoistedImports + "\n\n" : ""}@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${brief.primaryColor};
  --color-secondary: ${brief.secondaryColor};${themeVars}
}

@layer base {
  html { scroll-behavior: smooth; }
  body {
    -webkit-font-smoothing: antialiased;
    background-color: var(--bg, #fff);
    color: var(--text, #111);
  }
  ${isDark ? `
  /* ─── DARK THEME — hiérarchie de fonds pour rythme visuel ─────────── */
  body { background-color: var(--bg); color: var(--text); }

  /* SECTIONS — 2 niveaux pour créer une alternance */
  /* Sections "claires" en light theme = bg-white → niveau moyen */
  section.bg-white,
  section[class*="bg-white\\/"] { background-color: var(--bg-alt) !important; }

  /* Sections "tintées" en light theme = bg-gray-50/100, bg-blue-50 → niveau profond */
  section.bg-gray-50, section[class*="bg-gray-50"],
  section.bg-gray-100, section[class*="bg-gray-100"],
  section.bg-slate-50, section[class*="bg-slate-50"],
  section[class*="bg-blue-50"] { background-color: var(--bg) !important; }

  /* CARTES dans les sections — plus claires pour ressortir du fond */
  section .bg-white, section [class*="bg-white\\/"],
  section .bg-gray-50, section [class*="bg-gray-50"],
  section .bg-gray-100,
  section .bg-blue-50, section [class*="bg-blue-50"] { background-color: var(--bg-card) !important; }

  /* Conteneurs avec rounded = forcément des cartes */
  [class*="rounded-2xl"].bg-white,
  [class*="rounded-3xl"].bg-white,
  [class*="rounded-xl"].bg-white { background-color: var(--bg-card) !important; }

  /* Bordures claires */
  .border-gray-100, .border-gray-200, .border-slate-100, .border-slate-200,
  [class*="divide-gray-100"], [class*="divide-gray-200"] { border-color: var(--border) !important; }

  /* Textes */
  .text-gray-900, .text-slate-900, .text-black { color: var(--text) !important; }
  .text-gray-500, .text-gray-600, .text-gray-700,
  .text-slate-500, .text-slate-600, .text-slate-700 { color: var(--muted) !important; }
  .text-gray-400, .text-slate-400 { color: var(--muted) !important; opacity: 0.8; }

  /* Inputs */
  input::placeholder, textarea::placeholder { color: var(--muted) !important; opacity: 0.6; }
  input[type="text"], input[type="email"], input[type="tel"], textarea {
    background-color: var(--bg-card) !important;
    color: var(--text) !important;
    border-color: var(--border) !important;
  }

  /* Ombres renforcées pour bien décoller les cartes */
  .shadow-sm { box-shadow: 0 2px 12px var(--shadow-color) !important; }
  .shadow, .shadow-md { box-shadow: 0 6px 24px var(--shadow-color) !important; }
  .shadow-lg { box-shadow: 0 12px 36px var(--shadow-color) !important; }
  .shadow-xl, .shadow-2xl { box-shadow: 0 20px 60px var(--shadow-color) !important; }

  /* Décoratifs pastels atténués */
  [class*="bg-yellow-"], [class*="bg-cyan-"], [class*="bg-pink-"] { opacity: 0.35; }

  /* Image placeholders */
  .bg-gray-200, .bg-slate-200 { background-color: var(--bg-card) !important; }

  /* Séparateurs subtils pour renforcer la transition entre sections */
  section + section { border-top: 1px solid var(--border); }

  /* NAV — liens menu lisibles sur fond dark (override le remap text-gray-700 → muted) */
  nav .text-gray-700, nav .text-gray-600, nav .text-gray-500 {
    color: var(--text) !important;
    opacity: 0.75;
  }
  nav a:hover { opacity: 1; }
  /* Lien actif de la nav garde la couleur primary (déjà éclaircie pour dark) */

  /* bg-gray-900/950 conservés (footer, bandeaux noirs voulus) */
` : ""}
}

${customCssWithoutImports ? `
/* ─── PRESET CUSTOM CSS par designProfile (@import hoistés en haut du fichier) ─── */
${customCssWithoutImports}
` : ""}
`,
  );

  // === src/App.tsx (router) ===
  const imports = pages
    .map((p) => `import ${pageToComponentName(p.path)} from "./pages/${pageToComponentName(p.path)}";`)
    .join("\n");
  const routes = pages
    .map((p) => `        <Route path="${pageToRoute(p.path)}" element={<${pageToComponentName(p.path)} />} />`)
    .join("\n");

  files.set(
    "src/App.tsx",
    `import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import { CartProvider } from "./contexts/CartContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import CartButton from "./components/shop/CartButton";
import CartDrawer from "./components/shop/CartDrawer";
import AccountButton from "./components/shop/AccountButton";
import AccountModal from "./components/shop/AccountModal";
import ShopHydrator from "./components/shop/ShopHydrator";
import ProductPage from "./pages/ProductPage";
import CategoryPage from "./pages/CategoryPage";
${imports}

export default function App() {
  return (
    <CustomerProvider>
      <CartProvider>
        <Nav />
        <main>
          <Routes>
${routes}
            <Route path="/produit/:slug" element={<ProductPage />} />
            <Route path="/categorie/:slug" element={<CategoryPage />} />
          </Routes>
        </main>
        <Footer />
        {/* Shop UI globale : bouton flottant + drawer panier + compte client */}
        <CartButton />
        <CartDrawer />
        <AccountButton />
        <AccountModal />
        {/* Hydrate les sections shop insérées dynamiquement via le builder */}
        <ShopHydrator />
      </CartProvider>
    </CustomerProvider>
  );
}
`,
  );

  // === Extract contact info for footer ===
  const allSections = pages.flatMap((p) => p.sections);
  const contactSec = allSections.find((s) => s.type === "contact");
  const footerEmail = ESC_TS(String((contactSec?.data as Record<string, unknown>)?.email ?? ""));
  const footerPhone = ESC_TS(String((contactSec?.data as Record<string, unknown>)?.phone ?? ""));
  const footerAddress = ESC_TS(String((contactSec?.data as Record<string, unknown>)?.address ?? ""));
  const footerPageLinks = pages
    .map((p) => `              <li><a href="${pageToRoute(p.path)}" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">${ESC_TS(p.navLabel)}</a></li>`)
    .join("\n");

  // === src/components/Nav.tsx ===
  const navLinks = pages
    .map(
      (p) =>
        // Pas de text-gray-700 hardcodé : la couleur est HÉRITÉE du wrapper de nav
        // qui s'adapte au scroll (text-white/90 en haut, text-gray-700 quand scrolled)
        `        <NavLink to="${pageToRoute(p.path)}" end={${p.path === "index.html"}} className={({ isActive }) => \`py-2 font-medium border-b-2 transition-colors \${isActive ? "border-primary text-primary" : "border-transparent hover:text-primary"}\`}>${ESC_TS(p.navLabel)}</NavLink>`,
    )
    .join("\n");

  files.set(
    "src/components/Nav.tsx",
    `import { NavLink, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={\`fixed top-0 inset-x-0 z-50 transition-all duration-300 \${scrolled ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200/80" : "bg-transparent"}\`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between py-4">
        <Link to="/" className={\`flex items-center gap-3 font-heading font-bold text-lg transition-colors \${scrolled ? "text-gray-900" : "text-white"}\`}>
          ${brief.logoUrl ? `<img src="${brief.logoUrl}" alt="${ESC_TS(brief.brandName)}" className="h-8 w-auto rounded" />` : ""}
          <span>${ESC_TS(brief.brandName)}</span>
        </Link>
        <div className={\`hidden md:flex gap-6 items-center \${scrolled ? "text-gray-700" : "text-white/90"}\`}>
${navLinks}
        </div>
        <button onClick={() => setOpen(o => !o)} className={\`md:hidden p-2 rounded-lg transition-colors \${scrolled ? "text-gray-700" : "text-white"}\`} aria-label="Menu">
          <span className="block w-6 h-0.5 bg-current mb-1.5 transition-all" style={{transform: open ? "rotate(45deg) translateY(8px)" : "none"}} />
          <span className="block w-6 h-0.5 bg-current mb-1.5 transition-all" style={{opacity: open ? 0 : 1}} />
          <span className="block w-6 h-0.5 bg-current transition-all" style={{transform: open ? "rotate(-45deg) translateY(-8px)" : "none"}} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-3 flex flex-col">
${navLinks.replace(/py-2 font-medium border-b-2 transition-colors/g, "py-4 font-medium border-b transition-colors text-base").replace(/"border-transparent text-gray-700 hover:text-primary"/g, '"border-transparent text-gray-600 hover:text-primary"')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
`,
  );

  // === src/components/Footer.tsx ===
  files.set(
    "src/components/Footer.tsx",
    `import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <footer className="bg-gray-950 text-gray-400">
      {/* Main grid */}
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Colonne 1 — Brand + Social */}
          <div>
            <div className="text-white font-heading font-black text-2xl mb-3">${ESC_TS(brief.brandName)}</div>
            ${brief.tagline ? `<p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-[220px]">${ESC_TS(brief.tagline)}</p>` : "<div className='mb-4' />"}
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">Suivez-nous!</p>
            <div className="flex gap-2">
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-400 transition-colors">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-400 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-400 transition-colors">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>
          {/* Colonne 2 — Nos services */}
          <div>
            <h4 className="text-white text-[11px] font-black uppercase tracking-widest mb-5">Nos services</h4>
            <ul className="space-y-2.5">
              <li><a href="#services" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Nos services</a></li>
              <li><a href="#processus" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Notre processus</a></li>
              <li><a href="#pourquoi" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Pourquoi nous</a></li>
              <li><a href="#faq" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
          {/* Colonne 3 — Liens utiles */}
          <div>
            <h4 className="text-white text-[11px] font-black uppercase tracking-widest mb-5">Liens utiles</h4>
            <ul className="space-y-2.5">
${footerPageLinks}
              <li><a href="#contact" className="text-[11px] text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          {/* Colonne 4 — Contact */}
          <div>
            <h4 className="text-white text-[11px] font-black uppercase tracking-widest mb-5">Contactez-nous!</h4>
            <ul className="space-y-3">
              ${footerPhone ? `<li className="flex items-start gap-3">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-sm text-gray-400">${footerPhone}</span>
              </li>` : ""}
              ${footerEmail ? `<li className="flex items-start gap-3">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-sm text-gray-400">${footerEmail}</span>
              </li>` : ""}
              ${footerAddress ? `<li className="flex items-start gap-3">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-sm text-gray-400">${footerAddress}</span>
              </li>` : ""}
              ${!footerPhone && !footerEmail && !footerAddress ? `<li><a href="#contact" className="inline-flex items-center gap-2 text-sm text-primary hover:text-white transition-colors font-medium">Nous écrire →</a></li>` : ""}
            </ul>
          </div>
        </div>
      </div>
      {/* Newsletter */}
      <div className="border-t border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-wider mb-1">Newsletter</h3>
          <p className="text-gray-500 text-sm mb-6">Recevez régulièrement nos actualités et conseils</p>
          {sent ? (
            <p className="text-primary font-semibold text-sm">✓ Merci, vous êtes inscrit !</p>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!email) return;
              const slug = ((import.meta.env.BASE_URL || "/").replace(/^\\/+|\\/+$/g, "").split("/").pop() || "unknown");
              try {
                await fetch("/wanapush/api/forms/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ siteSlug: slug, type: "newsletter", data: { email } }),
                });
              } catch {}
              setSent(true);
            }} className="flex max-w-lg mx-auto">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail" required
                className="flex-1 bg-white text-gray-900 px-4 py-3 text-sm outline-none min-w-0"
              />
              <button type="submit" className="bg-primary text-white px-5 py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
                S'abonner
              </button>
            </form>
          )}
        </div>
      </div>
      {/* Copyright */}
      <div className="border-t border-white/10 py-5 text-center">
        <p className="text-xs text-gray-600">
          Tous droits réservés. | ${new Date().getFullYear()} | ${ESC_TS(brief.brandName)} © · Site par <a href="https://wanapush.com" className="hover:text-gray-400 transition-colors">WanaPush</a>
        </p>
      </div>
    </footer>
  );
}
`,
  );

  // === src/components/sections/*.tsx ===
  files.set("src/components/sections/Hero.tsx", heroComponent());
  files.set("src/components/sections/PageHeader.tsx", pageHeaderComponent());
  files.set("src/components/sections/Features.tsx", featuresComponent());
  files.set("src/components/sections/Stats.tsx", statsComponent());
  files.set("src/components/sections/Process.tsx", processComponent());
  files.set("src/components/sections/About.tsx", aboutComponent());
  files.set("src/components/sections/Gallery.tsx", galleryComponent());
  files.set("src/components/sections/Cta.tsx", ctaComponent());
  files.set("src/components/sections/Faq.tsx", faqComponent());
  files.set("src/components/sections/Testimonials.tsx", testimonialsComponent());
  files.set("src/components/sections/Pricing.tsx", pricingComponent());
  files.set("src/components/sections/Highlights.tsx", highlightsComponent());
  files.set("src/components/sections/ServiceTiles.tsx", serviceTilesComponent());
  files.set("src/components/sections/Circles.tsx", circlesComponent());
  files.set("src/components/sections/Video.tsx", videoComponent());
  files.set("src/components/sections/PromoSplit.tsx", promoSplitComponent());
  files.set("src/components/sections/HeroSplit.tsx", heroSplitComponent());
  files.set("src/components/sections/HeroSlider.tsx", heroSliderComponent());
  files.set("src/components/sections/HeroBlob.tsx", heroBlobComponent());
  files.set("src/components/sections/ServicesGrid.tsx", servicesGridComponent());
  files.set("src/components/sections/FeaturesPhone.tsx", featuresPhoneComponent());
  files.set("src/components/sections/ProcessVertical.tsx", processVerticalComponent());
  files.set("src/components/sections/ActionsGrid.tsx", actionsGridComponent());
  files.set("src/components/sections/AboutCards.tsx", aboutCardsComponent());
  files.set("src/components/sections/LogosBar.tsx", logosBarComponent());
  files.set("src/components/sections/FeatureSplit.tsx", featureSplitComponent());
  files.set("src/components/sections/Contact.tsx", contactComponent());

  // === Shop / e-commerce ===
  files.set("src/shop-config.ts", shopConfigFile(siteSlug ?? ""));
  files.set("src/contexts/CartContext.tsx", cartContextFile());
  files.set("src/hooks/useShopProducts.ts", useShopProductsFile());
  files.set("src/components/shop/ProductCard.tsx", productCardFile());
  files.set("src/components/shop/ShopGrid.tsx", shopGridFile());
  files.set("src/components/shop/ShopFeatured.tsx", shopFeaturedFile());
  files.set("src/components/shop/ShopCategories.tsx", shopCategoriesFile());
  files.set("src/components/shop/ShopBrowse.tsx", shopBrowseFile());
  files.set("src/components/shop/CartButton.tsx", cartButtonFile());
  files.set("src/components/shop/CartDrawer.tsx", cartDrawerFile());
  files.set("src/components/shop/ShopHydrator.tsx", shopHydratorFile());
  files.set("src/contexts/CustomerContext.tsx", customerContextFile());
  files.set("src/components/shop/AccountButton.tsx", accountButtonFile());
  files.set("src/components/shop/AccountModal.tsx", accountModalFile());
  // Pages techniques shop (routes /produit/:slug et /categorie/:slug)
  files.set("src/pages/ProductPage.tsx", productPageFile());
  files.set("src/pages/CategoryPage.tsx", categoryPageFile());

  // === Sections custom générées par l'IA en JSX libre (vision-driven) ===
  // Pour chaque section ayant `data.customJsx: { code, componentName }`, on écrit
  // le composant dans src/components/sections/Custom<Name>.tsx et on l'expose à la page.
  const customSectionFiles = new Map<string, string>(); // componentName → relative import path
  for (const page of pages) {
    for (const section of page.sections) {
      const customJsx = (section.data as { customJsx?: { code?: string; componentName?: string } }).customJsx;
      if (customJsx?.code && customJsx?.componentName) {
        const filename = `Custom${customJsx.componentName.replace(/^Custom/i, "")}`;
        const filepath = `src/components/sections/${filename}.tsx`;
        if (!files.has(filepath)) {
          files.set(filepath, customJsx.code);
          customSectionFiles.set(filename, filename);
        }
      }
    }
  }
  const customImportsBlock = Array.from(customSectionFiles.keys())
    .map((n) => `import ${n} from "../components/sections/${n}";`)
    .join("\n");

  // === src/pages/*.tsx ===
  for (const page of pages) {
    const compName = pageToComponentName(page.path);
    const sectionsTsx = page.sections
      .map((s) => renderSectionTsx(s, page.path, imageMap, page.navLabel))
      .filter(Boolean)
      .join("\n      ");

    files.set(
      `src/pages/${compName}.tsx`,
      `import { useEffect } from "react";
import Hero from "../components/sections/Hero";
import PageHeader from "../components/sections/PageHeader";
import Features from "../components/sections/Features";
import Stats from "../components/sections/Stats";
import Process from "../components/sections/Process";
import About from "../components/sections/About";
import Gallery from "../components/sections/Gallery";
import Cta from "../components/sections/Cta";
import Faq from "../components/sections/Faq";
import Testimonials from "../components/sections/Testimonials";
import Pricing from "../components/sections/Pricing";
import Highlights from "../components/sections/Highlights";
import ServiceTiles from "../components/sections/ServiceTiles";
import Circles from "../components/sections/Circles";
import Video from "../components/sections/Video";
import PromoSplit from "../components/sections/PromoSplit";
import HeroSplit from "../components/sections/HeroSplit";
import HeroSlider from "../components/sections/HeroSlider";
import HeroBlob from "../components/sections/HeroBlob";
import ServicesGrid from "../components/sections/ServicesGrid";
import FeaturesPhone from "../components/sections/FeaturesPhone";
import ProcessVertical from "../components/sections/ProcessVertical";
import ActionsGrid from "../components/sections/ActionsGrid";
import AboutCards from "../components/sections/AboutCards";
import LogosBar from "../components/sections/LogosBar";
import FeatureSplit from "../components/sections/FeatureSplit";
import ContactSection from "../components/sections/Contact";
import ShopGrid from "../components/shop/ShopGrid";
import ShopFeatured from "../components/shop/ShopFeatured";
import ShopCategories from "../components/shop/ShopCategories";
import ShopBrowse from "../components/shop/ShopBrowse";
${customImportsBlock}

export default function ${compName}() {
  useEffect(() => {
    document.title = \`${ESC_TS(page.title)}\`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", \`${ESC_TS(page.metaDescription)}\`);
  }, []);

  return (
    <>
      ${sectionsTsx}
    </>
  );
}
`,
    );
  }

  // === README.md ===
  files.set(
    "README.md",
    `# ${brief.brandName}

Site web généré par WanaPush en **React + TypeScript + Vite + Tailwind CSS**.

## 🚀 Démarrage

\`\`\`bash
npm install
npm run dev      # Serveur de dev (http://localhost:5173)
npm run build    # Build production → dossier dist/
npm run preview  # Preview du build
\`\`\`

## 📁 Structure

- \`index.html\` — Entry HTML
- \`src/main.tsx\` — Entry React + Router
- \`src/App.tsx\` — Layout + Routes
- \`src/pages/\` — Une page par fichier (Home, Services, About, Contact…)
- \`src/components/\` — Nav, Footer + sections réutilisables
- \`src/components/sections/\` — Composants Hero, Features, Stats, etc.
- \`tailwind.config.ts\` — Couleurs custom + fonts (modifiable)

## 🎨 Couleurs

- Primary : \`${brief.primaryColor}\`
- Secondary : \`${brief.secondaryColor}\`
- Modifiable dans \`tailwind.config.ts\`

## 🚢 Déploiement

Le dossier \`dist/\` après \`npm run build\` est statique et déployable sur :
- Vercel : \`vercel --prod\`
- Netlify : drag-drop le dossier \`dist/\`
- Cloudflare Pages
- GitHub Pages
- N'importe quel hébergement (FTP/SFTP)

⚠️ Pour multi-page : configure les rewrites \`/* → /index.html\` (SPA routing).

## 🤖 Crédits

Site généré par [WanaPush](https://wanapush.com) — plateforme de marketing digital IA.
`,
  );

  // === .gitignore ===
  files.set(
    ".gitignore",
    `node_modules
dist
.DS_Store
*.log
.env
.env.local
`,
  );

  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composants TSX (statiques, partagés entre toutes les générations)
// ─────────────────────────────────────────────────────────────────────────────

function pageHeaderComponent(): string {
  return `import { motion } from "framer-motion";

type Props = { title?: string; subtitle?: string; imageUrl?: string };

export default function PageHeader({ title, subtitle, imageUrl }: Props) {
  return (
    <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 md:pt-44 md:pb-24 overflow-hidden bg-gray-950 min-h-[320px] sm:min-h-[380px] w-full">
      {imageUrl && (
        <>
          {/* Background image via div + backgroundImage (couvre toute la largeur, garanti) */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: \`url('\${imageUrl}')\`,
              backgroundSize: "cover",
              backgroundPosition: "center 35%",
              backgroundRepeat: "no-repeat",
              opacity: 0.45,
            }}
            initial={{ scale: 1.06 }} animate={{ scale: 1 }}
            transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
        </>
      )}

      {/* Bordures décoratives haut/bas */}
      <div className="absolute top-20 sm:top-24 left-4 sm:left-8 right-4 sm:right-8 h-px bg-white/25" />
      <div className="absolute bottom-6 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 h-px bg-white/25" />

      <div className="relative max-w-5xl mx-auto px-6 text-center flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-heading font-black text-white uppercase tracking-[0.05em] leading-[0.95] mb-5">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/85 text-sm sm:text-base md:text-lg font-light italic max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function heroComponent(): string {
  return `import { motion } from "framer-motion";

type Stat = { value: string; label: string };
type Props = {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaHref?: string;
  ctaSecondaryText?: string;
  imageUrl?: string;
  imageAlt?: string;
  stats?: Stat[];
};

export default function Hero({ title, subtitle, ctaText, ctaHref = "#contact", ctaSecondaryText, imageUrl, imageAlt, stats }: Props) {
  if (imageUrl) {
    return (
      <section data-edit-section="Hero" className="relative h-screen min-h-[640px] overflow-hidden flex items-end">
        <motion.img
          data-edit-field="imageUrl"
          src={imageUrl} alt={imageAlt ?? title} loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }} animate={{ scale: 1 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 md:to-transparent pointer-events-none" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-6 pb-10 sm:pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 56 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="max-w-3xl"
          >
            <h1 data-edit-field="title" className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-black leading-tight sm:leading-[0.95] tracking-tight text-white mb-4 sm:mb-6">{title}</h1>
            <p data-edit-field="subtitle" className="text-sm sm:text-lg md:text-xl text-white/75 max-w-2xl leading-relaxed mb-6 sm:mb-8">{subtitle}</p>
            <div className="flex flex-wrap gap-3">
              {ctaText && <a href={ctaHref} className="inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-4 bg-white text-gray-900 rounded-full font-bold shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all text-sm sm:text-base"><span data-edit-field="ctaText">{ctaText}</span> →</a>}
              {ctaSecondaryText && <a href="#services" className="inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-4 border-2 border-white/40 text-white rounded-full font-semibold hover:bg-white/10 active:bg-white/20 transition-all text-sm sm:text-base"><span data-edit-field="ctaSecondaryText">{ctaSecondaryText}</span></a>}
            </div>
            {stats && stats.length > 0 && (
              <div className="flex flex-wrap gap-8 md:gap-12 mt-10 pt-8 border-t border-white/20">
                {stats.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}>
                    <div data-edit-field={\`stats.\${i}.value\`} className="text-2xl md:text-3xl font-black text-white leading-none">{s.value}</div>
                    <div data-edit-field={\`stats.\${i}.label\`} className="text-xs text-white/55 mt-1 uppercase tracking-wider">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40"
          animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </motion.div>
      </section>
    );
  }

  return (
    <section data-edit-section="Hero" className="relative overflow-hidden bg-brand-gradient text-white min-h-[100svh] flex items-center pt-24 pb-16 sm:py-24 md:py-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/3 -right-1/4 w-[700px] h-[700px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-black/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 data-edit-field="title" className="text-4xl sm:text-5xl md:text-7xl font-heading font-black leading-tight tracking-tight text-white mb-5 sm:mb-6">{title}</h1>
          <p data-edit-field="subtitle" className="text-sm sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">{subtitle}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {ctaText && <a href={ctaHref} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-full font-bold shadow-2xl hover:-translate-y-0.5 transition-all"><span data-edit-field="ctaText">{ctaText}</span> →</a>}
            {ctaSecondaryText && <a href={ctaHref} className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/40 text-white rounded-full font-semibold hover:bg-white/10 transition-all"><span data-edit-field="ctaSecondaryText">{ctaSecondaryText}</span></a>}
          </div>
          {stats && stats.length > 0 && (
            <div className="flex justify-center flex-wrap gap-8 md:gap-16 mt-12 pt-8 border-t border-white/20">
              {stats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }} className="text-center">
                  <div data-edit-field={\`stats.\${i}.value\`} className="text-3xl md:text-4xl font-black text-white leading-none">{s.value}</div>
                  <div data-edit-field={\`stats.\${i}.label\`} className="text-sm text-white/60 mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function featuresComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { emoji?: string; title?: string; desc?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[]; ctaText?: string; ctaHref?: string };

// Pool d'icônes décoratives (Lucide-style). Cycle sur l'index pour donner
// un peu de variété sans dépendre d'images externes.
const ICONS = [
  "M5 12l5 5L20 6",
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "M22 12h-4l-3 9L9 3l-3 9H2",
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "M12 2v6m0 0v6m0-6h6m-6 0H6",
  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  "M20 13c0 5-3.5 7.5-8 7.5S4 18 4 13c0-5 3.5-7.5 8-7.5S20 8 20 13z",
  "M12 1v6m0 0v6m11-11h-6m-6 0H1",
];

export default function Features({ title, subtitle, items, ctaText = "Tous nos services +", ctaHref = "#contact" }: Props) {
  // Grid 3-cols : on tronque au plus grand multiple de 3 (3, 6, 9) pour
  // garder des rangées complètes. Min 3, max 9.
  const count = Math.max(3, Math.min(9, Math.floor(items.length / 3) * 3));
  const shown = items.slice(0, count);
  return (
    <section data-edit-section="Features" className="py-16 sm:py-20 md:py-28 bg-white" id="services">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <div className="max-w-2xl">
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight mb-4">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-base sm:text-lg text-gray-500 leading-relaxed">{subtitle}</p>}
          </div>
          <a href={ctaHref} className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-full font-semibold text-sm hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/30 whitespace-nowrap">
            <span data-edit-field="ctaText">{ctaText}</span>
          </a>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {shown.map((it, i) => {
            const iconPath = ICONS[i % ICONS.length];
            return (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 cursor-default"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  {it.emoji
                    ? <span className="text-2xl leading-none">{it.emoji}</span>
                    : <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={iconPath} /></svg>
                  }
                </div>
                <h3 data-edit-field={\`items.\${i}.title\`} className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-primary transition-colors duration-200 mb-2">{it.title}</h3>
                {it.desc && <p data-edit-field={\`items.\${i}.desc\`} className="text-gray-500 text-sm leading-relaxed">{it.desc}</p>}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function statsComponent(): string {
  return `import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Item = { value: string; label: string; [k: string]: unknown };
type Props = { title?: string; items: Item[] };

function AnimatedValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const match = value.match(/^(\\D*)(\\d+(?:[.,]\\d+)?)(.*)$/);
    if (!match) { setDisplayed(value); return; }
    const prefix = match[1];
    const targetRaw = match[2].replace(",", ".");
    const target = parseFloat(targetRaw);
    const decimals = targetRaw.includes(".") ? targetRaw.split(".")[1].length : 0;
    const suffix = match[3];
    setDisplayed(\`\${prefix}0\${suffix}\`);

    let frame: number | null = null;
    const duration = 1500;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const node = ref.current;
    if (!node) return;

    const animate = () => {
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const progress = Math.min((now - start) / duration, 1);
        const current = (target * easeOut(progress)).toFixed(decimals);
        setDisplayed(\`\${prefix}\${current}\${suffix}\`);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{displayed}</span>;
}

export default function Stats({ title, items }: Props) {
  const list = items.slice(0, 6);
  return (
    <section data-edit-section="Stats" className="py-14 sm:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {title && (
          <motion.p
            data-edit-field="title"
            className="text-primary text-xs uppercase tracking-widest text-center font-semibold mb-10"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            {title}
          </motion.p>
        )}
        <div className="flex flex-wrap justify-center gap-y-10 gap-x-4">
          {list.map((it, i) => (
            <motion.div
              key={i}
              className="text-center px-6 sm:px-10 flex-1 min-w-[160px] max-w-[280px]"
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div data-edit-field={\`items.\${i}.value\`} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-3 break-words">
                <AnimatedValue value={String(it.value ?? "")} />
              </div>
              <div data-edit-field={\`items.\${i}.label\`} className="text-[11px] sm:text-xs text-primary font-semibold uppercase tracking-widest leading-relaxed">
                {it.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function processComponent(): string {
  return `import { motion } from "framer-motion";

type Step = { number?: string; title?: string; desc?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; steps: Step[]; imageUrl?: string; imageAlt?: string };

export default function Process({ title, subtitle, steps, imageUrl, imageAlt }: Props) {
  return (
    <section data-edit-section="Process" className="py-16 sm:py-24 md:py-32 overflow-hidden" id="processus">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          className="mb-12 sm:mb-16 max-w-2xl"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-[0.25em] mb-4">— Processus</span>
          <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight mb-4 text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p data-edit-field="subtitle" className="text-base sm:text-lg text-gray-500 leading-relaxed">{subtitle}</p>}
        </motion.div>

        <div className={imageUrl ? "grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start" : "max-w-3xl"}>
          {imageUrl && (
            <motion.div
              className="lg:sticky lg:top-24 self-start"
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            >
              <img data-edit-field="imageUrl" src={imageUrl} alt={imageAlt ?? title ?? "process"} loading="lazy"
                className="w-full h-auto aspect-[4/5] object-cover rounded-2xl shadow-xl" />
            </motion.div>
          )}

          <div className="divide-y divide-gray-200/60">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className="grid grid-cols-[60px_1fr] sm:grid-cols-[88px_1fr] gap-4 sm:gap-6 py-6 sm:py-8 group"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-primary/20">
                  {s.number}
                </div>
                <div className="pt-1 sm:pt-2">
                  <h3 data-edit-field={\`steps.\${i}.title\`} className="text-sm sm:text-base font-bold uppercase tracking-[0.15em] text-gray-900 mb-2">{s.title}</h3>
                  <p data-edit-field={\`steps.\${i}.desc\`} className="text-sm sm:text-base text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
`;
}

function aboutComponent(): string {
  return `import { motion } from "framer-motion";

type Props = { title?: string; paragraphs: string[]; imageUrl?: string; imageAlt?: string };

export default function About({ title, paragraphs, imageUrl, imageAlt }: Props) {
  return (
    <section data-edit-section="About" className="py-16 sm:py-20 md:py-28 bg-white" id="a-propos">
      <div className="max-w-6xl mx-auto px-6">
        <div className={\`grid \${imageUrl ? "lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"} gap-12 lg:gap-16 items-center\`}>
          <motion.div className="space-y-5 order-2 lg:order-1"
            initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-sm uppercase tracking-widest">À propos</span>
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight">{title}</h2>
            {paragraphs.map((p, i) => <p key={i} data-edit-field={\`paragraphs.\${i}\`} className="text-lg text-gray-600 leading-relaxed">{p}</p>)}
          </motion.div>
          {imageUrl && (
            <motion.div className="relative order-1 lg:order-2"
              initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              <div className="absolute -inset-6 bg-brand-gradient blur-3xl opacity-15 rounded-full" />
              <img data-edit-field="imageUrl" src={imageUrl} alt={imageAlt ?? title} loading="lazy"
                   className="relative w-full aspect-[4/5] object-cover rounded-3xl shadow-2xl" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
`;
}

function galleryComponent(): string {
  return `import { motion } from "framer-motion";
import { useRef } from "react";

type Image = { url: string; alt: string };
type Props = { title?: string; images: Image[] };

export default function Gallery({ title, images }: Props) {
  if (!images || images.length === 0) return null;
  const scrollRef = useRef<HTMLDivElement>(null);
  // Layout figé : grille 3×3 = 9 images. Si l'IA en fournit moins, on duplique
  // la dernière pour combler (le harmonize côté serveur pad normalement à 9).
  const padded: Image[] = images.slice(0, 9);
  while (padded.length < 9 && images.length > 0) padded.push(images[images.length - 1]);
  const shown = padded;
  return (
    <section data-edit-section="Gallery" className="py-16 sm:py-24 bg-gray-950 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 mb-10 sm:mb-14">
        <motion.div
          className="flex items-end justify-between"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white">{title}</h2>
          <span className="text-gray-500 text-sm hidden sm:block">Faites défiler →</span>
        </motion.div>
      </div>
      <div
        ref={scrollRef}
        className="flex md:hidden gap-3 overflow-x-auto pb-4 px-5 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {shown.map((im, i) => (
          <motion.div key={i}
            className="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden snap-start relative group"
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <img data-edit-field={\`images.\${i}.url\`} src={im.url} alt={im.alt} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <p className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium line-clamp-2">{im.alt}</p>
          </motion.div>
        ))}
      </div>
      <div className="hidden md:block max-w-6xl mx-auto px-6">
        <motion.div
          className="grid grid-cols-3 gap-3"
          style={{ gridTemplateRows: "repeat(3, 220px)" }}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {shown.map((im, i) => (
            <motion.div key={i}
              variants={{ hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6 } } }}
              className="group relative overflow-hidden rounded-2xl cursor-pointer"
              whileHover={{ scale: 1.01 }} transition={{ duration: 0.3 }}
            >
              <img data-edit-field={\`images.\${i}.url\`} src={im.url} alt={im.alt} loading="lazy"
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <p className="absolute bottom-4 left-4 right-4 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">{im.alt}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function ctaComponent(): string {
  return `import { motion } from "framer-motion";

type Props = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref?: string;
  secondaryText?: string;
};

export default function Cta({ title, subtitle, buttonText, buttonHref = "#contact", secondaryText }: Props) {
  return (
    <section data-edit-section="Cta" className="relative py-16 sm:py-24 md:py-32 bg-brand-gradient overflow-hidden text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-black/10 blur-3xl" />
      </div>
      <motion.div
        className="relative max-w-4xl mx-auto px-6 text-center space-y-6"
        initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-6xl font-heading font-black tracking-tight">{title}</h2>
        <p data-edit-field="subtitle" className="text-base sm:text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        <div className="pt-4">
          <motion.a
            href={buttonHref}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-full font-bold shadow-2xl transition-all text-sm sm:text-base active:scale-95 touch-manipulation"
          >
            <span data-edit-field="buttonText">{buttonText}</span> →
          </motion.a>
        </div>
        {secondaryText && <div className="text-sm text-white/70"><span data-edit-field="secondaryText">{secondaryText}</span></div>}
      </motion.div>
    </section>
  );
}
`;
}

function faqComponent(): string {
  return `import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Item = { q: string; a: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[]; imageUrl?: string; contactHref?: string; contactText?: string };

function FaqItem({ q, a, index }: Item & { index: number }) {
  const [open, setOpen] = useState(index === 0);
  const num = String(index + 1).padStart(2, "0");
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.04 }}
      className={\`border rounded-xl overflow-hidden transition-all \${open ? "border-primary/30 bg-white shadow-sm" : "border-gray-200 bg-white"}\`}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left touch-manipulation"
      >
        <span className="text-xs font-black text-primary shrink-0 w-6">{num}.</span>
        <h3 data-edit-field={\`items.\${index}.q\`} className="text-sm sm:text-base font-bold text-gray-900 leading-snug flex-1">{q}</h3>
        <div className={\`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors \${open ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}\`}>
          <svg className={\`w-3.5 h-3.5 transition-transform duration-200 \${open ? "rotate-180" : ""}\`} fill="none" viewBox="0 0 14 14"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[2.75rem] pr-4 sm:pr-5 pb-4 border-l-2 border-primary ml-4">
              <p data-edit-field={\`items.\${index}.a\`} className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Faq({ title, subtitle, items, imageUrl, contactHref = "#contact", contactText = "Nous contacter" }: Props) {
  return (
    <section data-edit-section="Faq" className="py-16 sm:py-24 md:py-32 bg-gray-50" id="faq">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-widest mb-3">---- Questions fréquentes</span>
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight mb-4">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 text-base leading-relaxed mb-6">{subtitle}</p>}
            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden mt-4">
                <img src={imageUrl} alt="FAQ" loading="lazy" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-white text-sm font-medium mb-3">Vous avez encore des questions ?</p>
                  <a href={contactHref} className="inline-block bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-widest">
                    {contactText}
                  </a>
                </div>
              </div>
            )}
          </motion.div>
          <div className="space-y-2.5">
            {items.map((it, i) => <FaqItem key={i} {...it} index={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
`;
}

function logosBarComponent(): string {
  return `import { motion } from "framer-motion";

type Logo = { name: string; [k: string]: unknown };
type Props = { title?: string; logos: Logo[] };

/**
 * LogosBar — bandeau "ils nous font confiance" inspiré Stripe.
 * Affiche les noms en typo épurée semi-transparente, sans logos image (toujours fragile à générer).
 */
export default function LogosBar({ title, logos }: Props) {
  if (!logos?.length) return null;
  return (
    <section data-edit-section="LogosBar" className="py-14 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        {title && (
          <p data-edit-field="title" className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-8">{title}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {logos.slice(0, 6).map((logo, i) => (
            <motion.div
              key={logo.name + i}
              className="text-center"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <span data-edit-field={\`logos.\${i}.name\`} className="font-heading text-lg lg:text-xl font-bold text-gray-400 hover:text-gray-700 transition-colors tracking-tight">
                {logo.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function featureSplitComponent(): string {
  return `import { motion } from "framer-motion";

type Block = {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  imageUrl?: string;
  imageAlt?: string;
  codeSnippet?: string;
  imageKeywords?: string;
  [k: string]: unknown;
};

type Props = { blocks: Block[] };

/**
 * FeatureSplit — feature en pleine largeur avec texte + mockup côte à côte (alterné).
 * Inspiré Stripe : pas de cartes icône, mais des blocs marketing larges.
 */
export default function FeatureSplit({ blocks }: Props) {
  if (!blocks?.length) return null;
  return (
    <section data-edit-section="FeatureSplit" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 space-y-24 lg:space-y-32">
        {blocks.map((block, i) => {
          const reverse = i % 2 === 1;
          return (
            <div
              key={block.title + i}
              className={\`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center \${reverse ? "lg:[&>*:first-child]:order-2" : ""}\`}
            >
              <motion.div
                initial={{ opacity: 0, x: reverse ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {block.eyebrow && (
                  <span data-edit-field={\`blocks.\${i}.eyebrow\`} className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-4 block">{block.eyebrow}</span>
                )}
                <h2 data-edit-field={\`blocks.\${i}.title\`} className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05] mb-5 text-gray-900">{block.title}</h2>
                <p data-edit-field={\`blocks.\${i}.description\`} className="text-lg text-gray-600 leading-relaxed mb-6">{block.description}</p>
                {block.bullets && block.bullets.length > 0 && (
                  <ul className="space-y-3">
                    {block.bullets.map((b, j) => (
                      <li key={j} className="flex gap-3 text-gray-700">
                        <svg className="flex-shrink-0 w-5 h-5 mt-1 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
                        </svg>
                        <span data-edit-field={\`blocks.\${i}.bullets.\${j}\`}>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: reverse ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-secondary/15 rounded-3xl blur-xl" aria-hidden />
                {block.codeSnippet ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900 text-gray-100">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950">
                      <span className="w-3 h-3 rounded-full bg-red-500/70" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <span className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto"><code>{block.codeSnippet}</code></pre>
                  </div>
                ) : block.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 aspect-[4/3]">
                    <img data-edit-field={\`blocks.\${i}.imageUrl\`} src={block.imageUrl} alt={block.imageAlt ?? block.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="relative rounded-2xl shadow-2xl border border-gray-100 bg-gradient-to-br from-primary/15 via-white to-secondary/15 aspect-[4/3] flex items-center justify-center p-10">
                    <svg viewBox="0 0 160 120" className="w-full max-w-sm text-primary" fill="none">
                      <rect x="8" y="14" width="144" height="92" rx="6" fill="white" />
                      <rect x="18" y="26" width="60" height="6" rx="2" fill="currentColor" opacity="0.35" />
                      <rect x="18" y="40" width="124" height="3" rx="1.5" fill="currentColor" opacity="0.18" />
                      <rect x="18" y="48" width="98" height="3" rx="1.5" fill="currentColor" opacity="0.18" />
                      <rect x="18" y="62" width="38" height="38" rx="3" fill="currentColor" opacity="0.25" />
                      <rect x="62" y="62" width="38" height="38" rx="3" fill="currentColor" opacity="0.4" />
                      <rect x="106" y="62" width="36" height="38" rx="3" fill="currentColor" opacity="0.55" />
                    </svg>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
`;
}

function contactComponent(): string {
  return `import { useState, type FormEvent, type ReactNode } from "react";

const FORMS_API = "/wanapush/api/forms/submit";
function getSiteSlug(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/^\\/+|\\/+$/g, "");
  return base.split("/").pop() || "unknown";
}


type FormField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required?: boolean;
};

type TrustItem = { title: string; desc: string; [k: string]: unknown };

type Props = {
  title: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
  trustItems?: TrustItem[];
  showForm?: boolean;
  formTitle?: string;
  formSubmitText?: string;
  formFields?: FormField[];
};

const DEFAULT_FIELDS: FormField[] = [
  { name: "name", label: "Votre nom", type: "text", required: true },
  { name: "email", label: "Votre email", type: "email", required: true },
  { name: "phone", label: "Téléphone", type: "tel", required: false },
  { name: "message", label: "Votre message", type: "textarea", required: true },
];

const IconLocation = () => (
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IconEmail = () => (
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IconPhone = () => (
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IconClock = () => (
  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

type InfoCard = { icon: ReactNode; label: string; value: string; href?: string };

export default function Contact({
  title, subtitle, email, phone, address, hours, trustItems,
  showForm = true,
  formTitle = "Envoyez-nous un message",
  formSubmitText = "Envoyer",
  formFields = DEFAULT_FIELDS,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data: Record<string, string> = {};
    // Pour chaque entrée, on cherche un label humain (placeholder, span du
    // label parent, titre de groupe radio). Si rien trouvé → fallback name.
    function humanLabel(name: string): string {
      const inp = form.querySelector(\`[name="\${CSS.escape(name)}"]\`) as HTMLElement | null;
      if (!inp) return name;
      const ph = (inp as HTMLInputElement).placeholder;
      if (ph) return ph;
      const tag = inp.tagName;
      if (tag === "INPUT") {
        const type = (inp as HTMLInputElement).type;
        // Checkbox : on prend le span du label parent
        if (type === "checkbox") {
          const lbl = inp.closest("label");
          const span = lbl?.querySelector("span");
          if (span?.textContent) return span.textContent.trim();
        }
        // Radio : on prend le titre du groupe (data-edit-field=name_title,
        // ou à défaut le premier enfant non-label avec du texte)
        if (type === "radio") {
          const wrap = inp.closest("div");
          if (wrap) {
            const titleByAttr = wrap.querySelector(\`[data-edit-field="\${name}_title"]\`);
            if (titleByAttr?.textContent) return titleByAttr.textContent.trim();
            for (const child of Array.from(wrap.children)) {
              if (child.tagName !== "LABEL" && child.textContent?.trim()) {
                return child.textContent.trim();
              }
            }
          }
        }
      }
      if (tag === "SELECT") {
        // 1. Wrapper avec data-edit-field=name_title
        const wrap = inp.closest("div");
        if (wrap) {
          const titleByAttr = wrap.querySelector(\`[data-edit-field="\${name}_title"]\`);
          if (titleByAttr?.textContent) return titleByAttr.textContent.trim();
        }
        // 2. <label> ou <div> juste avant
        const prev = inp.previousElementSibling;
        if (prev && (prev.tagName === "LABEL" || prev.tagName === "DIV")) {
          const txt = prev.textContent?.trim();
          if (txt && txt.length < 80) return txt;
        }
        // 3. Texte de l'option placeholder (value vide)
        const sel = inp as HTMLSelectElement;
        const ph = Array.from(sel.options).find((o) => o.value === "");
        if (ph?.textContent) return ph.textContent.trim();
      }
      return name;
    }
    // Pour les <select> et radio, "value" est la valeur technique (option1).
    // On la remplace par le texte visible de l'option choisie.
    function humanValue(name: string, raw: string): string {
      const inp = form.querySelector(\`[name="\${CSS.escape(name)}"]\`) as HTMLElement | null;
      if (!inp) return raw;
      if (inp.tagName === "SELECT") {
        const sel = inp as HTMLSelectElement;
        const opt = Array.from(sel.options).find((o) => o.value === raw);
        if (opt && opt.textContent) return opt.textContent.trim();
      }
      if (inp.tagName === "INPUT" && (inp as HTMLInputElement).type === "radio") {
        const radios = form.querySelectorAll(\`input[type="radio"][name="\${CSS.escape(name)}"]\`);
        for (const r of Array.from(radios)) {
          if ((r as HTMLInputElement).value === raw) {
            const lbl = (r as HTMLInputElement).closest("label");
            const span = lbl?.querySelector("span");
            if (span?.textContent) return span.textContent.trim();
          }
        }
      }
      return raw;
    }
    fd.forEach((v, k) => {
      const label = humanLabel(k);
      const raw = typeof v === "string" ? v : "";
      data[label] = humanValue(k, raw);
    });
    // Honeypot — bot rempli ce champ, on simule un succès
    if (data._hp) { setSubmitted(true); return; }
    delete data._hp;
    setSending(true);
    try {
      await fetch(FORMS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: getSiteSlug(),
          type: "contact",
          data,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
    } catch {
      // Échec silencieux côté UI — on confirme quand même pour ne pas frustrer
    }
    setSending(false);
    setSubmitted(true);
    form.reset();
  }

  const infoCards: (InfoCard & { field: string })[] = ([
    address ? { icon: <IconLocation />, label: "Adresse", value: address, field: "address" } : null,
    email ? { icon: <IconEmail />, label: "Email", value: email, href: \`mailto:\${email}\`, field: "email" } : null,
    phone ? { icon: <IconPhone />, label: "Téléphone", value: phone, href: \`tel:\${phone}\`, field: "phone" } : null,
    hours ? { icon: <IconClock />, label: "Horaires", value: hours, field: "hours" } : null,
  ] as ((InfoCard & { field: string }) | null)[]).filter((c): c is InfoCard & { field: string } => c !== null);

  const colsCls = infoCards.length >= 4 ? "lg:grid-cols-4" : infoCards.length === 3 ? "lg:grid-cols-3" : infoCards.length === 2 ? "lg:grid-cols-2" : "";

  return (
    <section data-edit-section="Contact" className="relative py-16 sm:py-20 md:py-24 bg-blue-50/40 overflow-hidden" id="contact">
      {/* Decorative blobs */}
      <div className="absolute top-1/3 left-6 sm:left-12 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-cyan-300/70 hidden md:block" />
      <div className="absolute bottom-12 right-1/4 w-12 h-12 rounded-full bg-primary/80 hidden lg:block" />
      <div className="absolute top-8 right-8 w-20 h-20 hidden lg:block opacity-30">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-gray-400"><polygon points="50,10 90,80 10,80" strokeWidth="1.5"/></svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        {/* Info cards row */}
        {infoCards.length > 0 && (
          <div className={\`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-10 sm:mb-14 \${colsCls}\`}>
            {infoCards.map((c, i) => {
              const inner = (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">{c.icon}</div>
                  <div className="text-primary font-bold text-sm mb-1">{c.label}</div>
                  <div data-edit-field={c.field} className="text-xs text-gray-600 leading-relaxed whitespace-pre-line break-words">{c.value}</div>
                </>
              );
              return c.href ? (
                <a key={i} href={c.href} className="block bg-white rounded-2xl px-5 py-6 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  {inner}
                </a>
              ) : (
                <div key={i} className="bg-white rounded-2xl px-5 py-6 text-center shadow-sm">
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        {/* Split content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left card */}
          <div className="bg-white rounded-3xl p-7 sm:p-10 lg:p-12 shadow-sm">
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-primary leading-[1.05] mb-6 tracking-tight">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 leading-relaxed text-sm sm:text-base mb-7">{subtitle}</p>}

            {trustItems && trustItems.length > 0 && (
              <div className="space-y-3">
                {trustItems.map((t, i) => (
                  <div key={i} className="flex items-start gap-4 bg-gray-50/80 p-4 rounded-2xl">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm"><IconCheck /></div>
                    <div className="flex-1 min-w-0">
                      <h4 data-edit-field={\`trustItems.\${i}.title\`} className="font-bold text-gray-900 mb-1 text-base leading-snug">{t.title}</h4>
                      <p data-edit-field={\`trustItems.\${i}.desc\`} className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right form */}
          {showForm && (
            <div className="lg:pt-2 px-2 sm:px-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-0.5 bg-primary" />
                <h3 data-edit-field="formTitle" className="font-bold text-gray-900 text-base sm:text-lg">{formTitle}</h3>
              </div>
              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-semibold">
                  ✓ Merci ! Nous reviendrons vers vous très rapidement.
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
                  {/* Honeypot anti-spam (caché) */}
                  <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }} />
                  {formFields.map((f) => (
                    f.type === "textarea" ? (
                      <textarea key={f.name} name={f.name} placeholder={f.label} rows={4} required={f.required}
                        className="w-full px-5 py-4 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all resize-y min-h-[120px]" />
                    ) : (
                      <input key={f.name} type={f.type} name={f.name} placeholder={f.label} required={f.required}
                        className="w-full px-5 py-4 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all" />
                    )
                  ))}
                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={sending}
                      className="px-7 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sending ? "Envoi en cours…" : <span data-edit-field="formSubmitText">{formSubmitText}</span>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render section data → JSX inline (utilisé dans les pages)
// ─────────────────────────────────────────────────────────────────────────────


function testimonialsComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { name?: string; role?: string; text?: string; rating?: number; avatarUrl?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[] };

export default function Testimonials({ title, subtitle, items }: Props) {
  return (
    <section data-edit-section="Testimonials" className="py-16 sm:py-24 bg-white" id="testimonials">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <div>
            <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-widest mb-3">---- Avis clients</span>
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 mt-3 max-w-xl leading-relaxed">{subtitle}</p>}
          </div>
          <a href="#contact" className="shrink-0 px-5 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
            Voir tous les avis +
          </a>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {items.map((it, i) => (
            <motion.div key={i}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
              className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 flex flex-col gap-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-lg leading-none select-none">"</div>
                <div className="flex gap-0.5">
                  {Array.from({ length: it.rating ?? 5 }).map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <p data-edit-field={\`items.\${i}.text\`} className="text-gray-600 text-sm leading-relaxed flex-1">{it.text}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <p data-edit-field={\`items.\${i}.name\`} className="font-bold text-gray-900 text-sm">{it.name}</p>
                  <p data-edit-field={\`items.\${i}.role\`} className="text-gray-500 text-xs mt-0.5">{it.role}</p>
                </div>
                {it.avatarUrl && (
                  <img src={it.avatarUrl} alt={it.name} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function pricingComponent(): string {
  return `import { motion } from "framer-motion";

type Plan = { name: string; price: string; period?: string; features: string[]; featured?: boolean; ctaText?: string; ctaHref?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; plans: Plan[] };

export default function Pricing({ title, subtitle, plans }: Props) {
  return (
    <section data-edit-section="Pricing" className="py-16 sm:py-24 bg-gray-50" id="pricing">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-widest mb-3">---- Nos tarifs</span>
          <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900">{title}</h2>
          {subtitle && <p data-edit-field="subtitle" className="text-gray-500 mt-3 max-w-xl mx-auto leading-relaxed">{subtitle}</p>}
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {plans.map((plan, i) => (
            <motion.div key={i}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
              className={\`relative rounded-2xl overflow-hidden border \${plan.featured ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02]" : "border-gray-200 bg-white"}\`}
            >
              <div className={\`p-6 sm:p-8 \${plan.featured ? "bg-primary" : "bg-gray-50"}\`}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span data-edit-field={\`plans.\${i}.price\`} className={\`text-4xl sm:text-5xl font-black \${plan.featured ? "text-white" : "text-gray-900"}\`}>{plan.price}</span>
                  {plan.period && <span className={\`text-sm font-medium \${plan.featured ? "text-white/70" : "text-gray-500"}\`}>/ <span data-edit-field={\`plans.\${i}.period\`}>{plan.period}</span></span>}
                </div>
                <h3 data-edit-field={\`plans.\${i}.name\`} className={\`text-base font-bold mt-1 \${plan.featured ? "text-white" : "text-gray-900"}\`}>{plan.name}</h3>
              </div>
              <div className="p-6 sm:p-8 bg-white space-y-3">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center justify-between gap-3">
                    <span data-edit-field={\`plans.\${i}.features.\${j}\`} className="text-sm text-gray-700">{f}</span>
                    <div className={\`w-5 h-5 rounded border flex items-center justify-center shrink-0 \${plan.featured ? "border-primary/40 bg-primary/8" : "border-gray-200 bg-gray-50"}\`}>
                      <svg className={\`w-3 h-3 \${plan.featured ? "text-primary" : "text-gray-400"}\`} fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <a
                    href={plan.ctaHref ?? "#contact"}
                    className={\`block w-full text-center py-3 px-6 rounded-xl font-bold text-sm transition-all \${plan.featured ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30" : "border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary"}\`}
                  >
                    <span data-edit-field={\`plans.\${i}.ctaText\`}>{plan.ctaText ?? "Choisir ce plan"}</span> +
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function highlightsComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { emoji?: string; title?: string; desc?: string; imageUrl?: string; imageKeywords?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[] };

function autoImgUrl(title: string, index: number): string {
  const tags = title.toLowerCase().replace(/[^a-z\\s]/g, "").trim().split(/\\s+/).slice(0, 3).join(",");
  const lock = (index * 113 + 77) % 9999;
  return \`https://loremflickr.com/800/500/\${tags}?lock=\${lock}\`;
}

export default function Highlights({ title, subtitle, items }: Props) {
  return (
    <section data-edit-section="Highlights" className="py-16 sm:py-24 bg-gray-50 overflow-hidden" id="pourquoi">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-widest mb-3">---- Nos atouts</span>
          <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p data-edit-field="subtitle" className="text-gray-500 mt-4 text-base sm:text-lg leading-relaxed">{subtitle}</p>}
        </motion.div>
        <div className="space-y-10 lg:space-y-16">
          {items.map((it, i) => {
            const isEven = i % 2 === 0;
            const src = it.imageUrl || autoImgUrl(String(it.title || it.label || "image"), i);
            return (
              <motion.div
                key={i}
                className={\`relative flex flex-col lg:items-center gap-0 \${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}\`}
                initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="w-full lg:w-[58%] lg:flex-shrink-0">
                  <img
                    data-edit-field={\`items.\${i}.imageUrl\`}
                    src={src} alt={it.title} loading="lazy"
                    className="w-full aspect-[16/10] object-cover rounded-2xl shadow-lg"
                  />
                </div>
                <div
                  className={\`relative z-10 bg-white rounded-2xl p-6 sm:p-8 -mt-10 mx-4 lg:mt-0 lg:mx-0 lg:w-[48%] lg:flex-shrink-0 \${isEven ? "lg:-ml-[6%]" : "lg:-mr-[6%]"}\`}
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}
                >
                  <h3 data-edit-field={\`items.\${i}.title\`} className="text-lg sm:text-xl font-bold text-gray-900 mb-3 leading-tight">{it.title}</h3>
                  <p data-edit-field={\`items.\${i}.desc\`} className="text-sm sm:text-base text-gray-500 leading-relaxed">{it.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
`;
}

function serviceTilesComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { emoji?: string; title?: string; desc?: string; imageUrl?: string; ctaText?: string; ctaHref?: string; imageKeywords?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[] };

function autoImgUrl(title: string, index: number): string {
  const tags = title.toLowerCase().replace(/[^a-z\\s]/g, "").trim().split(/\\s+/).slice(0, 3).join(",");
  const lock = (index * 173 + 33) % 9999;
  return \`https://loremflickr.com/600/800/\${tags}?lock=\${lock}\`;
}

export default function ServiceTiles({ title, subtitle, items }: Props) {
  const cols = items.length <= 2 ? "lg:grid-cols-2" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <section data-edit-section="ServiceTiles" className="py-12 sm:py-16 md:py-20 bg-white" id="prestations">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {title && (
          <motion.div
            className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <span data-edit-field="_eyebrow" className="inline-block text-primary font-semibold text-xs uppercase tracking-widest mb-3">---- Nos prestations</span>
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 mt-4 leading-relaxed">{subtitle}</p>}
          </motion.div>
        )}
        <motion.div
          className={\`grid grid-cols-1 sm:grid-cols-2 \${cols} gap-2 sm:gap-3\`}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {items.map((it, i) => {
            const src = it.imageUrl || autoImgUrl(String(it.title || it.label || "image"), i);
            return (
              <motion.a
                key={i}
                href={it.ctaHref || "#contact"}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                className="group relative block aspect-[3/4] overflow-hidden cursor-pointer"
              >
                <img data-edit-field={\`items.\${i}.imageUrl\`} src={src} alt={it.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/85 transition-opacity group-hover:from-black/30 group-hover:via-black/55 group-hover:to-black/90" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8 text-white text-center">
                  <div className="flex flex-col items-center max-w-[280px]">
                    <div className="w-20 h-20 rounded-full border-2 border-white/85 flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110">
                      <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6m11-11h-6M7 12H1" strokeLinecap="round"/></svg>
                    </div>
                    <h3 data-edit-field={\`items.\${i}.title\`} className="font-bold text-sm sm:text-base uppercase tracking-[0.18em] mb-4 leading-snug">{it.title}</h3>
                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed mb-6 line-clamp-4"><span data-edit-field={\`items.\${i}.desc\`}>{it.desc}</span></p>
                    <span className="inline-block px-5 py-2.5 border border-white/85 text-[10px] font-bold uppercase tracking-widest group-hover:bg-white group-hover:text-gray-900 transition-colors">
                      <span data-edit-field={\`items.\${i}.ctaText\`}>{it.ctaText || "En savoir plus"}</span>
                    </span>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function circlesComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { category?: string; emoji?: string; title?: string; desc?: string; imageUrl?: string; ctaText?: string; ctaHref?: string; imageKeywords?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[] };

function autoImgUrl(title: string, index: number): string {
  const tags = title.toLowerCase().replace(/[^a-z\\s]/g, "").trim().split(/\\s+/).slice(0, 3).join(",");
  const lock = (index * 211 + 19) % 9999;
  return \`https://loremflickr.com/500/500/\${tags}?lock=\${lock}\`;
}

export default function Circles({ title, subtitle, items }: Props) {
  const cols = items.length <= 2 ? "md:grid-cols-2" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4";
  return (
    <section data-edit-section="Circles" className="relative py-16 sm:py-24 md:py-28 bg-white overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-32 right-8 sm:right-16 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-300 opacity-80 hidden md:block" />
      <div className="absolute bottom-32 left-8 sm:left-16 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary opacity-90 hidden md:block" />
      <div className="absolute top-1/2 left-4 w-3 h-3 rounded-full bg-pink-300 opacity-60 hidden md:block" />
      <div className="absolute bottom-1/4 right-1/3 w-4 h-4 rounded-full bg-primary/30 hidden md:block" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        {title && (
          <motion.div
            className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 mt-4 leading-relaxed">{subtitle}</p>}
          </motion.div>
        )}
        <motion.div
          className={\`grid grid-cols-1 \${cols} gap-10 sm:gap-8\`}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        >
          {items.map((it, i) => {
            const src = it.imageUrl || autoImgUrl(String(it.title || it.label || "image"), i);
            return (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
                className="flex flex-col items-center text-center px-4"
              >
                {/* Illustration with decorative ring + dots */}
                <div className="relative w-52 h-52 sm:w-60 sm:h-60 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-pink-200/70" />
                  <div className="absolute -top-1 left-12 w-2 h-2 rounded-full bg-pink-200" />
                  <div className="absolute top-10 -right-1 w-1.5 h-1.5 rounded-full bg-pink-300" />
                  <div className="absolute bottom-6 -left-1 w-2.5 h-2.5 rounded-full bg-pink-200/80" />
                  <div className="absolute -bottom-1 right-12 w-1.5 h-1.5 rounded-full bg-pink-300" />
                  <div className="absolute top-1/3 -left-3 w-1.5 h-1.5 rounded-full bg-yellow-200" />
                  <div className="absolute bottom-1/3 -right-3 w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {/* Image clipped to circle */}
                  <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center">
                    {src
                      ? <img data-edit-field={\`items.\${i}.imageUrl\`} src={src} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                      : <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round"/><path d="M9 9h.01M15 9h.01" strokeLinecap="round"/></svg>
                    }
                  </div>
                </div>
                {it.category && (
                  <span data-edit-field={\`items.\${i}.category\`} className="text-primary text-sm font-semibold mb-2">{it.category}</span>
                )}
                <h3 data-edit-field={\`items.\${i}.title\`} className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{it.title}</h3>
                <p data-edit-field={\`items.\${i}.desc\`} className="text-gray-500 leading-relaxed mb-6 max-w-xs text-sm sm:text-base">{it.desc}</p>
                <a
                  href={it.ctaHref || "#contact"}
                  className="inline-block px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold underline-offset-4 hover:underline hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  <span data-edit-field={\`items.\${i}.ctaText\`}>{it.ctaText || "Lire plus"}</span>
                </a>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function servicesGridComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { category?: string; title?: string; desc?: string; imageUrl?: string; imageKeywords?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[] };

function autoImgUrl(title: string, index: number): string {
  const tags = title.toLowerCase().replace(/[^a-z\\s]/g, "").trim().split(/\\s+/).slice(0, 3).join(",");
  const lock = (index * 191 + 7) % 9999;
  return \`https://loremflickr.com/600/400/\${tags}?lock=\${lock}\`;
}

export default function ServicesGrid({ title, subtitle, items }: Props) {
  const renderTitle = (t: string) => {
    const words = t.split(" ");
    if (words.length < 2) return <strong className="font-black">{t}</strong>;
    const last = words[words.length - 1];
    const rest = words.slice(0, -1).join(" ");
    return <><span className="font-light">{rest} </span><strong className="font-black">{last}</strong></>;
  };
  return (
    <section data-edit-section="ServicesGrid" className="bg-gray-100">
      {title && (
        <motion.div
          className="bg-gray-950 py-7 sm:py-10 text-center px-5"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <h2 data-edit-field="title" className="text-2xl sm:text-3xl md:text-4xl font-heading text-white tracking-[0.15em] uppercase">
            {renderTitle(title)}
          </h2>
        </motion.div>
      )}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-12 sm:py-16 md:py-20">
        {subtitle && (
          <p data-edit-field="subtitle" className="text-center text-gray-500 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed">{subtitle}</p>
        )}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        >
          {items.map((it, i) => {
            const src = it.imageUrl || autoImgUrl(String(it.title || it.label || "image"), i);
            return (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                className="text-center"
              >
                <div className="aspect-video bg-gray-200 mb-7 overflow-hidden shadow-md">
                  <img data-edit-field={\`items.\${i}.imageUrl\`} src={src} alt={it.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                </div>
                {it.category && (
                  <p data-edit-field={\`items.\${i}.category\`} className="text-gray-400 uppercase tracking-[0.25em] text-xs sm:text-sm mb-2 font-medium">{it.category}</p>
                )}
                <h3 data-edit-field={\`items.\${i}.title\`} className="text-primary font-black text-xl sm:text-2xl uppercase mb-4 tracking-wide">{it.title}</h3>
                <p data-edit-field={\`items.\${i}.desc\`} className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">{it.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function featuresPhoneComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { title?: string; desc?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; items: Item[]; imageUrl?: string };

const GenericIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round"/>
  </svg>
);

export default function FeaturesPhone({ title, subtitle, items, imageUrl }: Props) {
  // Layout figé : 3 features à gauche + 3 à droite = 6 total. Si l'IA en
  // fournit moins, on duplique le dernier pour maintenir la symétrie ; plus,
  // on tronque à 6.
  const padded = items.slice(0, 6);
  while (padded.length < 6 && items.length > 0) padded.push(items[items.length - 1]);
  const left = padded.slice(0, 3);
  const right = padded.slice(3, 6);
  const half = 3;

  return (
    <section data-edit-section="FeaturesPhone" className="relative py-16 sm:py-20 md:py-24 bg-gray-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        {title && (
          <motion.h2
            data-edit-field="title"
            className="text-center text-3xl sm:text-4xl md:text-5xl font-heading text-white tracking-[0.1em] mb-3"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            {title.split(" ").map((w, i, arr) => i === arr.length - 1
              ? <strong key={i} className="font-black">{w}</strong>
              : <span key={i} className="font-light">{w} </span>
            )}
          </motion.h2>
        )}
        {subtitle && <p data-edit-field="subtitle" className="text-center text-gray-400 mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}

        <div className="hidden lg:grid grid-cols-12 gap-6 items-center">
          {/* Left column */}
          <div className="col-span-4 flex flex-col gap-10">
            {left.map((it, i) => (
              <motion.div
                key={i} className="flex items-start gap-4 text-right"
                initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="flex-1">
                  <h3 data-edit-field={\`items.\${i}.title\`} className="text-primary font-bold uppercase tracking-[0.15em] text-sm mb-2">{it.title}</h3>
                  <p data-edit-field={\`items.\${i}.desc\`} className="text-gray-400 text-sm leading-relaxed">{it.desc}</p>
                </div>
                <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <GenericIcon />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Center: phone */}
          <div className="col-span-4 flex justify-center">
            <motion.div
              className="relative w-60 h-[480px] rounded-[2.5rem] bg-gray-900 p-2 border-[5px] border-gray-800 shadow-2xl"
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {imageUrl ? (
                <img data-edit-field="imageUrl" src={imageUrl} alt="App" loading="lazy" className="w-full h-full rounded-[2rem] object-cover" />
              ) : (
                <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-primary/30 to-gray-800 flex items-center justify-center">
                  <span className="text-white/40 text-sm">App</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right column */}
          <div className="col-span-4 flex flex-col gap-10">
            {right.map((it, i) => {
              const idx = half + i;
              return (
              <motion.div
                key={i} className="flex items-start gap-4"
                initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <GenericIcon />
                </div>
                <div className="flex-1">
                  <h3 data-edit-field={\`items.\${idx}.title\`} className="text-primary font-bold uppercase tracking-[0.15em] text-sm mb-2">{it.title}</h3>
                  <p data-edit-field={\`items.\${idx}.desc\`} className="text-gray-400 text-sm leading-relaxed">{it.desc}</p>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {items.map((it, i) => (
            <motion.div
              key={i} className="flex items-start gap-4"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <GenericIcon />
              </div>
              <div className="flex-1">
                <h3 data-edit-field={\`items.\${i}.title\`} className="text-primary font-bold uppercase tracking-[0.15em] text-sm mb-1">{it.title}</h3>
                <p data-edit-field={\`items.\${i}.desc\`} className="text-gray-400 text-sm leading-relaxed">{it.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function processVerticalComponent(): string {
  return `import { motion } from "framer-motion";

type Step = { number?: string; title?: string; desc?: string; [k: string]: unknown };
type Props = { title?: string; subtitle?: string; steps: Step[] };

export default function ProcessVertical({ title, subtitle, steps }: Props) {
  return (
    <section data-edit-section="ProcessVertical" className="bg-gray-50 py-16 sm:py-24 md:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {title && (
          <motion.div
            className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 mb-3 leading-tight">{title}</h2>
            {subtitle && <p data-edit-field="subtitle" className="text-gray-500 leading-relaxed">{subtitle}</p>}
          </motion.div>
        )}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left decoration */}
          <div className="hidden lg:flex col-span-5 relative justify-end items-center min-h-[480px]">
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] border-[3px] border-primary rounded-full"
              initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="relative pr-12">
              <span className="text-4xl xl:text-5xl font-heading font-black text-gray-900 tracking-tight">{steps.length > 0 ? "Méthode" : ""}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="col-span-12 lg:col-span-7 space-y-5 sm:space-y-6">
            {steps.map((s, i) => (
              <motion.div
                key={i} className="flex items-start gap-5"
                initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-primary text-white flex items-center justify-center rounded-2xl text-3xl sm:text-4xl font-black shadow-lg shadow-primary/25">
                  {s.number}
                </div>
                <div className="pt-2 flex-1 min-w-0">
                  <h3 data-edit-field={\`steps.\${i}.title\`} className="font-bold uppercase tracking-[0.1em] text-base sm:text-lg mb-2 text-gray-900">{s.title}</h3>
                  <p data-edit-field={\`steps.\${i}.desc\`} className="text-gray-500 leading-relaxed text-sm sm:text-base">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
`;
}

function heroBlobComponent(): string {
  return `import { motion } from "framer-motion";

type Props = {
  eyebrow?: string;
  title: string;
  ctaText?: string;
  ctaHref?: string;
  imageUrl?: string;
  imageAlt?: string;
};

export default function HeroBlob({ eyebrow, title, ctaText, ctaHref = "#contact", imageUrl, imageAlt }: Props) {
  return (
    <section data-edit-section="HeroBlob" className="relative h-screen min-h-[640px] overflow-hidden bg-gray-900">
      {/* Background image */}
      {imageUrl && (
        <motion.img
          data-edit-field="imageUrl"
          src={imageUrl} alt={imageAlt ?? title} loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }} animate={{ scale: 1 }}
          transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      {/* Overlay sombre subtil pour le contraste global */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Forme circulaire décorative géante à gauche */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 -left-[55%] sm:-left-[40%] md:-left-[30%] w-[170%] sm:w-[130%] md:w-[110%] aspect-square rounded-full bg-amber-50/40 backdrop-blur-[2px]"
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Contenu */}
      <div className="relative h-full flex items-center max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div
          className="max-w-2xl text-white"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          {eyebrow && (
            <span data-edit-field="eyebrow" className="block text-xs sm:text-sm font-medium uppercase tracking-[0.4em] mb-6 sm:mb-8 text-white/90">
              {eyebrow}
            </span>
          )}
          <h1 data-edit-field="title" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-black uppercase tracking-[0.02em] leading-[0.95] mb-8 sm:mb-10">
            {title}
          </h1>
          {ctaText && (
            <a href={ctaHref}
              className="inline-block px-7 sm:px-10 py-3 sm:py-3.5 border-2 border-white text-white rounded-full text-xs sm:text-sm font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-gray-900 transition-colors">
              <span data-edit-field="ctaText">{ctaText}</span>
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function heroSplitComponent(): string {
  return `import { motion } from "framer-motion";

type Props = {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  badge?: string;
  imageUrl?: string;
  imageAlt?: string;
};

/**
 * HeroSplit — layout 50/50 inspiré Stripe/Vercel/Linear.
 * Texte à gauche (badge, h1, subtitle, 2 CTAs), visuel à droite (image + cartes flottantes ou mockup gradient si pas d'image).
 * Fond clair par défaut (le customCss preset peut override en sombre).
 */
export default function HeroSplit({ title, subtitle, ctaText, ctaHref = "#contact", ctaSecondaryText, ctaSecondaryHref, badge, imageUrl, imageAlt }: Props) {
  return (
    <section data-edit-section="HeroSplit" className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 opacity-80" aria-hidden />
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {badge && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /><span data-edit-field="badge">{badge}</span>
              </span>
            )}
            <h1 data-edit-field="title" className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] mb-6 text-gray-900">{title}</h1>
            <p data-edit-field="subtitle" className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">{subtitle}</p>
            <div className="flex flex-wrap gap-3">
              {ctaText && (
                <a href={ctaHref} className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-lg font-semibold hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
                  <span data-edit-field="ctaText">{ctaText}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )}
              {ctaSecondaryText && (
                <a href={ctaSecondaryHref ?? "#features"} className="inline-flex items-center gap-2 text-gray-900 px-6 py-3.5 rounded-lg font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
                  <span data-edit-field="ctaSecondaryText">{ctaSecondaryText}</span>
                </a>
              )}
            </div>
          </motion.div>

          <motion.div
            className="relative aspect-[4/3] lg:aspect-square w-full"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent rounded-3xl blur-2xl" aria-hidden />
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/60 bg-white">
              {imageUrl ? (
                <img data-edit-field="imageUrl" src={imageUrl} alt={imageAlt ?? title} className="w-full h-full object-cover" loading="eager" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-10">
                  <svg viewBox="0 0 200 140" className="w-full max-w-md text-white/90" fill="none">
                    <rect x="10" y="10" width="180" height="120" rx="8" fill="white" fillOpacity="0.95" />
                    <rect x="22" y="24" width="60" height="8" rx="2" fill="currentColor" opacity="0.2" />
                    <rect x="22" y="40" width="156" height="4" rx="2" fill="currentColor" opacity="0.15" />
                    <rect x="22" y="50" width="120" height="4" rx="2" fill="currentColor" opacity="0.15" />
                    <rect x="22" y="68" width="50" height="50" rx="4" fill="currentColor" opacity="0.2" />
                    <rect x="82" y="68" width="50" height="50" rx="4" fill="currentColor" opacity="0.3" />
                    <rect x="142" y="68" width="36" height="50" rx="4" fill="currentColor" opacity="0.4" />
                  </svg>
                </div>
              )}
            </div>
            <motion.div
              className="absolute -bottom-6 -left-6 lg:-left-10 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</div>
                <div className="text-sm font-semibold text-gray-900">Opérationnel</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
`;
}

function heroSliderComponent(): string {
  return `import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Slide = {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaHref?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageKeywords?: string;
  [k: string]: unknown;
};

type Props = { slides: Slide[]; autoplay?: boolean };

export default function HeroSlider({ slides, autoplay = true }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [autoplay, slides.length]);

  if (slides.length === 0) return null;
  const s = slides[current];
  const next = () => setCurrent((c) => (c + 1) % slides.length);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  return (
    <section data-edit-section="HeroSlider" className="relative h-screen min-h-[640px] overflow-hidden bg-gray-900">
      {slides.map((slide, i) => (
        slide.imageUrl && (
          <img
            data-edit-field={\`slides.\${i}.imageUrl\`}
            key={i} src={slide.imageUrl} alt={slide.imageAlt ?? slide.title} loading={i === 0 ? "eager" : "lazy"}
            className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${i === current ? "opacity-100" : "opacity-0"}\`}
          />
        )
      ))}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Précédent"
            className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 text-white/70 hover:text-white transition-colors z-20 flex items-center justify-center">
            <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={next} aria-label="Suivant"
            className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 text-white/70 hover:text-white transition-colors z-20 flex items-center justify-center">
            <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      <div className="relative h-full flex items-center justify-center z-10 px-6 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center text-white max-w-3xl pointer-events-auto"
          >
            <h1 data-edit-field={\`slides.\${current}.title\`} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-light uppercase tracking-[0.08em] mb-6 leading-[1.05]">{s.title}</h1>
            <p data-edit-field={\`slides.\${current}.subtitle\`} className="text-sm sm:text-base italic mb-9 text-white/85 max-w-xl mx-auto leading-relaxed font-serif">{s.subtitle}</p>
            {s.ctaText && (
              <a href={s.ctaHref ?? "#contact"}
                className="inline-block px-9 sm:px-12 py-3.5 sm:py-4 border-2 border-white text-white text-xs uppercase tracking-[0.25em] font-semibold hover:bg-white hover:text-gray-900 transition-colors">
                <span data-edit-field={\`slides.\${current}.ctaText\`}>{s.ctaText}</span>
              </a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={\`h-2 rounded-full transition-all \${i === current ? "bg-white w-8" : "bg-white/40 w-2 hover:bg-white/70"}\`}
              aria-label={\`Slide \${i + 1}\`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
`;
}

function videoComponent(): string {
  return `import { motion } from "framer-motion";

type Props = { title?: string; subtitle?: string; videoUrl: string; posterImageUrl?: string };

function getYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=))([\\w-]{11})/);
  return m ? m[1] : url;
}

export default function Video({ title, subtitle, videoUrl, posterImageUrl }: Props) {
  const videoId = getYouTubeId(videoUrl);
  return (
    <section data-edit-section="Video" className="relative py-16 sm:py-20 md:py-28 bg-gray-950 overflow-hidden">
      {posterImageUrl && (
        <>
          <img data-edit-field="posterImageUrl" src={posterImageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/85 via-gray-950/60 to-gray-950/90" />
        </>
      )}
      <div className="relative max-w-5xl mx-auto px-5 sm:px-6">
        {(title || subtitle) && (
          <motion.div
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            {title && <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white mb-3 tracking-tight">{title}</h2>}
            {subtitle && <p data-edit-field="subtitle" className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
          </motion.div>
        )}
        <motion.div
          className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
        >
          <iframe
            src={\`https://www.youtube.com/embed/\${videoId}\`}
            title={title ?? "Vidéo"}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function promoSplitComponent(): string {
  return `import { motion } from "framer-motion";

type Button = { text: string; href: string };
type Props = {
  title: string;
  description?: string;
  highlight?: string;
  extraDescription?: string;
  buttons?: Button[];
  imageUrl?: string;
  imageAlt?: string;
};

export default function PromoSplit({ title, description, highlight, extraDescription, buttons, imageUrl, imageAlt }: Props) {
  return (
    <section data-edit-section="PromoSplit" className="bg-white">
      <div className="grid lg:grid-cols-2 min-h-[500px]">
        <div className="relative aspect-[4/3] lg:aspect-auto bg-gray-900 overflow-hidden">
          {imageUrl && (
            <motion.img
              data-edit-field="imageUrl"
              src={imageUrl} alt={imageAlt ?? title} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ scale: 1.05, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </div>
        <motion.div
          className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 xl:p-20"
          initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
        >
          <h2 data-edit-field="title" className="text-2xl sm:text-3xl md:text-4xl font-heading font-black uppercase tracking-[0.15em] mb-8 text-gray-900 leading-tight">{title}</h2>
          {description && <p data-edit-field="description" className="text-gray-600 leading-relaxed mb-5 text-sm sm:text-base">{description}</p>}
          {highlight && (
            <p data-edit-field="highlight" className="text-xl sm:text-2xl text-gray-400 italic font-serif leading-relaxed mb-5 border-l-2 border-gray-200 pl-5">
              {highlight}
            </p>
          )}
          {extraDescription && <p data-edit-field="extraDescription" className="text-gray-600 leading-relaxed mb-8 text-sm sm:text-base">{extraDescription}</p>}
          {buttons && buttons.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {buttons.map((b, i) => (
                <a
                  key={i} href={b.href}
                  className={i === 0
                    ? "px-6 py-3 bg-gray-900 text-white text-xs uppercase tracking-widest font-bold hover:bg-gray-800 transition-colors"
                    : "px-6 py-3 border-2 border-gray-900 text-gray-900 text-xs uppercase tracking-widest font-bold hover:bg-gray-900 hover:text-white transition-colors"}
                >
                  <span data-edit-field={\`buttons.\${i}.text\`}>{b.text}</span>
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function actionsGridComponent(): string {
  return `import { motion } from "framer-motion";

type Item = { title?: string; desc?: string; [k: string]: unknown };
type Props = { title?: string; items: Item[]; imageUrl?: string };

export default function ActionsGrid({ title, items, imageUrl }: Props) {
  // 4 items max, en grille 2x2 desktop. Le PREMIER est featured (fond plein primary).
  const visible = items.slice(0, 4);
  return (
    <section data-edit-section="ActionsGrid" className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {imageUrl && (
        <>
          <img data-edit-field="imageUrl" src={imageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gray-900/40" />
        </>
      )}
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        {title && (
          <motion.h2
            data-edit-field="title"
            className="text-3xl sm:text-4xl md:text-5xl font-heading text-gray-900 tracking-tight text-center mb-10 sm:mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            {title.split(" ").map((w, i, arr) => i === arr.length - 1
              ? <strong key={i} className="font-black">{w}</strong>
              : <span key={i} className="font-light">{w} </span>
            )}
          </motion.h2>
        )}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-0"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {visible.map((it, i) => {
            const isFeatured = i === 0;
            return (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                className={isFeatured
                  ? "bg-primary text-white p-7 sm:p-10"
                  : "bg-white/85 backdrop-blur-sm text-gray-800 p-7 sm:p-10 border border-gray-200/40"
                }
              >
                <h3 data-edit-field={\`items.\${i}.title\`} className={\`text-lg sm:text-xl font-bold uppercase tracking-[0.15em] mb-4 \${isFeatured ? "text-white" : "text-primary"}\`}>
                  {it.title}
                </h3>
                <p data-edit-field={\`items.\${i}.desc\`} className={\`text-sm leading-relaxed \${isFeatured ? "text-white/90" : "text-gray-600"}\`}>
                  {it.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function aboutCardsComponent(): string {
  return `import { motion } from "framer-motion";

type Card = { title?: string; desc?: string; description?: string; featured?: boolean; [k: string]: unknown };
type Props = { title?: string; paragraphs?: string[]; cards?: Card[]; imageUrl?: string };

export default function AboutCards({ title, paragraphs, cards, imageUrl }: Props) {
  return (
    <section data-edit-section="AboutCards" className="relative py-16 sm:py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Colonne image (gauche) */}
          <motion.div
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            {imageUrl && (
              <img data-edit-field="imageUrl" src={imageUrl} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-3xl" />
            )}
          </motion.div>

          {/* Colonne droite : titre + paragraphes + 2 cartes décalées */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}
          >
            {title && (
              <h2 data-edit-field="title" className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gray-900 leading-tight mb-6">
                {title.split(" ").map((w, i, arr) => i === arr.length - 1
                  ? <span key={i} className="text-primary">{w}</span>
                  : <span key={i}>{w} </span>
                )}
              </h2>
            )}
            {paragraphs && paragraphs.length > 0 && (
              <div className="space-y-4 mb-10 text-gray-600 leading-relaxed text-sm sm:text-base">
                {paragraphs.map((p, i) => <p key={i} data-edit-field={\`paragraphs.\${i}\`}>{p}</p>)}
              </div>
            )}
            {cards && cards.length > 0 && (
              <div className="relative">
                {cards.slice(0, 2).map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                    className={
                      i === 0
                        // Padding bas généreux (lg:pb-20) → la zone d'overlap
                        // avec la carte blanche reste vide, le texte n'est pas couvert.
                        ? "bg-primary text-white p-6 sm:p-7 lg:pb-20 rounded-2xl shadow-xl mb-4 lg:mb-0 lg:max-w-[80%]"
                        : "bg-white text-gray-900 p-6 sm:p-7 rounded-2xl shadow-xl border border-gray-100 lg:ml-[20%] lg:-mt-12"
                    }
                  >
                    <h3 data-edit-field={\`cards.\${i}.title\`} className={\`text-2xl font-heading font-black mb-3 tracking-wide \${i === 0 ? "text-white" : "text-gray-900"}\`}>
                      {c.title}
                    </h3>
                    <p data-edit-field={\`cards.\${i}.desc\`} className={\`text-sm leading-relaxed \${i === 0 ? "text-white" : "text-gray-500"}\`}>
                      {c.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
`;
}

function renderSectionTsx(
  section: Section,
  pagePath: string,
  imageMap: Record<string, { url: string; alt: string }>,
  pageNavLabel?: string,
): string {
  const d = section.data;
  // Helper: serialize JSON-safe value as JS literal string
  const j = (v: unknown) => JSON.stringify(v);
  // Pour les pages secondaires : le titre du PageHeader est le navLabel court (ex "Services")
  // et le titre du Hero d'origine devient le slogan/subtitle
  const pageTitle = pageNavLabel ?? "";

  // Si une section a un customJsx généré par l'IA (mode vision JSX libre),
  // on rend directement <CustomXxx /> au lieu d'utiliser le composant standard du catalogue.
  const customJsx = (d as { customJsx?: { componentName?: string } }).customJsx;
  if (customJsx?.componentName) {
    const name = `Custom${customJsx.componentName.replace(/^Custom/i, "")}`;
    return `<${name} />`;
  }

  switch (section.type) {
    case "hero": {
      const img = imageMap[`hero-${pagePath}`];
      // Pages secondaires : PageHeader avec titre court (navLabel) + slogan en dessous
      if (pagePath !== "index.html") {
        return `<PageHeader title={${j(pageTitle || d.title)}} subtitle={${j(d.title)}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
      }
      return `<Hero title={${j(d.title)}} subtitle={${j(d.subtitle)}} ctaText={${j(d.ctaText)}} ctaHref={${j(d.ctaHref ?? "#contact")}} ctaSecondaryText={${j(d.ctaSecondaryText)}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} stats={${j(d.stats ?? [])}} />`;
    }
    case "features": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: { imageKeywords?: string }, i: number) => {
        const img = it.imageKeywords ? imageMap[`feat-${pagePath}-${i}`] : null;
        return { ...it, imageUrl: img?.url };
      });
      return `<Features title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} ctaText={${j(d.ctaText ?? "Tous nos services +")}} ctaHref={${j(d.ctaHref ?? "#contact")}} />`;
    }
    case "stats":
      return `<Stats title={${j(d.title)}} items={${j(d.items ?? [])}} />`;
    case "process": {
      const img = imageMap[`process-${pagePath}`];
      return `<Process title={${j(d.title)}} subtitle={${j(d.subtitle)}} steps={${j(d.steps ?? [])}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} />`;
    }
    case "about": {
      const img = imageMap[`about-${pagePath}`];
      return `<About title={${j(d.title)}} paragraphs={${j(d.paragraphs ?? [])}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} />`;
    }
    case "gallery": {
      const images = (Array.isArray(d.imageKeywords) ? d.imageKeywords : []).map((kw, i) => {
        const img = imageMap[`gal-${pagePath}-${i}`];
        return img ?? { url: "", alt: String(kw) };
      });
      return `<Gallery title={${j(d.title)}} images={${j(images)}} />`;
    }
    case "cta":
      return `<Cta title={${j(d.title)}} subtitle={${j(d.subtitle)}} buttonText={${j(d.buttonText)}} buttonHref={${j(d.buttonHref ?? "#contact")}} secondaryText={${j(d.secondaryText)}} />`;
    case "faq": {
      const img = imageMap[`faq-${pagePath}`];
      return `<Faq title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(d.items ?? [])}} ${img ? `imageUrl={${j(img.url)}}` : ""} contactHref={${j(d.contactHref ?? "#contact")}} contactText={${j(d.contactText ?? "Nous contacter")}} />`;
    }
    case "testimonials": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: Record<string, unknown>, i: number) => {
        const img = it.avatarKeywords ? imageMap[`testimonial-${pagePath}-${i}`] : null;
        return { ...it, avatarUrl: img?.url };
      });
      return `<Testimonials title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} />`;
    }
    case "pricing":
      return `<Pricing title={${j(d.title)}} subtitle={${j(d.subtitle)}} plans={${j(d.plans ?? [])}} />`;
    case "highlights": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`hl-${pagePath}-${i}`];
        return { ...it, imageUrl: img?.url };
      });
      return `<Highlights title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} />`;
    }
    case "service_tiles": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`tile-${pagePath}-${i}`];
        return { ...it, imageUrl: img?.url };
      });
      return `<ServiceTiles title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} />`;
    }
    case "circles": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`circle-${pagePath}-${i}`];
        return { ...it, imageUrl: img?.url };
      });
      return `<Circles title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} />`;
    }
    case "video": {
      const poster = imageMap[`video-${pagePath}`];
      return `<Video title={${j(d.title)}} subtitle={${j(d.subtitle)}} videoUrl={${j(d.videoUrl)}} ${poster ? `posterImageUrl={${j(poster.url)}}` : ""} />`;
    }
    case "promo_split": {
      const img = imageMap[`promo-${pagePath}`];
      return `<PromoSplit title={${j(d.title)}} description={${j(d.description)}} highlight={${j(d.highlight)}} extraDescription={${j(d.extraDescription)}} buttons={${j(d.buttons ?? [])}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} />`;
    }
    case "hero_split": {
      const img = imageMap[`hsplit-${pagePath}`];
      if (pagePath !== "index.html") {
        return `<PageHeader title={${j(pageTitle || d.title)}} subtitle={${j(d.title)}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
      }
      return `<HeroSplit title={${j(d.title)}} subtitle={${j(d.subtitle)}} badge={${j(d.badge)}} ctaText={${j(d.ctaText)}} ctaHref={${j(d.ctaHref ?? "#contact")}} ctaSecondaryText={${j(d.ctaSecondaryText)}} ctaSecondaryHref={${j(d.ctaSecondaryHref)}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} />`;
    }
    case "logos_bar":
      return `<LogosBar title={${j(d.title)}} logos={${j(d.logos ?? [])}} />`;
    case "feature_split": {
      const blocks = (Array.isArray(d.blocks) ? d.blocks : []).map((bl: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`fsplit-${pagePath}-${i}`];
        return { ...bl, imageUrl: img?.url };
      });
      return `<FeatureSplit blocks={${j(blocks)}} />`;
    }
    case "hero_slider": {
      if (pagePath !== "index.html") {
        const firstSlide = Array.isArray(d.slides) && d.slides.length > 0 ? d.slides[0] as { title?: string; subtitle?: string } : {};
        const img = imageMap[`hslide-${pagePath}-0`];
        return `<PageHeader title={${j(pageTitle || firstSlide.title || "")}} subtitle={${j(firstSlide.title || firstSlide.subtitle)}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
      }
      const slides = (Array.isArray(d.slides) ? d.slides : []).map((s: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`hslide-${pagePath}-${i}`];
        return { ...s, imageUrl: img?.url, imageAlt: img?.alt };
      });
      return `<HeroSlider slides={${j(slides)}} autoplay={${j(d.autoplay !== false)}} />`;
    }
    case "hero_blob": {
      const img = imageMap[`hblob-${pagePath}`];
      if (pagePath !== "index.html") {
        return `<PageHeader title={${j(pageTitle || d.title)}} subtitle={${j(d.title || d.eyebrow)}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
      }
      return `<HeroBlob eyebrow={${j(d.eyebrow)}} title={${j(d.title)}} ctaText={${j(d.ctaText)}} ctaHref={${j(d.ctaHref ?? "#contact")}} ${img ? `imageUrl={${j(img.url)}} imageAlt={${j(img.alt)}}` : ""} />`;
    }
    case "services_grid": {
      const items = (Array.isArray(d.items) ? d.items : []).map((it: { imageKeywords?: string; title?: string }, i: number) => {
        const img = imageMap[`sg-${pagePath}-${i}`];
        return { ...it, imageUrl: img?.url };
      });
      return `<ServicesGrid title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(items)}} />`;
    }
    case "features_phone": {
      const img = imageMap[`phone-${pagePath}`];
      return `<FeaturesPhone title={${j(d.title)}} subtitle={${j(d.subtitle)}} items={${j(d.items ?? [])}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
    }
    case "process_vertical":
      return `<ProcessVertical title={${j(d.title)}} subtitle={${j(d.subtitle)}} steps={${j(d.steps ?? [])}} />`;
    case "actions_grid": {
      const img = imageMap[`actions-${pagePath}`];
      return `<ActionsGrid title={${j(d.title)}} items={${j(d.items ?? [])}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
    }
    case "about_cards": {
      const img = imageMap[`aboutc-${pagePath}`];
      return `<AboutCards title={${j(d.title)}} paragraphs={${j(d.paragraphs ?? [])}} cards={${j(d.cards ?? [])}} ${img ? `imageUrl={${j(img.url)}}` : ""} />`;
    }
    case "contact":
      return `<ContactSection title={${j(d.title)}} subtitle={${j(d.subtitle)}} email={${j(d.email)}} phone={${j(d.phone)}} address={${j(d.address)}} hours={${j(d.hours)}} trustItems={${j(d.trustItems ?? [])}} showForm={${j(d.showForm !== false)}} formTitle={${j(d.formTitle)}} formSubmitText={${j(d.formSubmitText)}} formFields={${j(d.formFields ?? [])}} />`;
    case "shop_grid":
      return `<ShopGrid title={${j(d.title ?? "Notre boutique")}} subtitle={${j(d.subtitle ?? "Découvrez notre sélection.")}} limit={${j(Number(d.limit) || 12)}} columns={${j(Number(d.columns) || 4)}} ${d.category ? `category={${j(d.category)}}` : ""} />`;
    case "shop_featured":
      return `<ShopFeatured title={${j(d.title ?? "Sélection du moment")}} subtitle={${j(d.subtitle ?? "Nos produits les plus appréciés.")}} eyebrow={${j(d.eyebrow ?? "— Coups de cœur")}} limit={${j(Number(d.limit) || 6)}} />`;
    case "shop_categories":
      return `<ShopCategories title={${j(d.title ?? "Catégories")}} subtitle={${j(d.subtitle ?? "Trouve ce qui te plaît.")}} />`;
    case "shop_browse":
      return `<ShopBrowse title={${j(d.title ?? "Tous nos produits")}} subtitle={${j(d.subtitle ?? "Filtre par catégorie et par prix.")}} />`;
    default:
      return "";
  }
}
