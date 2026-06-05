// CRUD ConversionActions Google Ads — débloque le smart bidding (TARGET_CPA,
// TARGET_ROAS) qui exige des données de conversion pour fonctionner.
//
// GET    /api/ads/accounts/[id]/conversions          → liste des ConversionActions
// POST   /api/ads/accounts/[id]/conversions          → crée + retourne snippet
// (les snippets sont à coller par l'utilisateur sur son site)
//
// Pour l'instant, supporte uniquement Google Ads (Meta a son flow CAPI via
// lib/capi qui est un autre paradigme).

import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureFreshAdAccount,
  getAdsConnector,
  toAdAccountInfo,
} from "@/lib/ads";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: { id: string } };

const PostBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    category: z.enum([
      "PURCHASE",
      "LEAD",
      "SIGN_UP",
      "BOOK_APPOINTMENT",
      "REQUEST_QUOTE",
      "GET_DIRECTIONS",
      "OUTBOUND_CLICK",
      "CONTACT",
      "PAGE_VIEW",
      "DEFAULT",
    ]),
    defaultValue: z.number().nonnegative().max(1_000_000).optional(),
    defaultCurrencyCode: z
      .string()
      .trim()
      .length(3)
      .toUpperCase()
      .optional(),
    alwaysUseDefaultValue: z.boolean().optional(),
    clickThroughLookbackWindowDays: z.number().int().min(1).max(90).optional(),
    viewThroughLookbackWindowDays: z.number().int().min(1).max(30).optional(),
  })
  .strict();

async function getOwnedAccount(userEmail: string, id: string) {
  const acc = await prisma.adAccount.findFirst({
    where: { id, user: { email: userEmail } },
  });
  return acc;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const acc = await getOwnedAccount(session.user.email, params.id);
  if (!acc) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (acc.platform !== "GOOGLE_ADS") {
    return NextResponse.json(
      { error: "Conversion tracking supporté uniquement pour Google Ads" },
      { status: 400 },
    );
  }

  const fresh = await ensureFreshAdAccount(acc);
  const conn = getAdsConnector(fresh.platform);
  if (!conn.listConversionActions) {
    return NextResponse.json(
      { error: "Connector ne supporte pas listConversionActions" },
      { status: 501 },
    );
  }

  try {
    const conversions = await conn.listConversionActions(toAdAccountInfo(fresh));
    return NextResponse.json({ conversions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur Google Ads" },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const acc = await getOwnedAccount(session.user.email, params.id);
  if (!acc) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (acc.platform !== "GOOGLE_ADS") {
    return NextResponse.json(
      { error: "Conversion tracking supporté uniquement pour Google Ads" },
      { status: 400 },
    );
  }

  const parsed = PostBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Données invalides",
        details: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  // Garde-fou TARGET_ROAS : si l'user veut bidder à la valeur, il doit ABSOLUMENT
  // fournir une defaultValue (sinon les conversions arrivent à 0€ et l'algo
  // n'apprend rien). On le tolère mais on warn.
  if (
    parsed.data.category === "PURCHASE" &&
    parsed.data.defaultValue === undefined
  ) {
    // pas bloquant, juste indiqué dans la réponse
  }

  const fresh = await ensureFreshAdAccount(acc);
  const conn = getAdsConnector(fresh.platform);
  if (!conn.createConversionAction) {
    return NextResponse.json(
      { error: "Connector ne supporte pas createConversionAction" },
      { status: 501 },
    );
  }

  try {
    const conversion = await conn.createConversionAction(
      toAdAccountInfo(fresh),
      parsed.data,
    );
    revalidatePath(`/ads`);
    revalidatePath(`/ads/accounts/${params.id}/conversions`);
    return NextResponse.json({ conversion });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur création conversion" },
      { status: 502 },
    );
  }
}
