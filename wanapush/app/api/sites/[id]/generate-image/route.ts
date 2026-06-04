// Génération d'image IA depuis le WYSIWYG editor (/preview/{slug}/?edit=1).
// Appelle DALL·E 3, télécharge le résultat dans public/uploads/sites/{slug}/.
// Pas d'auth (cookie NextAuth ne traverse pas /preview/), garde-fous : slug
// valide, prompt borné, fichier final identique au flux upload.
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

const inputSchema = z.object({
  prompt: z.string().min(3).max(1500),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).optional().default("1024x1024"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
  }
  try {
    await access(path.join(EXTRACTION_ROOT, slug));
  } catch {
    return NextResponse.json({ error: `Site introuvable: ${slug}` }, { status: 404 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY non définie" }, { status: 503 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  let buf: Buffer;
  try {
    const r = await openai.images.generate({
      model,
      prompt: parsed.data.prompt,
      n: 1,
      size: parsed.data.size,
    });
    const first = r.data?.[0];
    if (first?.b64_json) {
      buf = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const fileRes = await fetch(first.url);
      if (!fileRes.ok) throw new Error("Téléchargement image échoué");
      buf = Buffer.from(await fileRes.arrayBuffer());
    } else {
      throw new Error("Pas d'image retournée");
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur génération" },
      { status: 502 },
    );
  }

  const filename = `${Date.now()}-ai-${randomBytes(8).toString("hex")}.png`;
  const subdir = path.join("public", "uploads", "sites", slug);
  const fullDir = path.join(process.cwd(), subdir);
  await mkdir(fullDir, { recursive: true });
  await writeFile(path.join(fullDir, filename), buf);

  const publicUrl = `/uploads/sites/${slug}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
