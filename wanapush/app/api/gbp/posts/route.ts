// GET  /api/gbp/posts : liste les posts DB du user
// POST /api/gbp/posts : créer + publier un local post (ou programmer)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, createLocalPost } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 120;

const CreateSchema = z.object({
  locationId: z.string().min(1),
  topicType: z.enum(["STANDARD", "EVENT", "OFFER", "ALERT"]).default("STANDARD"),
  summary: z.string().min(1).max(1500),
  callToAction: z.object({
    actionType: z.enum(["LEARN_MORE", "CALL", "ORDER", "BOOK", "SHOP", "SIGN_UP"]),
    url: z.string().url().optional(),
  }).optional(),
  imageUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
  /** EVENT/OFFER only */
  event: z.object({
    title: z.string().min(1).max(255),
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(),
  }).optional(),
});

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const posts = await prisma.gbpPost.findMany({
    where: { location: { account: { userId } } },
    select: {
      id: true, topicType: true, summary: true, status: true, scheduledAt: true,
      publishedAt: true, imageUrl: true, errorMessage: true,
      location: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const location = await prisma.gbpLocation.findFirst({
    where: { id: data.locationId, account: { userId } },
    select: { id: true, googleLocationId: true, account: { select: { id: true, googleAccountId: true } } },
  });
  if (!location) return NextResponse.json({ error: "Location introuvable ou non autorisée" }, { status: 404 });

  // Si scheduledAt fourni → enregistrer en SCHEDULED (cron publiera plus tard)
  if (data.scheduledAt && new Date(data.scheduledAt) > new Date()) {
    const post = await prisma.gbpPost.create({
      data: {
        locationId: location.id,
        topicType: data.topicType,
        summary: data.summary,
        callToAction: data.callToAction ?? undefined,
        eventDetails: data.event ?? undefined,
        imageUrl: data.imageUrl,
        status: "SCHEDULED",
        scheduledAt: new Date(data.scheduledAt),
      },
    });
    return NextResponse.json({ post: { id: post.id, status: post.status } });
  }

  // Publication immédiate
  try {
    const accessToken = await getValidAccessToken(location.account.id);
    const eventInput = data.event
      ? {
          title: data.event.title,
          schedule: {
            startDate: dateStrToObj(data.event.startDate),
            endDate: dateStrToObj(data.event.endDate),
          },
        }
      : undefined;
    const result = await createLocalPost(
      accessToken,
      location.account.googleAccountId,
      location.googleLocationId,
      {
        topicType: data.topicType,
        languageCode: "fr",
        summary: data.summary,
        callToAction: data.callToAction,
        event: eventInput,
        media: data.imageUrl ? [{ mediaFormat: "PHOTO", sourceUrl: data.imageUrl }] : undefined,
      },
    );
    const post = await prisma.gbpPost.create({
      data: {
        locationId: location.id,
        googlePostId: result.name,
        topicType: data.topicType,
        summary: data.summary,
        callToAction: data.callToAction ?? undefined,
        eventDetails: data.event ?? undefined,
        imageUrl: data.imageUrl,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    return NextResponse.json({ post: { id: post.id, googlePostId: post.googlePostId, status: "PUBLISHED" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

function dateStrToObj(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}
