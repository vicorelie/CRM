---
name: wanapush-stack-best-practices
description: >
  Utilise cette skill pour TOUT travail de code sur WanaPush qui touche au stack
  technique : conventions React 18 + Next.js 14 (App Router, Server Components,
  Server Actions, Suspense, revalidate), TypeScript strict (satisfies, const
  generics, z.infer), Prisma 6 (binary engine, select, transactions), Tailwind 3,
  performance (INP, bundle size), sécurité 2026 (CSP, OWASP). Déclencher quand
  on ajoute un composant, une route API, un model Prisma, un refacto perf, un
  upgrade de dépendance, ou conseil sur les patterns à favoriser/éviter.
license: proprietary
version: 1.0
last_reviewed: 2026-06-03
---

# SKILL — WanaPush Stack Best Practices (juin 2026)

> **Skill transversal** appliqué à TOUTE modification de code WanaPush.
> Documente les conventions, patterns recommandés et anti-patterns du stack
> actuel + roadmap d'upgrade vers React 19 / Next.js 15.

## 🧭 Quand l'invoquer

- Nouveau composant React (Server ou Client)
- Nouvelle route API ou Server Action
- Nouveau model Prisma ou query DB
- Refacto perf (INP, LCP, bundle)
- Upgrade de dépendance (Next, React, Prisma, etc.)
- Question « quel pattern utiliser pour X »
- Code review d'une PR

## 📦 Stack actuel WanaPush (verified juin 2026)

| Dépendance | Version | Notes |
|---|---|---|
| `next` | **14.2.35** | App Router. PPR experimental seulement (stable en v15). |
| `react` | **^18** | Concurrent features stables : `startTransition`, `useTransition`, `useDeferredValue`, `Suspense`. Pas encore `use()` ni `useFormState` (v19). |
| `react-dom` | **^18** | |
| `typescript` | **^5** | strict mode ON. `satisfies`, const generics OK. |
| `@prisma/client` | **6.19.3** | **`engineType = "binary"`** OBLIGATOIRE (sinon erreur "Using engine type 'client' requires either 'adapter' or 'accelerateUrl'"). |
| `prisma` | **6.19.3** | NE PAS upgrade vers v7 sans plan de migration. |
| `next-auth` | **4.24.14** | v4 (pas Auth.js v5). JWT strategy. |
| `zod` | **^4.4.3** | v4 (récent — API stable). |
| `tailwindcss` | **3.4.1** | v3 (pas v4 qui est encore très récent). |
| `@anthropic-ai/sdk` | **0.92.0** | Claude API client. Modèles : Opus 4.7, Sonnet 4.6, Haiku 4.5. |
| MariaDB | local | shadow DB `wanapush_shadow` pour `prisma migrate dev`. |

## ⚛️ React 18 — Patterns 2026 (applicables MAINTENANT)

### Concurrent rendering (déjà dispo, à utiliser)

```tsx
// Marquer une mise à jour comme non-critique → React peut l'interrompre
// si l'user interagit pendant le rendu
import { useTransition } from "react";

function SearchResults({ query }: { query: string }) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Item[]>([]);

  function handleQuery(q: string) {
    startTransition(() => {
      setResults(heavyFilter(q)); // ← React peut interrompre ça
    });
  }
  return <div data-pending={isPending}>{...}</div>;
}
```

**Quand l'utiliser** : tout state update qui déclenche un re-render lourd
(filtre, tri, dataviz). C'est le **fix #1 INP** sur les sites WanaPush
(cf `SKILL_wanapush_seo_module.md`).

### Suspense + Streaming (Next.js App Router)

**Règle d'or** : **plusieurs petites boundaries** > une seule grosse.

```tsx
// ❌ ANTI-PATTERN — toute la page attend la donnée la plus lente
<Suspense fallback={<PageSkeleton />}>
  <Dashboard /> {/* contient 3 fetches : User, Stats, Notifications */}
</Suspense>

// ✅ PATTERN — chaque section streame indépendamment
<Dashboard>
  <Suspense fallback={<UserSkeleton />}><User /></Suspense>
  <Suspense fallback={<StatsSkeleton />}><Stats /></Suspense>
  <Suspense fallback={<NotifSkeleton />}><Notifications /></Suspense>
</Dashboard>
```

**Gain** : la page paraît instantanée. Le total wait = max des 3 fetches,
pas la somme.

### Parallel data fetching

```ts
// ❌ Séquentiel (waterfall — chaque fetch attend le précédent)
const user = await getUser();
const stats = await getStats();
const notifs = await getNotifs();

// ✅ Parallèle (3 en même temps)
const [user, stats, notifs] = await Promise.all([
  getUser(),
  getStats(),
  getNotifs(),
]);
```

### useDeferredValue pour les inputs

```tsx
function SearchBox({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  // <Results> rend avec deferredQuery, qui peut "lag" pendant que l'user tape
  return <Results query={deferredQuery} />;
}
```

## 🚀 Next.js 14 App Router — Patterns 2026

### Server vs Client Components

