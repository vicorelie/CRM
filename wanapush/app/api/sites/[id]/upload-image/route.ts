// Upload d'image depuis le WYSIWYG editor (/preview/{slug}/?edit=1).
// Sauvegarde dans public/uploads/sites/{slug}/ et renvoie l'URL publique.
// Pas d'auth (le cookie NextAuth ne traverse pas /preview/), garde-fous : slug
// valide, type/taille restreints.
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB pour des images web
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
  }

  // Vérifie que le site existe avant d'accepter l'upload
  try {
    await access(path.join(EXTRACTION_ROOT, slug));
  } catch {
    return NextResponse.json({ error: `Site introuvable: ${slug}` }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Type non supporté : ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image trop grosse (${Math.round(file.size / 1024 / 1024)}MB, max 10MB)` },
      { status: 400 },
    );
  }

  const extByType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  };
  const ext = extByType[file.type] || path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;

  const subdir = path.join("public", "uploads", "sites", slug);
  const fullDir = path.join(process.cwd(), subdir);
  await mkdir(fullDir, { recursive: true });
  const fullPath = path.join(fullDir, filename);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  // URL servie par Next sous /uploads/sites/{slug}/...
  const publicUrl = `/uploads/sites/${slug}/${filename}`;
  return NextResponse.json({ url: publicUrl, size: file.size, type: file.type });
}
