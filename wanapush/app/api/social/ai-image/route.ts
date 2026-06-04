// Génère une image via DALL-E 3 et la stocke localement dans /public/uploads.
// L'URL retournée par OpenAI étant temporaire (expire ~1h), on la télécharge.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

const inputSchema = z.object({
  prompt: z.string().min(3).max(1500),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional().default("1024x1024"),
  style: z.enum(["vivid", "natural"]).optional().default("vivid"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "OPENAI_API_KEY non définie" }, { status: 503 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }

  let imageUrl: string;
  let revisedPrompt: string | undefined;
  try {
    const r = await openai.images.generate({
      model: "dall-e-3",
      prompt: parsed.data.prompt,
      n: 1,
      size: parsed.data.size,
      style: parsed.data.style,
      quality: "standard",
    });
    imageUrl = r.data?.[0]?.url ?? "";
    revisedPrompt = r.data?.[0]?.revised_prompt;
    if (!imageUrl) throw new Error("Pas d'URL retournée par DALL-E");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur DALL-E" },
      { status: 502 },
    );
  }

  // Télécharge l'image (URL OpenAI expire vite) et la stocke localement
  const fileRes = await fetch(imageUrl);
  if (!fileRes.ok)
    return NextResponse.json(
      { error: "Téléchargement image OpenAI échoué" },
      { status: 502 },
    );

  const buf = Buffer.from(await fileRes.arrayBuffer());
  const userId = (session.user as { id?: string }).id ?? "anon";
  const slug = randomBytes(12).toString("hex");
  const filename = `${Date.now()}-ai-${slug}.png`;
  const subdir = path.join("public", "uploads", userId);
  const fullDir = path.join(process.cwd(), subdir);
  await mkdir(fullDir, { recursive: true });
  await writeFile(path.join(fullDir, filename), buf);

  const publicUrl = `${process.env.NEXTAUTH_URL?.replace(/\/$/, "")}/uploads/${userId}/${filename}`;
  return NextResponse.json({
    url: publicUrl,
    type: "image",
    revisedPrompt,
  });
}
