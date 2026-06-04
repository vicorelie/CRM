import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // En build/dev sans clé, on log un warning sans bloquer l'import.
  // Les routes qui utilisent Stripe doivent vérifier la présence de la clé.
  // eslint-disable-next-line no-console
  console.warn("[stripe] STRIPE_SECRET_KEY non définie");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});
