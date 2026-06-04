import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

// Sert le plugin WordPress sous forme de ZIP téléchargeable, prêt à être
// uploadé dans wp-admin → Extensions → Téléverser une extension.
export async function GET() {
  const root = join(process.cwd(), "wp-plugin", "wanapush-seo");
  const phpFile = readFileSync(join(root, "wanapush-seo.php"));
  const readme = readFileSync(join(root, "readme.txt"));

  const zip = new JSZip();
  // WordPress exige que les fichiers soient dans un dossier nommé comme le plugin.
  const folder = zip.folder("wanapush-seo");
  if (!folder) throw new Error("zip folder failed");
  folder.file("wanapush-seo.php", phpFile);
  folder.file("readme.txt", readme);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="wanapush-seo.zip"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
