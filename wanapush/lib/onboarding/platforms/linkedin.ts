import type { PlatformWizardConfig } from "../types";

export const linkedinConfig: PlatformWizardConfig = {
  kind: "social",
  platform: "LINKEDIN",
  slug: "linkedin",
  icon: "💼",
  oauthStartUrl: "/api/social/oauth/linkedin/start",
  oauthButtonBg: "bg-[#0A66C2] hover:bg-[#0958a8] shadow-blue-500/20",
  oauthButtonGlyph: "in",
  estimatedMinutes: 7,

  accountsApiPath: "/api/social/accounts",
  successPrimaryCtaHref: "/social?tab=composer",
  successSecondaryCtaHref: "/social",
  exitHref: "/social",

  welcome: {
    title: { fr: "Connecter LinkedIn à WanaPush", en: "Connect LinkedIn to WanaPush" },
    subtitle: {
      fr: "Publiez sur votre profil personnel et/ou votre Page Entreprise",
      en: "Publish to your personal profile and/or Company Page",
    },
    intro: {
      fr: "LinkedIn permet deux types de publication : sur votre profil personnel (idéal pour le personal branding) et sur la Page de votre entreprise (idéal pour la marque). WanaPush gère les deux.",
      en: "LinkedIn allows two types of publishing: on your personal profile (great for personal branding) and on your Company Page (great for the brand). WanaPush handles both.",
    },
    prerequisites: [
      {
        fr: "Un compte LinkedIn personnel actif (idéalement complet : photo, expérience, headline)",
        en: "An active LinkedIn personal account (ideally complete: photo, experience, headline)",
      },
      {
        fr: "Optionnel : une Page LinkedIn d'entreprise dont vous êtes admin",
        en: "Optional: a LinkedIn Company Page where you're admin",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 7 minutes. Si vous n'avez qu'un profil personnel, c'est encore plus rapide.",
      en: "Plan around 7 minutes. If you only have a personal profile, it's even faster.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "personal_profile",
      icon: "👤",
      title: { fr: "Profil personnel LinkedIn", en: "LinkedIn personal profile" },
      subtitle: {
        fr: "Bien renseigné = plus de portée sur vos posts",
        en: "A complete profile = better reach on your posts",
      },
      whatTitle: {
        fr: "Pourquoi remplir mon profil ?",
        en: "Why fill out my profile?",
      },
      whatDesc: {
        fr: "LinkedIn pénalise dans son feed les comptes incomplets (sans photo, sans expérience, sans headline). Avant de publier via WanaPush, prenez 10 minutes pour soigner votre profil — vos posts auront 3 à 5 fois plus de portée.",
        en: "LinkedIn down-ranks incomplete profiles in its feed (no photo, no experience, no headline). Before publishing via WanaPush, spend 10 minutes polishing your profile — your posts will get 3 to 5x more reach.",
      },
      question: {
        fr: "Votre profil LinkedIn est-il complet (photo + headline + au moins 1 expérience) ?",
        en: "Is your LinkedIn profile complete (photo + headline + at least 1 experience)?",
      },
      haveItLabel: { fr: "Oui, c'est bon", en: "Yes, all good" },
      createItLabel: { fr: "Pas encore, des conseils ?", en: "Not yet, any tips?" },
      howToTitle: { fr: "Profil LinkedIn complet — 4 essentiels", en: "Complete LinkedIn profile — 4 essentials" },
      howToSteps: [
        {
          fr: "**Photo de profil** professionnelle et récente (visage net, fond neutre, sourire OK).",
          en: "**Profile photo** that's professional and recent (clear face, neutral background, a smile is fine).",
        },
        {
          fr: "**Headline** percutante en 1 phrase : ce que vous faites + pour qui + résultat. Ex: « J'aide les PME à doubler leur trafic SEO en 90 jours ».",
          en: "**Headline** punchy in 1 sentence: what you do + for who + result. E.g. « I help SMBs double their SEO traffic in 90 days ».",
        },
        {
          fr: "**Expérience actuelle** avec description : 2-3 bullet points qui montrent vos résultats, pas vos missions.",
          en: "**Current role** with description: 2-3 bullet points showing your results, not your tasks.",
        },
        {
          fr: "**Photo de couverture** : votre marque, votre proposition de valeur, ou une citation. Format 1584×396 px.",
          en: "**Cover photo**: your brand, your value prop, or a quote. Size 1584×396 px.",
        },
      ],
      externalUrl: "https://www.linkedin.com/in/me",
      openLinkLabel: { fr: "Ouvrir mon profil LinkedIn", en: "Open my LinkedIn profile" },
      tip: {
        fr: "💡 Astuce : ajoutez des hashtags pertinents dans votre headline. Cela renforce votre détectabilité dans la search LinkedIn.",
        en: "💡 Tip: add relevant hashtags in your headline. It boosts your discoverability in LinkedIn search.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de publier votre premier post LinkedIn",
      en: "Final step before publishing your first LinkedIn post",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers LinkedIn pour autoriser WanaPush à publier en votre nom (profil personnel) et/ou sur vos Pages Entreprise.",
      en: "You'll be redirected to LinkedIn to authorize WanaPush to post on your behalf (personal profile) and/or your Company Pages.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      { fr: "Lire votre profil de base (nom, photo, headline)", en: "Read your basic profile (name, photo, headline)" },
      { fr: "Publier des posts sur votre profil personnel", en: "Publish posts to your personal profile" },
      {
        fr: "Publier sur les Pages Entreprises dont vous êtes admin",
        en: "Publish to Company Pages where you're admin",
      },
      {
        fr: "Récupérer les statistiques des posts (vues, likes, commentaires)",
        en: "Fetch post analytics (views, likes, comments)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne lit pas vos messages privés ni votre fil d'actualité personnel. Seulement vos posts publics et vos statistiques.",
      en: "🔒 WanaPush doesn't read your private messages or personal feed. Only your public posts and their analytics.",
    },
    actionLabel: { fr: "Se connecter avec LinkedIn", en: "Sign in with LinkedIn" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis Paramètres → Confidentialité → Autres applications.",
      en: "You can revoke access from Settings → Privacy → Third-party apps.",
    },
  },

  success: {
    title: { fr: "🎉 C'est connecté !", en: "🎉 You're connected!" },
    subtitle: {
      fr: "LinkedIn est connecté à WanaPush",
      en: "LinkedIn is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant publier sur votre profil personnel et/ou vos Pages Entreprise depuis WanaPush, avec génération IA des posts adaptés au ton LinkedIn (professionnel, narratif, expertise).",
      en: "You can now publish to your personal profile and/or Company Pages from WanaPush, with AI-generated posts tuned for the LinkedIn tone (professional, narrative, expert).",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Publier un post de présentation (intro, mission, ce que vous offrez)",
        en: "Publish an intro post (yourself, mission, what you offer)",
      },
      {
        fr: "Planifier 3 posts/semaine sur 1 mois pour gagner en visibilité",
        en: "Schedule 3 posts/week for 1 month to build visibility",
      },
      {
        fr: "Activer le retargeting via LinkedIn Ads pour amplifier vos posts performants",
        en: "Enable retargeting via LinkedIn Ads to amplify your best posts",
      },
    ],
    createCampaignLabel: { fr: "Publier mon premier post", en: "Publish my first post" },
    backLabel: { fr: "Retour au tableau de bord Social", en: "Back to Social dashboard" },
  },
};
