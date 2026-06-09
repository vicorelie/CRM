// /generated-sites a été fusionné dans /sites (hub avec tabs Générés | Connectés).
// Best practice 2026 : un seul URL pour une même entité (Vercel/Linear).
//
// Note : les sous-routes /generated-sites/[id]/* (pixel, etc.) restent
// inchangées — seule la page racine redirige.

import { redirect } from "next/navigation";

export default function GeneratedSitesPage() {
  redirect("/sites");
}
