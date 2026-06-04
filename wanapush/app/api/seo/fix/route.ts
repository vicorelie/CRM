import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { applyFixSftp, type SftpCredentials } from "@/lib/connectors/sftp";
import { resolveSftpFilePath } from "@/lib/connectors/sftp-paths";
import {
  applyFix,
  findPageByUrl,
  testWordpress,
  type WpCredentials,
} from "@/lib/connectors/wordpress";
import { decryptJson } from "@/lib/crypto";
import { applyDesignToHtml, scanPageDesign } from "@/lib/design-scanner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  siteId: z.string().min(1),
  pageUrl: z.string().url(),
  fixId: z.enum([
    "update-title",
    "update-meta-description",
    "add-canonical",
    "add-og-tags",
    "fix-image-alts",
    "fix-h1",
    "add-schema-article",
    "add-schema-faq",
    "enrich-content",
    "rewrite-content",
    "regenerate-content",
  ]),
  data: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const site = await prisma.siteConnection.findFirst({
    where: { id: parsed.data.siteId, user: { email: session.user.email } },
  });
  if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });

  // Pour enrich-content : scan le design existant de la page et applique les
  // mêmes classes CSS sur le HTML enrichi (cohérence visuelle Bootstrap/Tailwind/Elementor/etc.)
  let designInfo: Awaited<ReturnType<typeof scanPageDesign>> | null = null;
  if (parsed.data.fixId === "enrich-content" && parsed.data.data.html) {
    designInfo = await scanPageDesign(parsed.data.pageUrl);
    if (designInfo.hasDesignSignals) {
      parsed.data.data.html = applyDesignToHtml(parsed.data.data.html, designInfo);
    }
  }

  if (site.platform === "WORDPRESS") {
    const creds = decryptJson<WpCredentials>(site.credentials);

    const test = await testWordpress(creds);
    if (!test.ok || !test.capabilities) {
      return NextResponse.json(
        { error: `Connexion au site impossible : ${test.error ?? "?"}` },
        { status: 502 },
      );
    }
    const seoPlugin = test.capabilities.seoPlugin;

    const storedMeta = (site.meta as { capabilities?: { seoPlugin?: string } } | null) ?? {};
    if (storedMeta.capabilities?.seoPlugin !== seoPlugin) {
      await prisma.siteConnection.update({
        where: { id: site.id },
        data: {
          meta: { capabilities: test.capabilities, info: test.info },
          lastTestAt: new Date(),
        },
      });
    }

    const target = await findPageByUrl(creds, parsed.data.pageUrl);
    if (!target) {
      return NextResponse.json(
        {
          error: `Impossible de trouver la page "${parsed.data.pageUrl}" dans WordPress`,
        },
        { status: 404 },
      );
    }

    const result = await applyFix(
      creds,
      { fixId: parsed.data.fixId, pageId: target.id, data: parsed.data.data },
      seoPlugin,
      target.type,
    );

    revalidatePath("/seo");
    revalidatePath(`/seo/${site.id}`);
    return NextResponse.json({
      ...result,
      target: { id: target.id, type: target.type, link: target.link },
      seoPlugin,
      designInfo,
    });
  }

  if (site.platform === "SFTP_HTML") {
    const creds = decryptJson<SftpCredentials>(site.credentials);
    const filePath = resolveSftpFilePath({
      siteUrl: site.url,
      pageUrl: parsed.data.pageUrl,
      rootPath: creds.rootPath,
    });

    const result = await applyFixSftp(creds, {
      fixId: parsed.data.fixId,
      pageId: filePath,
      data: parsed.data.data,
    });

    revalidatePath("/seo");
    revalidatePath(`/seo/${site.id}`);
    return NextResponse.json({ ...result, filePath, designInfo });
  }

  return NextResponse.json(
    { error: `Plateforme non supportée : ${site.platform}` },
    { status: 400 },
  );
}
