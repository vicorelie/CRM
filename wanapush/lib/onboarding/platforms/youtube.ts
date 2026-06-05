import type { PlatformWizardConfig } from "../types";

export const youtubeConfig: PlatformWizardConfig = {
  kind: "social",
  platform: "YOUTUBE",
  slug: "youtube",
  icon: "▶️",
  oauthStartUrl: "/api/social/oauth/youtube/start",
  oauthButtonBg: "bg-[#FF0000] hover:bg-[#cc0000] shadow-red-500/20",
  oauthButtonGlyph: "▶",
  estimatedMinutes: 10,

  accountsApiPath: "/api/social/accounts",
  successPrimaryCtaHref: "/social?tab=composer",
  successSecondaryCtaHref: "/social",
  exitHref: "/social",

  welcome: {
    title: { fr: "Connecter YouTube à WanaPush", en: "Connect YouTube to WanaPush" },
    subtitle: {
      fr: "Uploadez vidéos et Shorts sur votre chaîne depuis WanaPush",
      en: "Upload videos and Shorts to your channel from WanaPush",
    },
    intro: {
      fr: "WanaPush peut uploader vos vidéos longues et Shorts directement sur votre chaîne YouTube, gérer les titres, descriptions, miniatures et planifier la publication. L'upload via API est encadré par Google : prévoyez un peu plus de configuration.",
      en: "WanaPush can upload your long videos and Shorts directly to your YouTube channel, manage titles, descriptions, thumbnails and schedule publishing. API uploads are controlled by Google: expect a bit more configuration.",
    },
    prerequisites: [
      {
        fr: "Un compte Google (Gmail ou Workspace)",
        en: "A Google account (Gmail or Workspace)",
      },
      {
        fr: "Une chaîne YouTube créée (vérifiée par numéro de téléphone)",
        en: "A YouTube channel created (verified by phone number)",
      },
    ],
    timeWarn: {
      fr: "⚠️ L'upload via API nécessite que l'app WanaPush soit validée par Google. La validation côté admin peut prendre 2-4 semaines au premier déploiement.",
      en: "⚠️ API uploads require the WanaPush app to be validated by Google. Admin-side validation can take 2-4 weeks at first deployment.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "channel",
      icon: "📺",
      title: { fr: "Chaîne YouTube", en: "YouTube channel" },
      subtitle: {
        fr: "Votre espace de publication vidéo",
        en: "Your video publishing space",
      },
      whatTitle: {
        fr: "Une chaîne, c'est obligatoire ?",
        en: "Is a channel required?",
      },
      whatDesc: {
        fr: "Oui — un compte Google sans chaîne ne peut pas uploader de vidéo. Bonne nouvelle : la création est gratuite, instantanée, et donne accès à toutes les fonctionnalités YouTube (uploads, Shorts, monétisation, lives une fois éligible).",
        en: "Yes — a Google account with no channel can't upload videos. Good news: creating a channel is free, instant, and unlocks all YouTube features (uploads, Shorts, monetization, livestreams once eligible).",
      },
      question: {
        fr: "Avez-vous une chaîne YouTube active (avec au moins 1 vidéo uploadée) ?",
        en: "Do you have an active YouTube channel (with at least 1 video uploaded)?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Créer une chaîne YouTube — 4 étapes", en: "Create a YouTube channel — 4 steps" },
      howToSteps: [
        {
          fr: "Connectez-vous à YouTube.com avec votre compte Google. Cliquez sur votre avatar (haut droite).",
          en: "Sign in to YouTube.com with your Google account. Click your avatar (top right).",
        },
        {
          fr: "« Créer une chaîne » → choisissez « Marque/entreprise » (recommandé) plutôt que votre nom perso. Renseignez le nom de la chaîne.",
          en: "« Create a channel » → pick « Brand/business » (recommended) over your personal name. Set the channel name.",
        },
        {
          fr: "Ajoutez logo + bannière + description. Vérifiez votre chaîne par SMS (YouTube → Studio → Paramètres → Compte → Statut).",
          en: "Add logo + banner + description. Verify your channel by SMS (YouTube → Studio → Settings → Account → Status).",
        },
        {
          fr: "Uploadez votre première vidéo (même test) pour activer toutes les fonctionnalités.",
          en: "Upload your first video (even a test) to activate all features.",
        },
      ],
      externalUrl: "https://www.youtube.com/account",
      openLinkLabel: { fr: "Gérer mes chaînes YouTube", en: "Manage my YouTube channels" },
      tip: {
        fr: "⚠️ La **vérification par téléphone** est obligatoire pour uploader des vidéos > 15 min et des miniatures personnalisées. Faites-le tout de suite.",
        en: "⚠️ **Phone verification** is required to upload videos > 15 min and custom thumbnails. Do it right away.",
      },
      tipVariant: "warn",
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant d'uploader votre première vidéo",
      en: "Final step before uploading your first video",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers Google pour autoriser WanaPush à gérer votre chaîne YouTube.",
      en: "You'll be redirected to Google to authorize WanaPush to manage your YouTube channel.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      { fr: "Voir les infos de votre chaîne (nom, ID, statistiques)", en: "See your channel info (name, ID, stats)" },
      { fr: "Uploader vidéos et Shorts en votre nom", en: "Upload videos and Shorts on your behalf" },
      {
        fr: "Modifier titres, descriptions, tags, miniatures",
        en: "Edit titles, descriptions, tags, thumbnails",
      },
      {
        fr: "Récupérer les statistiques (vues, watch time, retention)",
        en: "Fetch analytics (views, watch time, retention)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne supprime aucune vidéo existante sans votre demande explicite. Aucun accès à vos commentaires privés.",
      en: "🔒 WanaPush won't delete any existing video without your explicit request. No access to your private comments.",
    },
    actionLabel: { fr: "Se connecter avec Google (YouTube)", en: "Sign in with Google (YouTube)" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis myaccount.google.com → Sécurité → Apps tierces ayant accès.",
      en: "You can revoke access from myaccount.google.com → Security → Third-party apps with account access.",
    },
    flowTip: {
      title: {
        fr: "Lors de la connexion Google, choisissez bien votre chaîne :",
        en: "When signing in with Google, pick the right channel:",
      },
      steps: [
        {
          fr: "Si Google affiche **plusieurs comptes**, choisissez celui qui possède votre chaîne YouTube (= votre Compte de marque / Brand Account).",
          en: "If Google shows **multiple accounts**, pick the one that owns your YouTube channel (= your Brand Account).",
        },
        {
          fr: "À l'écran « Choisir une chaîne », cliquez sur la chaîne de votre business (PAS votre chaîne perso si elle est différente).",
          en: "On the 'Choose a channel' screen, click your business channel (NOT your personal channel if different).",
        },
        {
          fr: "Si vous gérez plusieurs chaînes : refaites une connexion pour chaque (WanaPush stocke chacune indépendamment).",
          en: "If you manage multiple channels: re-run the connection for each (WanaPush stores them independently).",
        },
      ],
    },
    noPageHint: {
      title: {
        fr: "Pas encore de chaîne YouTube ?",
        en: "No YouTube channel yet?",
      },
      body: {
        fr: "Avec votre compte Google, créez une chaîne en 30 secondes : allez sur youtube.com → cliquez sur votre avatar (en haut à droite) → « Créer une chaîne » → choisissez **Utiliser un nom personnalisé** (= Brand Account, recommandé pour un business). Une vérification SMS peut être demandée pour les vidéos > 15 min ou les miniatures custom.",
        en: "With your Google account, create a channel in 30 seconds: go to youtube.com → click your avatar (top right) → 'Create a channel' → choose **Use a custom name** (= Brand Account, recommended for business). A phone verification may be required for videos > 15 min or custom thumbnails.",
      },
      ctaLabel: {
        fr: "Créer ma chaîne YouTube",
        en: "Create my YouTube channel",
      },
      ctaUrl: "https://www.youtube.com/create_channel",
      errorMarkers: ["no channel", "aucune chaîne", "channel not found"],
    },
  },

  success: {
    title: { fr: "🎉 C'est connecté !", en: "🎉 You're connected!" },
    subtitle: {
      fr: "YouTube est connecté à WanaPush",
      en: "YouTube is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant uploader vidéos et Shorts YouTube depuis WanaPush. L'IA génère titres optimisés SEO, descriptions, tags et miniatures.",
      en: "You can now upload YouTube videos and Shorts from WanaPush. AI generates SEO-optimized titles, descriptions, tags and thumbnails.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Uploader une vidéo avec optimisation IA du titre et de la description (boost SEO)",
        en: "Upload a video with AI-optimized title and description (SEO boost)",
      },
      {
        fr: "Programmer une série de Shorts sur 7 jours pour gagner en abonnés",
        en: "Schedule a series of Shorts over 7 days to grow subscribers",
      },
      {
        fr: "Réutiliser vos contenus longs en Shorts automatiquement (clip-finder IA)",
        en: "Repurpose your long content into Shorts automatically (AI clip-finder)",
      },
    ],
    createCampaignLabel: { fr: "Uploader ma première vidéo", en: "Upload my first video" },
    backLabel: { fr: "Retour au tableau de bord Social", en: "Back to Social dashboard" },
  },
};
