import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testWordpress, type WpCredentials } from "@/lib/connectors/wordpress";
import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: { id: string } };

async function ownedSite(sessionEmail: string, id: string) {
  return prisma.siteConnection.findFirst({
    where: { id, user: { email: sessionEmail } },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const site = await ownedSite(session.user.email, params.id);
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.siteConnection.delete({ where: { id: site.id } });
  revalidatePath("/sites");
  return NextResponse.json({ ok: true });
}

// POST /api/sites/[id] → relance le test de connexion (re-vérifier les creds)
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const site = await ownedSite(session.user.email, params.id);
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let result;
  if (site.platform === "WORDPRESS") {
    const creds = decryptJson<WpCredentials>(site.credentials);
    result = await testWordpress(creds);
  } else {
    return NextResponse.json(
      { error: `Plateforme non supportée : ${site.platform}` },
      { status: 400 },
    );
  }

  await prisma.siteConnection.update({
    where: { id: site.id },
    data: {
      status: result.ok ? "CONNECTED" : "FAILED",
      lastTestAt: new Date(),
      lastError: result.ok ? null : result.error,
      meta: result.ok
        ? { capabilities: result.capabilities, info: result.info }
        : site.meta ?? undefined,
    },
  });

  revalidatePath("/sites");
  return NextResponse.json({ result });
}
