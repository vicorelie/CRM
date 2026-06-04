import { ModulePage } from "@/components/dashboard/ModulePage";

export default function AnalyticsPage() {
  return (
    <ModulePage
      title="Analytics & reporting"
      emoji="📊"
      description="Vue unifiée de tous tes KPIs : trafic, conversions, ROAS, LTV, CAC. Rapports mensuels auto-générés en PDF."
      roadmap={[
        "Connexion GA4, Search Console, Meta Ads, Google Ads",
        "Dashboard unifié avec KPIs cross-canaux",
        "Rapports PDF mensuels générés et envoyés par email",
        "Alertes anomalies (chute trafic, hausse CAC, etc.)",
      ]}
    />
  );
}