**Server Component par défaut** (pas de `"use client"`). Avantages :
- Pas dans le bundle JS client (réduit INP)
- Accès direct à `prisma`, `process.env`, libs Node
- Streaming natif

**`"use client"` seulement quand** :
- `useState`, `useEffect`, `useRouter`
- Event handlers (`onClick`, `onChange`)
- Hooks de browser (`navigator`, `window`)

```tsx
// ✅ Server Component (par défaut)
async function DashboardPage() {
  const campaigns = await prisma.campaign.findMany();
  return <CampaignsList campaigns={campaigns} />;
}

// ✅ Client Component (uniquement le bouton interactif)
"use client";
export function FilterButton({ onFilter }: Props) {
  return <button onClick={() => onFilter("active")}>Active</button>;
}
```

### Server Actions vs Route Handlers

Choix simple :
- **Server Actions** (`"use server"`) : muter via un formulaire ou un bouton
  dans un Server Component → pas d'endpoint à exposer, sécurité intégrée
- **Route Handlers** (`/app/api/.../route.ts`) : besoin d'un endpoint réel
  (webhooks, cron, intégration externe, fetch côté client)

```ts
// Server Action — invocation directe depuis un form
async function createCampaign(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  await prisma.campaign.create({ data: { name } });
  revalidatePath("/ads");
}
```

### Caching & revalidation

```ts
// Fetch avec cache (défaut)
const data = await fetch(url); // cached forever

// Fetch sans cache (chaque requête)
const data = await fetch(url, { cache: "no-store" });

// Fetch revalidé toutes les heures
const data = await fetch(url, { next: { revalidate: 3600 } });

// Invalidation à la demande (dans Server Action)
revalidatePath("/ads");           // recharge cette page
revalidateTag("campaigns");        // invalide toutes les fetch tagged
```

### Loading + Error conventions

Chaque segment d'App Router peut avoir :
- `loading.tsx` → fallback Suspense automatique
- `error.tsx` → boundary d'erreur automatique (Client Component obligatoire)
- `not-found.tsx` → 404 custom

**WanaPush convention** : utiliser `loading.tsx` pour la page complète mais
ajouter des `<Suspense>` granulaires DANS la page pour le streaming progressif.

### Partial Prerendering (PPR) — EXPERIMENTAL en v14

⚠️ PPR n'est **stable qu'en Next.js 15**. En 14.2.35 c'est experimental
(`experimental.ppr: true`). **Ne pas l'activer en prod** tant qu'on n'upgrade
pas vers v15.

## 🧬 TypeScript strict — Patterns 2026

### `satisfies` (mieux que `as`)

```ts
// ❌ as — désactive la vérif de type
const config = { theme: "dark" } as Config;

// ✅ satisfies — garde l'inférence ET valide
const config = { theme: "dark" } satisfies Config;
//      ↑ type inféré { theme: "dark" } (pas Config), mais vérifié contre Config
```

### const generics + assertions

```ts
const SECTORS = ["plumber", "moving", "salon"] as const;
type Sector = (typeof SECTORS)[number]; // "plumber" | "moving" | "salon"
```

### z.infer comme source de vérité

```ts
const briefSchema = z.object({
  name: z.string(),
  sector: z.enum(["plumber", "moving"]),
});

// ✅ UN type, dérivé de la validation runtime
type Brief = z.infer<typeof briefSchema>;

// ❌ NE PAS dupliquer manuellement le type
type Brief2 = { name: string; sector: "plumber" | "moving" }; // drift garanti
```

### Discriminated unions pour les retours d'API

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// L'appelant doit gérer les 2 cas (TS l'oblige)
const r = await fetchSomething();
if (r.ok) {
  console.log(r.data); // ← TS sait que data existe
} else {
  console.error(r.error);
}
```

## 🗄️ Prisma 6 — Patterns WanaPush

### `engineType = "binary"` obligatoire

```prisma
generator client {
  provider     = "prisma-client-js"
  engineType   = "binary"  // ← OBLIGATOIRE
}
```

Sans ça : erreur `PrismaClientConstructorValidationError: Using engine type
"client" requires either "adapter" or "accelerateUrl"`. Le mode `client` (défaut
Prisma 7) exige un adapter MySQL/Postgres explicite — incompatible avec le
pattern Next.js classique.

### Select-only (réduire les données transférées)

```ts
// ❌ Récupère TOUS les champs (y compris accessToken chiffré)
const accounts = await prisma.adAccount.findMany();

// ✅ Récupère uniquement ce qu'on affiche
const accounts = await prisma.adAccount.findMany({
  select: { id: true, name: true, currency: true, status: true },
});
```

### Atomic operations via `$transaction`

```ts
// ✅ Tout ou rien — pas d'état incohérent
await prisma.$transaction([
  prisma.campaign.update({ where: { id }, data: { status: "PAUSED" } }),
  prisma.auditLog.create({ data: { action: "PAUSE", campaignId: id } }),
]);
```

### Singleton pattern

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Évite la prolifération de connexions en dev (HMR de Next.js).

## 🔒 Sécurité 2026

### Validation systématique des inputs

```ts
// ✅ Toujours valider avec Zod, MÊME si l'UI valide déjà
const inputSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive().max(10000),
});

