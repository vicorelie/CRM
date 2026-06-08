// Cron daily : sync tous les GbpAccount CONNECTED + publie les posts SCHEDULED.
//
// À schedule : `0 6 * * *` (6h UTC chaque jour)
// Auth : x-cron-secret ou ?secret= vs CRON_SECRET

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  syncGbpAccount,
  getValidAccessToken,
  createLocalPost,
} from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 600;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

async function tick() {
  // 1. Sync tous les GbpAccount CONNECTED (refresh locations + reviews)
  const accounts = await prisma.gbpAccount.findMany({
    where: { status: "CONNECTED" },
    select: { id: true },
    take: 200,
  });
  const syncResults: Array<Record<string, unknown>> = [];
  for (const a of accounts) {
    try {
      const r = await syncGbpAccount(a.id);
      syncResults.push({ accountId: a.id, ...r });
    } catch (e) {
      syncResults.push({ accountId: a.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // 2. Publie les posts SCHEDULED dont scheduledAt < now (max 50/run)
  const dueScheduled = await prisma.gbpPost.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    select: {
      id: true, topicType: true, summary: true, callToAction: true, eventDetails: true, imageUrl: true,
      location: {
        select: {
          id: true, googleLocationId: true,
          account: { select: { id: true, googleAccountId: true } },
        },
      },
    },
    take: 50,
  });
  let published = 0;
  let failed = 0;
  for (const post of dueScheduled) {
    try {
      const accessToken = await getValidAccessToken(post.location.account.id);
      const event = post.eventDetails as Record<string, unknown> | null;
      const ev = event
        ? {
            title: String(event.title ?? ""),
            schedule: {
              startDate: dateStrToObj(String(event.startDate ?? "")),
              endDate: dateStrToObj(String(event.endDate ?? "")),
            },
          }
        : undefined;
      const r = await createLocalPost(
        accessToken,
        post.location.account.googleAccountId,
        post.location.googleLocationId,
        {
          topicType: post.topicType as "STANDARD" | "EVENT" | "OFFER" | "ALERT",
          languageCode: "fr",
          summary: post.summary,
          callToAction: post.callToAction as never,
          event: ev,
          media: post.imageUrl ? [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrl }] : undefined,
        },
      );
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { googlePostId: r.name, status: "PUBLISHED", publishedAt: new Date(), errorMessage: null },
      });
      published++;
    } catch (e) {
      failed++;
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: "FAILED", errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 1000) },
      });
    }
  }

  return { accountsSynced: accounts.length, syncResults: syncResults.slice(0, 20), postsPublished: published, postsFailed: failed };
}

function dateStrToObj(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}
