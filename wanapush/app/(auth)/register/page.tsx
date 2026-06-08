"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Erreur d'inscription");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      if (signInRes?.error) {
        setError("Compte créé mais connexion impossible. Réessayez.");
        setLoading(false);
        return;
      }

      router.push("/cockpit");
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Logo height={36} />

        <div className="my-auto w-full space-y-8 py-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
              Créer un compte
            </h1>
            <p className="text-sm text-zinc-500">
              Démarrez avec WanaPush en quelques secondes.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <Field
              id="name"
              name="name"
              type="text"
              label="Nom"
              autoComplete="name"
              placeholder="Jean Dupont"
              required
            />
            <Field
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              required
            />
            <Field
              id="password"
              name="password"
              type="password"
              label="Mot de passe"
              autoComplete="new-password"
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>

          <div className="text-sm text-zinc-500">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
      />
    </div>
  );
}
