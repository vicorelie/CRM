import { ModulePage } from "@/components/dashboard/ModulePage";

export default function GbpPage() {
  return (
    <ModulePage
      title="Google Business Profile"
      emoji="📍"
      description="Optimise ta fiche Google Maps : posts hebdo, réponses aux avis automatisées, suivi des appels et demandes d'itinéraire."
      roadmap={[
        "Connexion API Google Business Profile",
        "Audit complet de la fiche (photos, horaires, attributs, posts)",
        "Réponses IA aux avis (positifs et négatifs)",
        "Posts hebdomadaires programmés (offres, événements, actus)",
      ]}
    />
  );
}
