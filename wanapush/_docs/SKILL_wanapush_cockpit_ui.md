---
name: wanapush-cockpit-ui
description: >
  Utilise cette skill quand l'utilisateur travaille sur le Cockpit founder UI
  de WanaPush : page unique qui exploite tout le backend (analytics + copilot)
  en une vue. Pattern PostHog/Linear 2026 (page Server Component + drawer
  chat floating).
license: proprietary
version: 1.0
last_reviewed: 2026-06-08
---

# SKILL — WanaPush Cockpit founder UI

> **Première UI dashboard shippée (2026-06-08)**. Page `/cockpit` qui rassemble
> Analytics overview + Anomalies + Copilot chat dans une seule expérience
> founder. Pattern best-in-class 2026 (shadcn/ui inspired, Tailwind, RSC).

## 🧭 Quand l'invoquer

- L'user demande "dashboard global", "cockpit", "vue d'ensemble"
- Travail dans `app/(dashboard)/cockpit/*`
- Ajout d'une nouvelle KPI card ou section

## 🏗️ Architecture

```
app/(dashboard)/cockpit/
  page.tsx              ← Server Component : fetch overview + anomalies + render
  CockpitClient.tsx     ← Client : period selector (7/30/90j), dismiss anomalies,
                          module cards
  CopilotDrawer.tsx     ← Client : drawer chat floating bottom-right
```

**Pattern 2026** (PostHog, Linear, Vercel, Stripe) :
- Server Component pour data hydratée au first paint
- Client components pour interactivité ciblée
- `?days=30` query string pour période (shareable URL)
- Drawer pattern pour AI chat (vs page dédiée — réduit friction)

## 🎨 Sections de la page

1. **Header** : Bonjour {firstName} + sélecteur période (7/30/90)
2. **Anomalies banner** (si présentes) : 3 max visibles + dismiss UI side
3. **Unit Economics cards** (4 KPIs en row) : CAC, LTV, LTV:CAC, Lead Velocity
4. **Module grid** (3 cols sm:lg) : 6 cards
   - Publicité 🎯 (Dépense / ROAS / Revenue / Top plateforme)
   - Leads 🧲 (Total / HOT-WARM / Score moyen / Conversion)
   - Boutique 🛍️ (CA brut / CA net / Commandes / AOV)
   - Email ✉️ (Campagnes / Destinataires / Open % / Click %)
   - Google Business 📍 (Impressions / Clics / Appels / Note ★)
   - Copilot 🤖 (call-to-action, ouvre drawer, badge count si CRITICAL)

**Cards cliquables** : chaque module card est un `<Link href="/ads">` etc. → drill-down vers le module détaillé.

**Empty states** : si un module n'a pas de data (`totalSpend === 0` etc.), message d'onboarding au lieu de cards vides.

## 💬 Copilot Drawer

**Pattern** : drawer right-side full-height, max-w-md, backdrop blur, slide animation 300ms.

**Trigger** : 2 façons d'ouvrir
1. Bouton flottant 🤖 (bottom-right, h-14 w-14, brand color, hover scale)
2. Click sur "Copilot Card" du grid → `dispatchEvent("wp:open-copilot")` → listener écoute

**Features** :
- 4 suggestions cliquables au state vide (ROAS, leads HOT, growth plan, weekly review)
- Conversation memory : `conversationId` passé entre appels → backend reload history
- Tool calls badges affichés au-dessus de chaque message assistant (visibilité IA)
- Loading state : 3 bouncing dots + "Je consulte tes données…"
- Keyboard : Enter pour send, Shift+Enter ligne, Esc pour fermer
- Auto-scroll bottom à chaque nouveau message

**Backend** : POST `/api/copilot/ask` (déjà shippé module Copilot).

## 🎨 Design system

**Couleurs** (cohérent avec dashboard existant) :
- `brand-700` : actions primaires + accent
- `brand-50` : backgrounds soft
- `emerald-700` : metrics positives (good accent)
- `amber-700` : warnings (sous cible)
- `rose-500` : CRITICAL anomalies + badge
- `zinc-*` : palette neutre (200/500/900)

**Typo** : `font-mono font-semibold` pour les nombres dans les MetricLine.

**Spacing** : px-6 py-10 page, gap-4 grid, p-4/p-5 cards.

**Cards** : `rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-sm` (pattern réutilisable).

## ⚡ Perf

- Server Component → first paint avec data hydratée (pas de skeleton)
- `Promise.all(getOverview, detectAnomalies)` → 2 queries en parallèle
- `dynamic = "force-dynamic"` (pas de cache, data toujours fresh)
- `useTransition` sur period change (Suspense pendant la nav)

## 🚧 V2 phase 2

- **Charts** : sparklines Recharts dans chaque card (trend 7j)
- **Drill-down** : modal détails au lieu de Link page
- **Command Palette** (Cmd+K) : navigation + copilot quick ask
- **Real-time** : SSE pour push nouvelles anomalies sans reload
- **Custom periods** : datepicker au-delà des presets 7/30/90
- **Comparaisons** : "vs période précédente" sur chaque KPI
- **Dark mode** toggle (Tailwind dark:)
- **Export** : PDF/CSV du current state
- **Copilot streaming** : SSE response au lieu de blocking
- **Slash commands dans le chat** : `/diagnostic_roas`, `/weekly_review` → invoke prompts MCP

## 📈 Sources

- [shadcn/ui Templates 2026 — AdminLTE](https://adminlte.io/blog/shadcn-ui-templates/)
- [SaaS Dashboard patterns 2026](https://thefrontkit.com/blogs/best-shadcn-dashboard-templates-2026)
- [Real-time data dashboards expected by users (Stripe/Shopify/Vercel pattern)](https://adminlte.io/blog/saas-admin-dashboard-templates/)