export async function POST(req: Request) {
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  // ...
}
```

### Tokens chiffrés au repos

Tokens OAuth, secrets API, capiAccessToken → **TOUJOURS** chiffrés AES-256-GCM
via `lib/crypto.ts`. Clé dans `ENCRYPTION_KEY` (base64).

### NEVER expose secrets dans les responses

```ts
// ❌ Renvoie l'accessToken au client
return NextResponse.json({ adAccount });

// ✅ Renvoie un subset safe
return NextResponse.json({
  adAccount: { id: adAccount.id, name: adAccount.name, status: adAccount.status },
});
```

### CSP + headers de sécurité (TODO si pas en place)

`next.config.mjs` :
- `Content-Security-Policy`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 🎨 Tailwind 3 — Conventions WanaPush

- Mobile-first (utiliser `md:`, `lg:` pour étendre)
- Éviter `!important` (cas exceptionnels seulement)
- Composants réutilisés → `shadcn/ui` patterns (copy-paste, pas dépendance)
- Couleurs business via CSS vars dans `globals.css` (`--brand-500`, etc.)

⚠️ Tailwind 4 est sorti mais **on ne migre pas avant** : API stable de v3 et
l'écosystème (shadcn, plugins) prend du temps à suivre.

## 🛣️ Roadmap d'upgrade (à planifier)

Quand WanaPush sera plus mature :

| Upgrade | Bénéfice clé | Prérequis | Estimation |
|---|---|---|---|
| Next.js 14 → 15 | PPR stable, use cache directive, perf++ | Vérifier breaking changes | ~1-2 jours |
| React 18 → 19 | `use()` hook, `useFormState`, React Compiler | Next.js 15 d'abord | ~0.5-1 jour |
| Auth.js v5 (ex NextAuth) | API moderne, mieux typé | Migration des `authOptions` | ~1 jour |
| Tailwind 3 → 4 | Engine plus rapide | Vérif compat shadcn | ~0.5 jour |
| Prisma 6 → 7 | Client engine | Migration majeure | ~2-3 jours |

**NE PAS upgrade en pleine sprint feature.** Planifier des fenêtres dédiées.

## 🐛 Anti-patterns à bannir

- ❌ **`"use client"` au top du fichier sans raison** (alourdit le bundle)
- ❌ **Fetch séquentiels** dans un Server Component (utiliser `Promise.all`)
- ❌ **`useEffect` pour fetcher** dans un Client Component si une RSC ou
  `<Suspense>` peut le faire
- ❌ **`as Type` partout** au lieu de `satisfies`
- ❌ **Dupliquer un type Zod manuellement** (utiliser `z.infer`)
- ❌ **Connexions Prisma directes** dans une route (utiliser le singleton)
- ❌ **Renvoyer tout un objet DB** dans une réponse API (utiliser `select`)
- ❌ **Mutations sans `revalidatePath`** (le cache reste désynchro)
- ❌ **Suspense unique pour toute la page** (granular boundaries)
- ❌ **Optimisation prématurée avec `useMemo`/`useCallback`** quand React 19
  Compiler le fera mieux. Pour l'instant en React 18 : oui pour les calculs lourds.

## ✅ TL;DR pour Claude

1. **Server Components par défaut**, `"use client"` au minimum
2. **Granular `<Suspense>`** (1 par section indépendante)
3. **`Promise.all` pour les fetches parallèles**
4. **`startTransition` pour les state updates lourds** (fix INP #1)
5. **`satisfies` mieux que `as`** ; **`z.infer` mieux que duplication de types**
6. **Prisma : binary engine, `select`, `$transaction`, singleton**
7. **Validation Zod systématique** sur les inputs API
8. **Tokens chiffrés AES-256-GCM** via `lib/crypto.ts`, jamais en clair
9. **`revalidatePath` après chaque mutation** sinon cache stale
10. **PPR experimental en v14** : on n'active PAS (attendre v15)

## 📅 Maintenance & sources

**Données vérifiées juin 2026** :
- React 18/19 : react.dev/blog, AnuRock, DZone (RSC + Suspense + Compiler)
- Next.js 14/15 : nextjs.org/blog, DEV Community Teguh, CodeXOps, FreeCodeCamp
  (App Router + streaming + revalidation)
- TypeScript : Zod docs, DEV TypeScript Expert Revision Handbook
- Prisma : memory wanapush.md (engineType binary obligatoire, vérifié en prod)

**Last verified : 2026-06-03**. À re-vérifier en septembre 2026 (post React
Conf 2026 + Next.js Conf).

**Skills associés** :
- [`SKILL_wanapush_site_generator.md`](./SKILL_wanapush_site_generator.md) — génération sites + Core Web Vitals
- [`SKILL_wanapush_seo_module.md`](./SKILL_wanapush_seo_module.md) — INP optimization + remédiation Google updates
- [`SKILL_wanapush_social_module.md`](./SKILL_wanapush_social_module.md) — module réseaux sociaux
- [`SKILL_digital_marketing_wanapush.md`](./SKILL_digital_marketing_wanapush.md) — stratégie marketing globale
