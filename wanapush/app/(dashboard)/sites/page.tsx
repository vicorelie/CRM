// Hub unifié pour les sites WanaPush (générés + connectés).
// Pattern 2026 Vercel/Linear : UNE liste, tabs pour filtrer par source.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SitesHub } from "./SitesHub";

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <SitesHub />;
}
