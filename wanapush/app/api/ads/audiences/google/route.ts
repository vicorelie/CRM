// POST /api/ads/audiences/google
// Crée une Google Ads Custom Audience (CUSTOMER_LIST | WEBSITE_TRAFFIC)
// et persiste en DB avec le resource name retourné.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleAudience } from "@/lib/ads/google-audiences";

export const runtime = "nodejs";

const customerListSchema = z.object({
  type: z.literal("CUSTOMER_LIST"),
  adAccountId: z.string().min(3),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  config: z.object({
    emails: z.array(z.string().email()).min(1).max(5_000_000),
  }),
});

const websiteTrafficSchema = z.object({
  type: z.literal("WEBSITE_TRAFFIC"),
  adAccountId: z.string().min(3),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  config: z.object({
    membershipLifeSpan: z.number().int().min(1).max(540).default(30),
    conversionActionId: z.string().optional(),
    tagSnippetId: z.string().optional(),
  }),
});

const bodySchema = z.discriminatedUnion("type", [customerListSchema, websiteTrafficSchema]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });

  try {
    const result = await createGoogleAudience(user.id, parsed.data);
    revalidatePath("/ads");
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
