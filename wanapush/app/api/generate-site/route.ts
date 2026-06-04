// API route : génération de sites IA.
// Le code lourd (schema, big prompt IA, render HTML, extraction/build) est extrait
// dans lib/site-gen/* et lib/site-extraction.ts. Ce fichier orchestre le flow POST.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { briefSchema } from "@/lib/site-gen/schema";
import { generatePlan } from "@/lib/site-gen/prompt";
import { renderHtml } from "@/lib/site-gen/render-html";
import { extractAndBuildSite, slugify } from "@/lib/site-extraction";
import { getStylePreset } from "@/lib/site-gen/style-presets";

import { preloadPageImages } from "@/lib/page-images";
import { getDesignRecommendations } from "@/lib/ui-design-skill";
import { generateReactProject } from "@/lib/react-template";
import { generateCustomJsxSection } from "@/lib/site-gen/jsx-generator";
import { saasCleanHomeTsx, saasCleanImageQueries } from "@/lib/site-templates/saas-clean";
import { planToSaasCleanData } from "@/lib/site-templates/mapper";
import { searchPhotos } from "@/lib/unsplash";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.error("[generate-site] body:", JSON.stringify(body).slice(0, 500));
    const fieldPath = issue?.path?.join(".") || "(root)";
    const msg = issue?.message || "Brief invalide";
    console.error("[generate-site] Brief invalide:", parsed.error.issues);
    return NextResponse.json(
      { error: `${msg} (champ: ${fieldPath})`, issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const brief = parsed.data;

  // 1. IA génère le plan complet
  // Récupère les recommandations design (UI style + palette + typo) du skill ui-ux-pro-max
  // Le skill est anglophone : on utilise skillKeywordsEn (extrait par from-prompt) si disponible,
  // sinon on tombe sur le sector français (résultats moins pertinents).
  const skillSector =
    brief.skillKeywordsEn && brief.skillKeywordsEn.trim().length > 0
      ? brief.skillKeywordsEn
      : brief.sector;
  const designRecs = await getDesignRecommendations({
    sector: skillSector,
    audience: brief.audience,
    tone: brief.tone,
    goal: brief.goal,
  });

  // Si le user n'a pas saisi de couleurs, on utilise celles du site de référence (priorité 1)
  // ou celles du skill (priorité 2)
  const refColors = brief.referenceDesign?.dominantColors ?? [];
  if (brief.primaryColor === "#6366f1") {
    if (refColors[0] && /^#[0-9a-f]{6}$/i.test(refColors[0])) {
      brief.primaryColor = refColors[0] as `#${string}`;
    } else if (designRecs?.color.palette.primary) {
      brief.primaryColor = designRecs.color.palette.primary as `#${string}`;
    }
  }
  if (brief.secondaryColor === "#ec4899") {
    if (refColors[1] && /^#[0-9a-f]{6}$/i.test(refColors[1])) {
      brief.secondaryColor = refColors[1] as `#${string}`;
    } else if (designRecs?.color.palette.secondary) {
      brief.secondaryColor = designRecs.color.palette.secondary as `#${string}`;
    }
  }

  const plan = await generatePlan(brief, designRecs);
  if (!plan) {
    return NextResponse.json(
      { error: "L'IA n'a pas pu générer un plan valide. Réessaie." },
      { status: 502 },
    );
  }

  // 1.bis FORCE le designProfile depuis la composition pré-décidée (l'IA l'oublie souvent).
  // Et injecte un preset CSS par profile pour vraiment varier l'apparence visuelle entre les sites.
  if (brief.composition?.designProfile) {
    plan.styleGuide.designProfile = brief.composition.designProfile;
  }
  // Pour React : on COMBINE preset statique (base fiable, cible Tailwind/h1/h2/section) +
  // customCss IA (variantes inspirées du site de référence, cible aussi Tailwind grâce au
  // nouveau prompt REACT_CUSTOM_CSS_BLOCK). Le customCss IA arrive APRÈS le preset, donc gagne
  // la cascade pour les overrides spécifiques (gradient hero, gros titres, gradient text, etc.).
  // Pour HTML pur : on garde le customCss IA s'il existe (cible .wp-*), sinon preset.
  if (brief.framework === "react") {
    const hasVision = !!brief.referenceDesign?.visualAnalysis;
    const base = getStylePreset(plan.styleGuide.designProfile);
    const aiCss = plan.styleGuide.customCss?.trim() ?? "";
    const looksLikeWpCss = /\.wp-/.test(aiCss) && (aiCss.match(/\.wp-/g) ?? []).length > 5;
    if (aiCss.length > 100 && !looksLikeWpCss) {
      // Avec vision IA → l'AI customCss est PRIORITAIRE (il reproduit ce que la vision a vu).
      // On garde le preset comme filet de sécurité (typo de base + radius + ombres) MAIS
      // l'AI css passe APRÈS → cascade gagne, et on retire les `body{...}` et `h1{...}`
      // du preset pour ne pas qu'ils overrident les choix vision.
      if (hasVision) {
        const baseLite = base
          .replace(/^body\s*\{[^}]*\}\s*$/gm, "")
          .replace(/^h1\s*,?\s*h2\s*,?\s*h3?\s*\{[^}]*\}\s*$/gm, "")
          .replace(/^\.font-heading\s*\{[^}]*\}\s*$/gm, "");
        plan.styleGuide.customCss = `${baseLite}\n\n/* ─── customCss IA inspiré vision du site de référence (PRIORITAIRE) ─── */\n${aiCss}`;
        console.log(`[generate-site] React+vision → baseLite (${baseLite.length}) + customCss IA (${aiCss.length}) = ${plan.styleGuide.customCss.length} chars`);
      } else {
        plan.styleGuide.customCss = `${base}\n\n/* ─── customCss IA ─── */\n${aiCss}`;
        console.log(`[generate-site] React → preset (${base.length}) + customCss IA (${aiCss.length}) = ${plan.styleGuide.customCss.length} chars`);
      }
    } else {
      plan.styleGuide.customCss = base;
      console.log(`[generate-site] React → preset seul (${base.length} chars) ${looksLikeWpCss ? "(customCss IA ignoré: ciblait .wp-*)" : "(customCss IA vide)"}`);
    }
  } else if (!plan.styleGuide.customCss || plan.styleGuide.customCss.trim().length < 50) {
    plan.styleGuide.customCss = getStylePreset(plan.styleGuide.designProfile);
    console.log(`[generate-site] customCss vide, injection preset pour profile="${plan.styleGuide.designProfile}"`);
  }

  // Enrichit le styleGuide avec les fonts du skill (si disponibles)
  if (designRecs?.typography.googleFontsUrl) {
    // Convertit l'URL "share" Google Fonts en URL CSS importable
    const headingFamily = designRecs.typography.headingFont?.replace(/\s+/g, "+");
    const bodyFamily = designRecs.typography.bodyFont?.replace(/\s+/g, "+");
    if (headingFamily && bodyFamily) {
      plan.styleGuide.googleFontsCssImport = `https://fonts.googleapis.com/css2?family=${headingFamily}:wght@400;500;600;700;800&family=${bodyFamily}:wght@300;400;500;600;700&display=swap`;
      plan.styleGuide.headingFont = designRecs.typography.headingFont!;
      plan.styleGuide.bodyFont = designRecs.typography.bodyFont!;
    }
  }

  // 1.ter MODE JSX LIBRE : si on a une analyse vision IA, on génère le code TSX du hero
  // directement par l'IA (au lieu d'utiliser HeroSplit/Hero du catalogue). Le composant
  // custom reproduit le layout exact du site de référence (centré, split, banner…).
  // Si la génération ou la validation échoue → fallback silencieux sur le composant standard.
  if (brief.framework === "react" && brief.referenceDesign?.visualAnalysis) {
    const indexPage = plan.pages.find((p) => p.path === "index.html");
    const heroSection = indexPage?.sections.find((s) =>
      ["hero", "hero_split", "hero_slider", "hero_blob"].includes(s.type),
    );
    if (heroSection && indexPage) {
      const d = heroSection.data as Record<string, unknown>;
      const contentHints = [
        d.title && `title: "${d.title}"`,
        d.subtitle && `subtitle: "${d.subtitle}"`,
        d.badge && `badge: "${d.badge}"`,
        d.ctaText && `ctaText: "${d.ctaText}" (href: ${d.ctaHref ?? "#contact"})`,
        d.ctaSecondaryText && `ctaSecondaryText: "${d.ctaSecondaryText}" (href: ${d.ctaSecondaryHref ?? "#features"})`,
        Array.isArray(d.stats) && d.stats.length > 0 && `stats: ${JSON.stringify(d.stats)}`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const custom = await generateCustomJsxSection({
          brief,
          vision: brief.referenceDesign.visualAnalysis,
          sectionType: "hero",
          componentName: "CustomHero",
          contentHints,
        });
        if (custom) {
          (heroSection.data as Record<string, unknown>).customJsx = {
            code: custom.code,
            componentName: custom.componentName,
          };
          console.log(`[generate-site] ✓ Hero custom JSX généré (${custom.code.length} chars) → ${custom.componentName}`);
        } else {
          console.log(`[generate-site] hero custom JSX échec → fallback composant catalogue`);
        }
      } catch (err) {
        console.error(`[generate-site] hero JSX gen exception:`, err);
      }
    }
  }

  // 2. Précharge toutes les images Unsplash en parallèle (1 appel API Unsplash par image unique)
  const imageMap = await preloadPageImages(plan.pages);

  // 2.bis. Render HTML pour chaque page (avec images préchargées)
  const renderedPages = plan.pages.map((p) => ({
    path: p.path,
    title: p.title,
    metaDescription: p.metaDescription,
    h1: p.h1,
    navLabel: p.navLabel,
    html: renderHtml(p, plan, brief, plan.pages, imageMap),
  }));

  // 2.bis. Si framework=react, génère aussi tous les fichiers projet (TSX, configs)
  // Les fichiers sont extraits sur disque, buildés, et servis via /preview/{slug}/
  let reactFiles: Record<string, string> | null = null;
  let previewUrl: string | null = null;
  const siteSlug = slugify(brief.brandName);

  if (brief.framework === "react") {
    const filesMap = await generateReactProject(
      plan.pages,
      {
        brandName: brief.brandName,
        logoUrl: brief.logoUrl,
        tagline: brief.tagline,
        primaryColor: brief.primaryColor,
        secondaryColor: brief.secondaryColor,
        lang: brief.lang,
        headingFont: plan.styleGuide.headingFont,
        bodyFont: plan.styleGuide.bodyFont,
        designProfile: plan.styleGuide.designProfile,
        customCss: plan.styleGuide.customCss,
      },
      plan.organizationSchema,
      siteSlug,
    );
    reactFiles = Object.fromEntries(filesMap);

    // ─── TEMPLATE OVERRIDE ────────────────────────────────────────
    // Si la vision IA recommande un profile SaaS moderne, on remplace pages/Home.tsx
    // par notre template original "saas-clean" (un seul fichier, layout cohérent,
    // contrôle visuel total). Le contenu vient du plan déjà généré (pas de 2e call IA).
    const visionProfile = brief.referenceDesign?.visualAnalysis?.matchedProfile;
    const useSaasClean =
      brief.framework === "react" &&
      (plan.styleGuide.designProfile === "tech-modern"
        || plan.styleGuide.designProfile === "trust-corporate"
        || visionProfile === "tech-modern"
        || visionProfile === "trust-corporate"
        || visionProfile === "minimal");
    if (useSaasClean) {
      const indexPage = plan.pages.find((p) => p.path === "index.html");
      if (indexPage) {
        const saasData = planToSaasCleanData(indexPage);
        if (saasData && saasData.bigFeatures.length > 0) {
          // Précharge les images du template — searchPhotos renvoie un tableau dans le
          // même ordre que les queries, on reconstruit le map par seed.
          const tplQueries = saasCleanImageQueries(saasData);
          const tplImageMap: Record<string, { url: string; alt: string }> = {};
          if (tplQueries.length > 0) {
            try {
              const photos = await searchPhotos(tplQueries);
              tplQueries.forEach((q, i) => {
                const p = photos[i];
                if (p) tplImageMap[q.seed] = { url: p.url, alt: p.alt };
              });
            } catch (err) {
              console.error("[generate-site] saas-clean image preload failed:", err);
            }
          }
          const homeTsx = saasCleanHomeTsx({ brief, data: saasData, imageMap: tplImageMap });
          reactFiles["src/pages/Home.tsx"] = homeTsx;
          console.log(`[generate-site] ✓ template saas-clean appliqué (Home.tsx override, ${homeTsx.length} chars, ${tplQueries.length} images)`);
        } else {
          console.log(`[generate-site] template saas-clean SKIP (plan insuffisant : ${saasData?.bigFeatures.length ?? 0} bigFeatures)`);
        }
      }
    }

    previewUrl = `https://wanapush.com/preview/${siteSlug}/`;

    // Extraction sur disque + build Vite EN ATTENDANT (waitForBuild=true).
    // Sinon un restart de Next.js entre la génération et la fin du build orphelinise
    // le child build (le dist sert l'ancienne version).
    const buildResult = await extractAndBuildSite(siteSlug, reactFiles, { waitForBuild: true });
    if (!buildResult.ok) {
      console.error(`[generate-site] build failed for ${siteSlug}: ${buildResult.error}`);

      // Filet de sécurité : si on avait des customJsx (mode vision JSX libre) et que le build
      // a cassé, on retire les customJsx et on régénère le projet + rebuild avec les composants
      // standards du catalogue. Au pire on perd la touche custom mais le site marche.
      const hadCustomJsx = plan.pages.some((p) =>
        p.sections.some((s) => (s.data as { customJsx?: unknown }).customJsx),
      );
      if (hadCustomJsx) {
        console.warn(`[generate-site] custom JSX présent → retry build sans customJsx (fallback catalogue)`);
        for (const p of plan.pages) {
          for (const s of p.sections) {
            delete (s.data as { customJsx?: unknown }).customJsx;
          }
        }
        const fallbackMap = await generateReactProject(
          plan.pages,
          {
            brandName: brief.brandName,
            logoUrl: brief.logoUrl,
            tagline: brief.tagline,
            primaryColor: brief.primaryColor,
            secondaryColor: brief.secondaryColor,
            lang: brief.lang,
            headingFont: plan.styleGuide.headingFont,
            bodyFont: plan.styleGuide.bodyFont,
            designProfile: plan.styleGuide.designProfile,
            customCss: plan.styleGuide.customCss,
          },
          plan.organizationSchema,
          siteSlug,
        );
        reactFiles = Object.fromEntries(fallbackMap);
        const retry = await extractAndBuildSite(siteSlug, reactFiles, { waitForBuild: true });
        if (retry.ok) {
          console.log(`[generate-site] ✓ retry sans customJsx réussi`);
        } else {
          console.error(`[generate-site] retry sans customJsx aussi échoué: ${retry.error}`);
        }
      }
    }
  }

  // 3. Sauvegarde en DB
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });

  const generated = await prisma.generatedSite.create({
    data: {
      userId: user.id,
      brief: brief as never,
      pages: renderedPages as never,
      meta: {
        pageCount: renderedPages.length,
        globalKeyword: plan.globalKeyword,
        totalBytes: renderedPages.reduce((s, p) => s + p.html.length, 0),
        framework: brief.framework,
        siteSlug: brief.framework === "react" ? siteSlug : null,
        previewUrl: previewUrl,
        reactFiles: reactFiles as never,
        designProfile: plan.styleGuide.designProfile ?? null,
        customCssLength: plan.styleGuide.customCss?.length ?? 0,
      } as never,
    },
  });

  revalidatePath("/generated-sites");
  return NextResponse.json({
    id: generated.id,
    pageCount: renderedPages.length,
    globalKeyword: plan.globalKeyword,
    framework: brief.framework,
    siteSlug: brief.framework === "react" ? siteSlug : null,
    previewUrl,
    reactFilesCount: reactFiles ? Object.keys(reactFiles).length : 0,
    designProfile: plan.styleGuide.designProfile ?? null,
    customCssLength: plan.styleGuide.customCss?.length ?? 0,
    skillRecommendations: designRecs
      ? {
          productType: designRecs.product.type,
          primaryStyle: designRecs.product.primaryStyle,
          landingPattern: designRecs.product.landingPattern,
          paletteName: designRecs.color.palette.notes,
          fontPairing: designRecs.typography.name,
          headingFont: designRecs.typography.headingFont,
          bodyFont: designRecs.typography.bodyFont,
        }
      : null,
    pages: renderedPages.map((p) => ({
      path: p.path,
      title: p.title,
      metaDescription: p.metaDescription,
      h1: p.h1,
      navLabel: p.navLabel,
      htmlPreview: p.html.slice(0, 200),
      bytes: p.html.length,
    })),
  });
}
