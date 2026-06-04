// Génère des hashtags pertinents par plateforme à partir d'un brief/caption.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  brief: z.string().min(3).max(2000),
  platforms: z
    .array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TIKTOK"]))
    .optional(),
  count: z.number().int().min(1).max(30).optional().default(15),
  lang: z.string().optional().default("fr"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );

  const platforms = parsed.data.platforms?.length
    ? parsed.data.platforms.join(", ")
    : "Instagram, TikTok, LinkedIn";

  const prompt = `Génère ${parsed.data.count} hashtags pertinents en ${parsed.data.lang} pour des posts réseaux sociaux ciblant : ${platforms}.

Sujet / brief :
${parsed.data.brief}

Règles strictes :
- Mix entre hashtags larges (haute concurrence) et niches (plus ciblés)
- Pas de hashtags génériques inutiles (ex: #insta, #love)
- Pas d'espaces ni de caractères spéciaux
- En CamelCase ou lowercase selon convention plateforme
- Réponds UNIQUEMENT en JSON strict :

{ "hashtags": ["#hashtag1", "#hashtag2", ...] }`;

  const result = await askWanapush(prompt);
  if (!result) return NextResponse.json({ error: "IA indisponible" }, { status: 503 });

  const m = result.text.match(/\{[\s\S]*"hashtags"[\s\S]*\}/);
  if (!m) {
    // Fallback : extraire à la main
    const tags = (result.text.match(/#[A-Za-z0-9_]+/g) ?? []).slice(0, parsed.data.count);
    return NextResponse.json({ hashtags: tags });
  }
  try {
    const j = JSON.parse(m[0]);
    return NextResponse.json({ hashtags: (j.hashtags ?? []) as string[] });
  } catch {
    const tags = (result.text.match(/#[A-Za-z0-9_]+/g) ?? []).slice(0, parsed.data.count);
    return NextResponse.json({ hashtags: tags });
  }
}
