import { ModulePage } from "@/components/dashboard/ModulePage";

export default function AsoPage() {
  return (
    <ModulePage
      title="ASO — App Store Optimization"
      emoji="📲"
      description="Optimisation App Store et Play Store : titres, mots-clés, screenshots, ratings. Pour booster les téléchargements organiques."
      roadmap={[
        "Audit ASO complet (titre, sous-titre, description, keywords)",
        "Recherche de mots-clés à fort trafic / faible difficulté",
        "Génération de variantes de screenshots par l'IA",
        "Suivi des positions et conversion store visit → install",
      ]}
    />
  );
}
