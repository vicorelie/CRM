import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type GeneratedPage = {
  path: string;
  title: string;
  html: string;
};

type Params = { params: { id: string; page?: string[] } };

/**
 * Route catch-all qui sert n'importe quelle page d'un site généré, avec un VRAI
 * path URL (compatible avec les liens HTML relatifs comme href="services.html").
 *
 * Ex : /api/generated-site/{id}/preview/services.html
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Non authentifié", { status: 401 });
  }

  const site = await prisma.generatedSite.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
  });
  if (!site) return new Response("Introuvable", { status: 404 });

  const pages = site.pages as unknown as GeneratedPage[];

  // params.page est un array (catch-all) ; vide → index.html
  const requestedPath = params.page?.join("/") || "index.html";
  // Normalise : "services" → "services.html"
  const normalizedPath = /\.[a-z0-9]{2,5}$/i.test(requestedPath)
    ? requestedPath
    : `${requestedPath}.html`;

  const page = pages.find((p) => p.path === normalizedPath);
  if (!page) {
    return new Response(
      `Page "${normalizedPath}" introuvable. Pages disponibles : ${pages.map((p) => p.path).join(", ")}`,
      { status: 404 },
    );
  }

  return new Response(page.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
