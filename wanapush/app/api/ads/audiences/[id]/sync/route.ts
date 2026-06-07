// POST /api/ads/audiences/[id]/sync
// Rafraîchit le statut et la taille estimée d'une audience depuis sa plateforme.
// Supporte : META_ADS, GOOGLE_ADS.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMetaAudienceStatus } from "@/lib/ads/meta-audiences";
import { syncGoogleAudienceStatus } from "@/lib/ads/google-audiences";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const audience = await prisma.adAudience.findUnique({
    where: { id: params.id },
    select: { id: true, platform: true, user: { select: { email: true } } },
  });
  if (!audience)
    return NextResponse.json({ error: "Audience introuvable" }, { status: 404 });
  if (audience.user.email !== session.user.email)
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    let result: { metaStatus: string; estimatedSize: number | null };

    if (audience.platform === "META_ADS") {
      result = await syncMetaAudienceStatus(params.id);
    } else if (audience.platform === "GOOGLE_ADS") {
      result = await syncGoogleAudienceStatus(params.id);
    } else {
      return NextResponse.json({ error: "Sync non supporté pour cette plateforme" }, { status: 400 });
    }

    revalidatePath("/ads");
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
