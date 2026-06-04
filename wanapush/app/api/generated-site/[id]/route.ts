import JSZip from "jszip";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

type GeneratedPage = {
  path: string;
  title: string;
  html: string;
};

type Params = { params: { id: string } };

async function getOwned(email: string, id: string) {
  return prisma.generatedSite.findFirst({
    where: { id, user: { email } },
  });
}

// GET /api/generated-site/{id}?page=index.html&format=html  → preview HTML
// GET /api/generated-site/{id}?format=zip                   → download ZIP
// GET /api/generated-site/{id}                              → JSON metadata
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const site = await getOwned(session.user.email, params.id);
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const pages = site.pages as unknown as GeneratedPage[];
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const pageParam = url.searchParams.get("page");

  if (format === "html" && pageParam) {
    const page = pages.find((p) => p.path === pageParam);
    if (!page) return new Response("Page introuvable", { status: 404 });
    return new Response(page.html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (format === "zip") {
    const zip = new JSZip();

    // Si projet React généré : on packe le projet complet (Vite + TS + Tailwind)
    const meta = site.meta as { framework?: string; reactFiles?: Record<string, string> } | null;
    if (meta?.framework === "react" && meta.reactFiles) {
      for (const [filename, content] of Object.entries(meta.reactFiles)) {
        zip.file(filename, content);
      }
    } else {
      // Sinon : projet HTML statique simple
      for (const p of pages) {
        zip.file(p.path, p.html);
      }
      zip.file(
        "README.txt",
        `Site généré par WanaPush (https://wanapush.com)
Date : ${site.createdAt.toISOString()}

PAGES :
${pages.map((p) => `  - ${p.path} : ${p.title}`).join("\n")}

DÉPLOIEMENT :
1. Décompresser ce ZIP
2. Uploader tous les fichiers .html sur ton hébergement (FTP/SFTP) à la racine du domaine
3. C'est tout. Pas de base de données, pas de serveur PHP requis.

Pour brancher un formulaire de contact, voir les libs gratuites comme Formspree ou Web3Forms.

Brief original :
${JSON.stringify(site.brief, null, 2)}
`,
      );
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="wanapush-site-${params.id}.zip"`,
      },
    });
  }

  // Default: JSON metadata
  return NextResponse.json({
    id: site.id,
    createdAt: site.createdAt,
    brief: site.brief,
    meta: site.meta,
    pages: pages.map((p) => ({
      path: p.path,
      title: p.title,
      bytes: p.html.length,
    })),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const site = await getOwned(session.user.email, params.id);
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Récupère le slug depuis meta.siteSlug pour effacer aussi les fichiers
  // statiques servis par nginx sous /preview/{slug}/. Sans ça la page reste
  // accessible même après suppression en BDD.
  const meta = (site.meta ?? {}) as { siteSlug?: string };
  if (meta.siteSlug && /^[a-z0-9-]+$/i.test(meta.siteSlug)) {
    const siteDir = path.join(EXTRACTION_ROOT, meta.siteSlug);
    // Sécurité : vérifie qu'on reste bien dans le dossier d'extraction
    if (siteDir.startsWith(EXTRACTION_ROOT + path.sep)) {
      try {
        await rm(siteDir, { recursive: true, force: true });
      } catch (err) {
        console.error("[generated-site DELETE] rm failed:", err);
        // On continue : la BDD est nettoyée même si le rm échoue
      }
    }
  }

  await prisma.generatedSite.delete({ where: { id: site.id } });
  revalidatePath("/generated-sites");
  return NextResponse.json({ ok: true });
}
