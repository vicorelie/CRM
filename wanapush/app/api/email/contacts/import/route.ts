// POST /api/email/contacts/import : bulk import depuis CSV ou array JSON.
// Body : { contacts: [{ email, firstName?, lastName?, tags?, attributes? }] }
//   OU : { csv: "email,firstName,lastName\n...,...,..." }
// + { source?: string, assumeConsent?: boolean }
//
// RGPD : assumeConsent=true exige que l'user atteste avoir collecté le consentement.
// Sinon les contacts sont créés en PENDING (à activer via double-opt-in séparé).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

const ContactSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const BodySchema = z.object({
  contacts: z.array(ContactSchema).max(10_000).optional(),
  csv: z.string().max(2_000_000).optional(),
  source: z.string().max(255).optional(),
  assumeConsent: z.boolean().optional(),
}).refine((d) => !!d.contacts || !!d.csv, { message: "contacts[] ou csv requis" });

/** Parse CSV simple : 1ère ligne = headers, séparateur virgule, support \"quotes\". */
function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = cols[j] ?? ""; });
    rows.push(row);
  }
  return rows;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  // Normalise les contacts (CSV ou array JSON)
  let contacts: z.infer<typeof ContactSchema>[] = parsed.data.contacts ?? [];
  if (parsed.data.csv) {
    const rows = parseCsv(parsed.data.csv);
    for (const r of rows) {
      const candidate = {
        email: (r.email ?? r.Email ?? "").toLowerCase().trim(),
        firstName: r.firstName ?? r.first_name ?? r.prenom,
        lastName: r.lastName ?? r.last_name ?? r.nom,
        tags: r.tags ? r.tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : undefined,
      };
      const v = ContactSchema.safeParse(candidate);
      if (v.success) contacts.push(v.data);
    }
  }

  if (contacts.length === 0) {
    return NextResponse.json({ error: "Aucun contact valide à importer" }, { status: 400 });
  }
  if (contacts.length > 10_000) {
    return NextResponse.json({ error: "Max 10 000 contacts par import" }, { status: 400 });
  }

  const status = parsed.data.assumeConsent ? "ACTIVE" : "PENDING";
  const source = parsed.data.source ?? `import:csv:${Date.now()}`;
  const now = new Date();

  // Dedup local : 1 seul record par email (Prisma upsert)
  let created = 0;
  let updated = 0;
  for (const c of contacts) {
    try {
      const r = await prisma.emailContact.upsert({
        where: { userId_email: { userId: user.id, email: c.email } },
        create: {
          userId: user.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          tags: c.tags ?? [],
          attributes: c.attributes ?? {},
          source,
          status,
          consentedAt: parsed.data.assumeConsent ? now : null,
        },
        update: {
          firstName: c.firstName ?? undefined,
          lastName: c.lastName ?? undefined,
          tags: c.tags ?? undefined,
        },
        select: { id: true, createdAt: true },
      });
      if (r.createdAt.getTime() >= now.getTime() - 5000) created++;
      else updated++;
    } catch {
      // skip invalid
    }
  }

  return NextResponse.json({ created, updated, total: contacts.length });
}
