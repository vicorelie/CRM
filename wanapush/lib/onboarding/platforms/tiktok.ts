import type { PlatformWizardConfig } from "../types";

export const tiktokConfig: PlatformWizardConfig = {
  kind: "social",
  platform: "TIKTOK",
  slug: "tiktok",
  icon: "🎵",
  oauthStartUrl: "/api/social/oauth/tiktok/start",
  oauthButtonBg: "bg-black hover:bg-slate-800 shadow-pink-500/20 border border-pink-500/40",
  oauthButtonGlyph: "♪",
  estimatedMinutes: 8,

  accountsApiPath: "/api/social/accounts",
  successPrimaryCtaHref: "/social?tab=composer",
  successSecondaryCtaHref: "/social",
  exitHref: "/social",

  welcome: {
    title: { fr: "Connecter TikTok à WanaPush", en: "Connect TikTok to WanaPush" },
    subtitle: {
      fr: "Uploadez et planifiez vos vidéos TikTok depuis WanaPush",
      en: "Upload and schedule your TikTok videos from WanaPush",
    },
    intro: {
      fr: "WanaPush utilise le **Content Posting API** de TikTok pour uploader vos vidéos directement, gérer captions/hashtags et planifier la publication. Attention : TikTok valide manuellement les uploads via API (parfois 24-48h pour le 1er post).",
      en: "WanaPush uses TikTok's **Content Posting API** to upload your videos directly, manage captions/hashtags and schedule publishing. Heads up: TikTok manually validates API uploads (sometimes 24-48h for the 1st post).",
    },
    prerequisites: [
      {
        fr: "Un compte TikTok (perso ou Business — les deux fonctionnent pour publier)",
        en: "A TikTok account (personal or Business — both work for posting)",
      },
      {
        fr: "Idéalement un compte Business pour avoir les statistiques détaillées",
        en: "Ideally a Business account to get detailed analytics",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 8 minutes. La conversion d'un compte perso en Business est gratuite et instantanée.",
      en: "Plan around 8 minutes. Converting a personal account to Business is free and instant.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "account",
      icon: "👤",
      title: { fr: "Compte TikTok", en: "TikTok account" },
      subtitle: {
        fr: "Personnel ou Business — les deux marchent pour publier",
        en: "Personal or Business — both work for publishing",
      },
      whatTitle: {
        fr: "Faut-il un compte Business obligatoirement ?",
        en: "Is a Business account mandatory?",
      },
      whatDesc: {
        fr: "Non, mais c'est **fortement recommandé** : un compte Business débloque les statistiques détaillées (impressions, watch time, audience), les outils de promotion payée, et la possibilité d'ajouter un lien dans la bio. Le passage en Business est gratuit, instantané et réversible.",
        en: "No, but it's **strongly recommended**: a Business account unlocks detailed analytics (impressions, watch time, audience), paid promotion tools, and the ability to add a link in bio. Switching to Business is free, instant, and reversible.",
      },
      question: {
        fr: "Avez-vous un compte TikTok actif (perso ou Business) ?",
        en: "Do you have an active TikTok account (personal or Business)?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Créer ou passer en Business — 3 étapes", en: "Create or switch to Business — 3 steps" },
      howToSteps: [
        {
          fr: "Téléchargez l'app TikTok (iOS/Android), inscrivez-vous avec votre numéro ou email pro.",
          en: "Download the TikTok app (iOS/Android), sign up with your phone or business email.",
        },
        {
          fr: "Sur votre profil → menu ☰ → Paramètres et confidentialité → Compte → Passer en compte Business.",
          en: "On your profile → menu ☰ → Settings and privacy → Account → Switch to Business account.",
        },
        {
          fr: "Choisissez votre catégorie (Mode, Restaurant, Tech, etc.), renseignez email + site web → validez.",
          en: "Pick your category (Fashion, Restaurant, Tech, etc.), fill in email + website → confirm.",
        },
      ],
      externalUrl: "https://www.tiktok.com/business/",
      openLinkLabel: { fr: "TikTok for Business — site officiel", en: "TikTok for Business — official site" },
      tip: {
        fr: "💡 Astuce : TikTok favorise les comptes qui postent **régulièrement** (3-5 vidéos/semaine) plus que la qualité absolue. La constance bat la perfection.",
        en: "💡 Tip: TikTok favors accounts that post **regularly** (3-5 videos/week) over absolute quality. Consistency beats perfection.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant d'uploader votre première vidéo TikTok",
      en: "Final step before uploading your first TikTok video",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers TikTok pour autoriser WanaPush à publier sur votre compte.",
      en: "You'll be redirected to TikTok to authorize WanaPush to publish on your account.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      { fr: "Voir les infos basiques de votre compte (nom, avatar)", en: "See your basic account info (name, avatar)" },
      { fr: "Uploader des vidéos en votre nom", en: "Upload videos on your behalf" },
      {
        fr: "Définir caption, hashtags, paramètres de visibilité",
        en: "Set caption, hashtags, visibility settings",
      },
      {
        fr: "Récupérer les statistiques de vos vidéos (vues, likes, partages)",
        en: "Fetch your video metrics (views, likes, shares)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne peut pas lire vos messages privés. Aucune vidéo n'est publiée sans votre validation explicite.",
      en: "🔒 WanaPush can't read your DMs. No video is published without your explicit approval.",
    },
    actionLabel: { fr: "Se connecter avec TikTok", en: "Sign in with TikTok" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis les paramètres TikTok → Sécurité → Gérer les apps.",
      en: "You can revoke access from TikTok settings → Security → Manage apps.",
    },
  },

  success: {
    title: { fr: "🎉 C'est connecté !", en: "🎉 You're connected!" },
    subtitle: {
      fr: "TikTok est connecté à WanaPush",
      en: "TikTok is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant uploader vos vidéos TikTok depuis WanaPush avec génération IA de hooks accrocheurs, captions et hashtags optimisés pour le feed FYP.",
      en: "You can now upload your TikTok videos from WanaPush with AI-generated catchy hooks, captions and hashtags optimized for the FYP feed.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Uploader votre première vidéo avec hook + caption générés par l'IA",
        en: "Upload your first video with AI-generated hook + caption",
      },
      {
        fr: "Planifier 5 vidéos sur la semaine pour booster votre régularité",
        en: "Schedule 5 videos over the week to boost your consistency",
      },
      {
        fr: "Connecter TikTok Ads pour booster les vidéos qui marchent",
        en: "Connect TikTok Ads to boost videos that perform",
      },
    ],
    createCampaignLabel: { fr: "Uploader ma première vidéo", en: "Upload my first video" },
    backLabel: { fr: "Retour au tableau de bord Social", en: "Back to Social dashboard" },
  },
};
