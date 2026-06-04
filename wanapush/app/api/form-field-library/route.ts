// Endpoint qui renvoie le catalogue des CHAMPS DE FORMULAIRE + thumbnails
// SVG + HTML d'insertion. Consommé par l'éditeur quand l'utilisateur clique
// "+" sur un input/textarea ou dans un <form>.

import { NextResponse } from "next/server";
import { createElement } from "react";
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");
import { FORM_FIELD_REGISTRY, FORM_FIELD_CATEGORIES } from "@/lib/form-fields-catalog";
import FormFieldThumb from "@/app/(dashboard)/builder/FormFieldThumb";
import { formFieldInsertHtml } from "@/lib/form-field-insert-templates";

export const runtime = "nodejs";

export async function GET() {
  const items = FORM_FIELD_REGISTRY.map((meta) => {
    let thumbSvg = "";
    try {
      thumbSvg = renderToString(createElement(FormFieldThumb, { id: meta.id }));
    } catch (e) {
      console.warn("[form-field-library] thumb render failed for", meta.id, e);
    }
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      category: meta.category,
      thumbSvg,
      insertHtml: formFieldInsertHtml(meta.id),
    };
  });
  return NextResponse.json({
    items,
    categories: FORM_FIELD_CATEGORIES,
  });
}
