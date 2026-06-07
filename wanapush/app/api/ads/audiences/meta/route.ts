// POST /api/ads/audiences/meta
// Crée une Meta Custom Audience (WEBSITE_TRAFFIC | CUSTOMER_LIST | LOOKALIKE)
// et persiste en DB avec l'externalId retourné par Meta.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMetaAudience } from "@/lib/ads/meta-audiences";

export const runtime = "nodejs";

const websiteTrafficSchema = z.object({
  type: z.literal("WEBSITE_TRAFFIC"),
  adAccountId: z.string().min(3),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  config: z.object({
    pixelId: z.string().min(1),
    retentionDays: z.number().int().min(1).max(180),
    rules: z
      .array(
        z.object({
          event: z.string().min(1),
          urlFilter: z.string().optional(),
        }),
      )
      .max(10)
      .optional(),
  }),
});

const customerListSchema = z.object({
  type: z.literal("CUSTOMER_LIST"),
  adAccountId: z.string().min(3),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  config: z.object({
    emails: z.array(z.string().email()).min(1).max(5_000_000),
  }),
});

const lookalikeSchema = z.object({
  type: z.literal("LOOKALIKE"),
  adAccountId: z.string().min(3),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  config: z.object({
    sourceAudienceId: z.string().min(1),
    country: z.string().length(2),
    ratio: z.number().min(0.01).max(0.2),
  }),
});

const bodySchema = z.discriminatedUnion("type", [
  websiteTrafficSchema,
  customerListSchema,
  lookalikeSchema,
]);

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
    const result = await createMetaAudience(user.id, parsed.data);
    revalidatePath("/ads");
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
