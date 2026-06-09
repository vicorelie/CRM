---
name: wanapush-geo-aeo
description: >
  Skill transversale GEO/AEO (Generative / Answer Engine Optimization) — être
  CITÉ par les moteurs IA (Google AI Overviews & AI Mode, ChatGPT, Perplexity,
  Gemini), objectif distinct du ranking organique classique. À lire quand on
  génère du contenu (Site-gen, SEO, social, GBP) ou qu'on veut maximiser la
  visibilité dans les réponses IA. Tactiques sourcées Google + Princeton 2026.
license: proprietary
version: 1.0
last_reviewed: 2026-06-09
---

# SKILL — WanaPush GEO/AEO (être cité par les moteurs de réponse IA)

> En 2026 la recherche est générative par défaut (AI Overviews + AI Mode dominent). La CTR
> organique a chuté sur les requêtes avec réponse IA, mais **être cité dans l'AI Overview = +35 %
> de clics organiques**. La bataille s'est déplacée des **liens** vers les **citations**. Le SEO
> classique (ranking) et le GEO/AEO (citation) sont deux objectifs distincts avec des mécaniques
> différentes. Cette skill couvre le second ; le ranking reste dans `SKILL_wanapush_seo_module.md`.
> ([Search Engine Land](https://searchengineland.com/google-ai-overviews-ctr-recovery-study-475566))

## 🧭 Quand l'invoquer
- Génération de contenu (Site-gen, `/suggest-content` SEO, posts sociaux, descriptions GBP).
- Question "comment être visible dans ChatGPT/Perplexity/Google AI Overviews ?".
- Définition de la stratégie contenu d'un client ou de la plateforme.

## 1. Les 4 leviers qui font la citation (sourcés Google + Princeton)

1. **Answer-first writing.** Chaque section (H2/H3) **démarre par une réponse directe** en 1-2 phrases,
   sous forme d'**énoncés autoportants** (compréhensibles hors contexte) avec **dates explicites**.
   → jusqu'à **+40 % de chances de citation** (étude Princeton). C'est le levier #1.
   ([Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide))
2. **Information gain (contenu non-commodity).** Data originale, **chiffres nommés/sourcés**, expertise
   first-hand, exemples concrets. Le "5 conseils pour…" générique n'est **jamais** cité — les LLM
   privilégient le contenu qui apporte de l'information que les autres pages n'ont pas.
3. **Earned media >> owned.** 82-89 % des citations IA viennent de **sources tierces** (Wikipedia ≈ 28,9 %
   des cites AI Mode ; Reddit ≈ 46,5 % des cites Perplexity). → cohérence **entity/brand** cross-sources,
   présence sur les sources que les moteurs citent, pas seulement son propre site.
4. **Structured data.** `FAQPage` schema = **3,2× plus de présence en AIO** ; le schema en général ≈ 2,5×
   plus de chances d'être cité. Prioriser `FAQPage`, `Article` + `Person` (auteur nommé = E-E-A-T).

## 2. Ce qu'il faut produire (mapping WanaPush)
- **Site-gen** : sections answer-first (réponse en tête), FAQ avec `FAQPage` schema, chiffres/dates,
  auteur nommé (`Person`), `dateModified` rendu en HTML **et** schema.
- **SEO `/suggest-content`** : générer des réponses directes + stats sourcées, pas des paragraphes
  génériques. Ajouter un check d'audit **`faq-schema`** et un score "réponse directe en tête de section".
- **Social / GBP** : énoncés factuels autoportants (les LLM scrapent aussi ces surfaces pour le local).
- **Local (GBP)** : seuil de citation IA ≈ **150+ avis/établissement** + review velocity (cf. skill GBP).

## 3. Pièges à éviter
- **`llms.txt` n'a AUCUNE valeur** pour la visibilité dans les moteurs IA grand public (Google ne le
  supporte pas, guide officiel 15-mai-2026). Ne jamais le proposer comme levier GEO.
  ([SEJ](https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/))
- **Scaled content abuse** : produire du thin AI à l'échelle pour "couvrir" des requêtes = pénalité
  Google (mars 2026, -50 à -80 % trafic) **et** non-cité par les LLM. La différenciation réelle par
  page est obligatoire (cf. skill SEO).
- **Confondre ranking et citation** : un bon ranking n'implique pas une citation, et inversement.
  Mesurer les deux séparément (présence en AIO/ChatGPT/Perplexity vs position SERP classique).

## ✅ Checklist GEO/AEO d'une page/contenu
- [ ] Chaque section commence par une **réponse directe autoportante** (1-2 phrases)
- [ ] **Chiffres nommés + dates explicites + sources** (information gain, pas commodity)
- [ ] **`FAQPage` schema** + `Article`/`Person` (auteur nommé)
- [ ] `dateModified` cohérent HTML + schema + sitemap lastmod
- [ ] Pas de thin/scaled content ; différenciation réelle vs pages voisines
- [ ] Cohérence entity/brand (nom, claims) avec les sources tierces

## 📈 Sources
- [Search Engine Land — AIO CTR recovery study](https://searchengineland.com/google-ai-overviews-ctr-recovery-study-475566)
- [Google — AI features & your site](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [SEJ — Google says llms.txt is speculative](https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/)
