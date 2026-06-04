import { ModulePage } from "@/components/dashboard/ModulePage";

export default function EmailPage() {
  return (
    <ModulePage
      title="Email marketing"
      emoji="✉️"
      description="Newsletters, séquences automatisées, transactionnels. Délivrabilité optimisée et segmentation comportementale."
      roadmap={[
        "Éditeur de templates drag-and-drop",
        "Séquences automatisées (welcome, abandon panier, réactivation)",
        "Segmentation par comportement et tags",
        "A/B testing sujet/contenu + optimisation IA",
      ]}
    />
  );
}
