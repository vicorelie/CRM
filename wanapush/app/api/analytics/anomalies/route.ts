// GET /api/analytics/anomalies
// Liste les anomalies détectées (chutes ROAS, lead inflow, spike spend Ads).
// Algorithme : écart-type sur 30j glissants, seuils ±1.5σ (INFO), ±2σ (WARNING), ±3σ (CRITICAL).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectAnomalies } from "@/lib/analytics/anomalies";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  try {
    const anomalies = await detectAnomalies(user.id);
    return NextResponse.json({ anomalies, count: anomalies.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
