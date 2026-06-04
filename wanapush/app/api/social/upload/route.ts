// Upload de médias depuis le Composer. Stocke localement dans /public/uploads/
// pour que Meta/LinkedIn/etc. puissent les télécharger via une URL publique.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  if (!ALLOWED.has(file.type))
    return NextResponse.json(
      { error: `Type non supporté : ${file.type}` },
      { status: 400 },
    );
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: `Fichier trop gros (${Math.round(file.size / 1024 / 1024)}MB, max 100MB)` },
      { status: 400 },
    );

  const ext = path.extname(file.name) || (file.type.startsWith("video") ? ".mp4" : ".jpg");
  const slug = randomBytes(12).toString("hex");
  const userId = (session.user as { id?: string }).id ?? "anon";
  const subdir = path.join("public", "uploads", userId);
  const filename = `${Date.now()}-${slug}${ext.toLowerCase()}`;
  const fullDir = path.join(process.cwd(), subdir);
  await mkdir(fullDir, { recursive: true });
  const fullPath = path.join(fullDir, filename);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  // L'URL publique inclut le basePath /wanapush
  const publicUrl = `${process.env.NEXTAUTH_URL?.replace(/\/$/, "")}/uploads/${userId}/${filename}`;
  return NextResponse.json({
    url: publicUrl,
    type: file.type.startsWith("video") ? "video" : "image",
    size: file.size,
    name: file.name,
  });
}
