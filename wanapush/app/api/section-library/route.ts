// Endpoint qui renvoie le catalogue complet des sections + leurs thumbnails SVG
// pré-rendus + le HTML d'insertion. Source de vérité unique :
//   - sections-catalog.ts → métadonnées (label, description, multiItem)
//   - SectionThumb.tsx → mockups visuels SVG
//   - sectionInsertHtml() → HTML statique inséré au runtime quand l'utilisateur
//     choisit ce layout dans le picker
//
// L'éditeur (site-editor.ts) consomme ce endpoint au moment d'ouvrir le picker
// de sections. Si un nouveau layout est ajouté au catalogue, il apparait
// automatiquement ici → propagé partout.

import { NextResponse } from "next/server";
import { createElement } from "react";
// Next.js bloque l'import direct de "react-dom/server" dans les routes ; on
// require dynamiquement la version Node pour bypass le SWC check.
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");
import { COMPONENT_REGISTRY } from "@/lib/sections-catalog";
import SectionThumb from "@/app/(dashboard)/builder/SectionThumb";
import { sectionInsertHtml } from "@/lib/section-insert-templates";

export const runtime = "nodejs";

// Cache la réponse pendant 1h (la lib bouge rarement). Le serveur n'a pas besoin
// d'auth : c'est juste le catalogue de templates publics.
export async function GET() {
  const items = COMPONENT_REGISTRY.map((meta) => {
    // Rend le SVG en string. Pas de theming (la card du picker est sur fond
    // sombre, donc on garde le rendu neutre slate).
    let thumbSvg = "";
    try {
      thumbSvg = renderToString(createElement(SectionThumb, { id: meta.id }));
    } catch (e) {
      console.warn("[section-library] thumb render failed for", meta.id, e);
    }
    return {
      id: meta.id,
      category: meta.category,
      label: meta.label,
      description: meta.description,
      multiItem: meta.multiItem,
      acceptsPhoto: meta.acceptsPhoto,
      thumbSvg,
      // HTML statique d'insertion (sample data). L'utilisateur édite ensuite.
      insertHtml: sectionInsertHtml(meta.id),
    };
  });
  return NextResponse.json({ items });
}
