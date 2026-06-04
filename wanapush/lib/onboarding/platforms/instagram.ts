import type { PlatformWizardConfig } from "../types";

export const instagramConfig: PlatformWizardConfig = {
  kind: "social",
  platform: "INSTAGRAM",
  slug: "instagram",
  icon: "📷",
  oauthStartUrl: "/api/social/oauth/instagram/start",
  oauthButtonBg:
    "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-500 hover:opacity-90 shadow-pink-500/20",
  oauthButtonGlyph: "IG",
  estimatedMinutes: 8,

  accountsApiPath: "/api/social/accounts",
  successPrimaryCtaHref: "/social?tab=composer",
  successSecondaryCtaHref: "/social",
  exitHref: "/social",

  welcome: {
    title: { fr: "Connecter Instagram à WanaPush", en: "Connect Instagram to WanaPush" },
    subtitle: {
      fr: "Publiez photos, carrousels et Reels depuis WanaPush",
      en: "Publish photos, carousels and Reels from WanaPush",
    },
    intro: {
      fr: "Instagram impose des règles particulières : seuls les comptes **Business** ou **Créateur** peuvent être pilotés par des applications externes. WanaPush vous aide à convertir votre compte si besoin.",
      en: "Instagram has specific rules: only **Business** or **Creator** accounts can be controlled by external apps. WanaPush will help you convert your account if needed.",
    },
    prerequisites: [
      {
        fr: "Un compte Instagram **Business** ou **Créateur** (pas un compte perso)",
        en: "An Instagram **Business** or **Creator** account (not a personal one)",
      },
      {
        fr: "Une Page Facebook (Instagram exige le lien à une Page FB)",
        en: "A Facebook Page (Instagram requires linking to a FB Page)",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 8 minutes. La conversion d'un compte perso en Business est instantanée.",
      en: "Plan around 8 minutes. Converting a personal account to Business is instant.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "business_account",
      icon: "💼",
      title: {
        fr: "Compte Instagram Business ou Créateur",
        en: "Instagram Business or Creator account",
      },
      subtitle: {
        fr: "Indispensable pour publier via WanaPush",
        en: "Required to publish via WanaPush",
      },
      whatTitle: {
        fr: "Business ou Créateur, quelle différence ?",
        en: "Business or Creator, what's the difference?",
      },
      whatDesc: {
        fr: "**Business** : pour les entreprises, e-commerce, marques. Accès à toutes les pubs et au shopping. **Créateur** : pour influenceurs, artistes, personnalités publiques. Outils similaires mais ton plus personnel. Les deux fonctionnent avec WanaPush — choisissez Business si vous vendez un produit ou un service.",
        en: "**Business**: for companies, e-commerce, brands. Access to ads and shopping. **Creator**: for influencers, artists, public figures. Similar tools, more personal vibe. Both work with WanaPush — pick Business if you sell a product or service.",
      },
      question: {
        fr: "Votre compte Instagram est-il en Business ou Créateur ?",
        en: "Is your Instagram account Business or Creator?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non / je ne sais pas", en: "No / I don't know" },
      howToTitle: {
        fr: "Convertir votre compte en Business — 4 étapes (depuis l'app mobile)",
        en: "Convert your account to Business — 4 steps (from the mobile app)",
      },
      howToSteps: [
        {
          fr: "Ouvrez Instagram sur votre téléphone et allez sur votre profil.",
          en: "Open Instagram on your phone and go to your profile.",
        },
        {
          fr: "Menu ☰ (en haut à droite) → Paramètres et confidentialité → Type de compte et outils.",
          en: "Menu ☰ (top right) → Settings and privacy → Account type and tools.",
        },
        {
          fr: "Choisissez « Passer en compte professionnel » puis « Entreprise » (ou « Créateur »).",
          en: "Pick « Switch to professional account » then « Business » (or « Creator »).",
        },
        {
          fr: "Renseignez catégorie + email + téléphone (visible publiquement) et validez.",
          en: "Fill in category + email + phone (publicly visible) and confirm.",
        },
      ],
      externalUrl: "https://help.instagram.com/502981923235522",
      openLinkLabel: { fr: "Aide officielle Instagram", en: "Instagram official help" },
      tip: {
        fr: "💡 La conversion est **réversible** à tout moment et **gratuite**. Vous pouvez tester sans risque.",
        en: "💡 The conversion is **reversible** anytime and **free**. You can test risk-free.",
      },
    },
    {
      id: "fb_link",
      icon: "🔗",
      title: { fr: "Liaison à une Page Facebook", en: "Link to a Facebook Page" },
      subtitle: {
        fr: "Instagram exige ce lien pour autoriser les applications",
        en: "Instagram requires this link to authorize apps",
      },
      whatTitle: {
        fr: "Pourquoi lier Instagram à une Page Facebook ?",
        en: "Why link Instagram to a Facebook Page?",
      },
      whatDesc: {
        fr: "Instagram appartient à Meta. Pour qu'une application externe (comme WanaPush) puisse publier, votre compte Instagram pro doit être **lié à une Page Facebook** dans Meta Business Suite. C'est cette liaison qui autorise les permissions OAuth.",
        en: "Instagram is owned by Meta. For an external app (like WanaPush) to publish, your pro Instagram account must be **linked to a Facebook Page** in Meta Business Suite. This link is what authorizes OAuth permissions.",
      },
      question: {
        fr: "Votre compte Instagram est-il déjà lié à une Page Facebook ?",
        en: "Is your Instagram account already linked to a Facebook Page?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: {
        fr: "Lier Instagram à une Page Facebook — 3 étapes",
        en: "Link Instagram to a Facebook Page — 3 steps",
      },
      howToSteps: [
        {
          fr: "Allez sur business.facebook.com → Paramètres → Comptes Instagram.",
          en: "Go to business.facebook.com → Settings → Instagram accounts.",
        },
        {
          fr: "Cliquez sur « Ajouter » → connectez-vous avec votre compte Instagram Business.",
          en: "Click « Add » → sign in with your Instagram Business account.",
        },
        {
          fr: "Sélectionnez la Page Facebook à associer. Vous devez être admin des deux.",
          en: "Select the Facebook Page to associate. You must be admin of both.",
        },
      ],
      externalUrl: "https://business.facebook.com/settings/instagram-accounts",
      openLinkLabel: { fr: "Ouvrir Meta Business Suite", en: "Open Meta Business Suite" },
      tip: {
        fr: "💡 Si vous avez déjà connecté Facebook à WanaPush (au step précédent), Instagram peut hériter automatiquement de cette autorisation.",
        en: "💡 If you've already connected Facebook to WanaPush (previous step), Instagram may inherit that authorization automatically.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de publier votre premier post Insta",
      en: "Final step before publishing your first Insta post",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers Instagram pour autoriser WanaPush à publier sur votre compte Business.",
      en: "You'll be redirected to Instagram to authorize WanaPush to publish on your Business account.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      { fr: "Voir vos comptes Instagram Business associés", en: "See your linked Instagram Business accounts" },
      { fr: "Publier photos, carrousels et Reels", en: "Publish photos, carousels and Reels" },
      { fr: "Planifier des publications", en: "Schedule publications" },
      {
        fr: "Récupérer les statistiques (vues, likes, commentaires, portée)",
        en: "Fetch metrics (views, likes, comments, reach)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe. Aucun accès à vos DM ni à votre fil personnel.",
      en: "🔒 WanaPush never stores your password. No access to your DMs or personal feed.",
    },
    actionLabel: { fr: "Se connecter avec Instagram", en: "Sign in with Instagram" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis Instagram → Paramètres → Sécurité → Apps et sites web.",
      en: "You can revoke access from Instagram → Settings → Security → Apps and websites.",
    },
    flowTip: {
      title: {
        fr: "Pour éviter une boucle de re-connexion, lisez ceci avant de cliquer :",
        en: "To avoid a re-login loop, read this before clicking:",
      },
      steps: [
        {
          fr: "**Connectez-vous d'abord à Instagram dans un autre onglet** (instagram.com). Si vous êtes déjà connecté, parfait — vous arriverez direct sur la page d'autorisation.",
          en: "**Log in to Instagram in another tab first** (instagram.com). If you're already logged in, you'll go straight to the authorization page.",
        },
        {
          fr: "Si Instagram vous demande la double authentification : **entrez le code reçu (SMS / WhatsApp / app) directement dans le navigateur**. **Ne cliquez pas** sur la notification « C'est moi » envoyée sur votre téléphone — sinon Instagram vous redirigera vers sa page d'accueil au lieu de WanaPush.",
          en: "If Instagram asks for 2FA: **type the code (SMS / WhatsApp / app) directly in your browser**. **Don't tap** the 'It's me' push notification on your phone — Instagram would redirect to its home page instead of WanaPush.",
        },
        {
          fr: "Astuce : si vous avez la 2FA par notification push, désactivez-la temporairement ou utilisez plutôt une app d'authentification (Google Authenticator) — plus fiable pour l'OAuth.",
          en: "Tip: if you use push-notification 2FA, disable it temporarily or switch to an authenticator app (Google Authenticator) — more reliable for OAuth.",
        },
      ],
    },
  },

  success: {
    title: { fr: "🎉 C'est connecté !", en: "🎉 You're connected!" },
    subtitle: {
      fr: "Instagram est connecté à WanaPush",
      en: "Instagram is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant publier photos, carrousels et Reels Instagram depuis WanaPush. L'IA peut générer vos captions et hashtags optimisés selon votre niche.",
      en: "You can now publish photos, carousels and Reels to Instagram from WanaPush. AI can generate captions and hashtags optimized for your niche.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Publier votre premier post avec génération IA de caption + hashtags",
        en: "Publish your first post with AI-generated caption + hashtags",
      },
      {
        fr: "Programmer un calendrier éditorial sur 4 semaines",
        en: "Schedule a 4-week editorial calendar",
      },
      {
        fr: "Connecter Facebook pour publier sur les deux en un clic",
        en: "Connect Facebook to publish to both in one click",
      },
    ],
    createCampaignLabel: { fr: "Publier mon premier post", en: "Publish my first post" },
    backLabel: { fr: "Retour au tableau de bord Social", en: "Back to Social dashboard" },
  },
};
