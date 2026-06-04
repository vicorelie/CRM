import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { discoverPages } from "@/lib/sitemap";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  rootUrl: z.string().trim().url(),
  maxPages: z.number().int().min(1).max(100).optional().default(30),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
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

  const pages = await discoverPages(parsed.data.rootUrl, parsed.data.maxPages);
  return NextResponse.json({
    rootUrl: parsed.data.rootUrl,
    count: pages.length,
    pages,
  });
}
