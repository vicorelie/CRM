// Endpoint qui renvoie le catalogue des ÉLÉMENTS insérables + leurs
// thumbnails SVG pré-rendus + le HTML d'insertion. Pendant
// /api/section-library gère les blocs complets, celui-ci gère les
// briques individuelles : titres, textes, images, boutons, etc.
//
// Source de vérité unique :
//   - elements-catalog.ts → métadonnées
//   - ElementThumb.tsx → mockups SVG
//   - element-insert-templates.ts → HTML d'insertion

import { NextResponse } from "next/server";
import { createElement } from "react";
// Bypass du SWC check qui interdit l'import direct de react-dom/server.
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");
import { ELEMENT_REGISTRY, ELEMENT_CATEGORIES } from "@/lib/elements-catalog";
import ElementThumb from "@/app/(dashboard)/builder/ElementThumb";
import { elementInsertHtml } from "@/lib/element-insert-templates";

export const runtime = "nodejs";

export async function GET() {
  const items = ELEMENT_REGISTRY.map((meta) => {
    let thumbSvg = "";
    try {
      thumbSvg = renderToString(createElement(ElementThumb, { id: meta.id }));
    } catch (e) {
      console.warn("[element-library] thumb render failed for", meta.id, e);
    }
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      category: meta.category,
      thumbSvg,
      insertHtml: elementInsertHtml(meta.id),
    };
  });
  return NextResponse.json({
    items,
    categories: ELEMENT_CATEGORIES,
  });
}
