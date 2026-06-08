// /dashboard a été fusionné dans /cockpit (best practice 2026 : une seule home
// SaaS qui combine KPIs + accès aux modules). Redirect permanent.

import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/cockpit");
}
