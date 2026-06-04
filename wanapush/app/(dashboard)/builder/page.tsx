// Page Builder — page d'accueil du nouveau mode "compose ton site".
// L'utilisateur choisit explicitement : un header (hero variant), des sections (ordre + sélection),
// un mode light/dark, ses couleurs, son brief texte. L'IA fait UNIQUEMENT le copywriting.

import { Suspense } from "react";
import BuilderClient from "./BuilderClient";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Chargement du builder…</div>}>
      <BuilderClient />
    </Suspense>
  );
}
