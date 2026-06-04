import type { PlatformWizardConfig } from "../types";

export const facebookConfig: PlatformWizardConfig = {
  kind: "social",
  platform: "FACEBOOK",
  slug: "facebook",
  icon: "📘",
  oauthStartUrl: "/api/social/oauth/facebook/start",
  oauthButtonBg: "bg-[#1877F2] hover:bg-[#166eda] shadow-blue-500/20",
  oauthButtonGlyph: "f",
  estimatedMinutes: 6,

  accountsApiPath: "/api/social/accounts",
  successPrimaryCtaHref: "/social?tab=composer",
  successSecondaryCtaHref: "/social",
  exitHref: "/social",

  welcome: {
    title: { fr: "Connecter Facebook à WanaPush", en: "Connect Facebook to WanaPush" },
    subtitle: {
      fr: "Publiez et planifiez vos posts Facebook depuis WanaPush",
      en: "Publish and schedule your Facebook posts from WanaPush",
    },
    intro: {
      fr: "WanaPush va se connecter à votre Page Facebook professionnelle pour publier des posts, planifier du contenu et récupérer les statistiques d'engagement. Pas besoin de carte bancaire ici — c'est gratuit !",
      en: "WanaPush will connect to your Facebook business Page to publish posts, schedule content and pull engagement metrics. No credit card needed here — it's free!",
    },
    prerequisites: [
      {
        fr: "Un compte personnel Facebook actif",
        en: "An active personal Facebook account",
      },
      {
        fr: "Une Page Facebook professionnelle dont vous êtes admin",
        en: "A Facebook business Page where you're an admin",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 5 minutes si vous avez déjà une Page Facebook, 15 min si vous devez en créer une.",
      en: "Plan around 5 minutes if you already have a Facebook Page, 15 min if you need to create one.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "page",
      icon: "📄",
      title: { fr: "Page Facebook professionnelle", en: "Facebook business Page" },
      subtitle: {
        fr: "Le profil public de votre marque sur Facebook",
        en: "Your brand's public profile on Facebook",
      },
      whatTitle: {
        fr: "Pourquoi pas mon profil personnel ?",
        en: "Why not my personal profile?",
      },
      whatDesc: {
        fr: "Facebook interdit aux applications externes de publier sur des profils personnels. Vous **devez** utiliser une Page professionnelle. Les Pages ont aussi des stats détaillées, des outils de planification et la possibilité de boost organique.",
        en: "Facebook forbids external apps from posting on personal profiles. You **must** use a business Page. Pages also have detailed stats, scheduling tools, and organic boost options.",
      },
      question: {
        fr: "Avez-vous une Page Facebook professionnelle dont vous êtes admin ?",
        en: "Do you have a Facebook business Page where you're an admin?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider à en créer une", en: "No, help me create one" },
      howToTitle: { fr: "Créer votre Page Facebook — 4 étapes", en: "Create your Facebook Page — 4 steps" },
      howToSteps: [
        {
          fr: "Allez sur facebook.com/pages/create dans un nouvel onglet.",
          en: "Go to facebook.com/pages/create in a new tab.",
        },
        {
          fr: "Renseignez le nom de votre Page (= nom de votre entreprise), choisissez une catégorie.",
          en: "Fill in your Page name (= business name), pick a category.",
        },
        {
          fr: "Ajoutez une photo de profil (votre logo) et une photo de couverture. Une bio courte qui dit qui vous êtes.",
          en: "Add a profile picture (your logo) and a cover photo. A short bio saying who you are.",
        },
        {
          fr: "Publiez votre premier post pour rendre la Page « vivante ». Vérifiez bien que vous êtes admin.",
          en: "Publish your first post to make the Page « alive ». Confirm you're an admin.",
        },
      ],
      externalUrl: "https://www.facebook.com/pages/create",
      openLinkLabel: { fr: "Créer une Page Facebook", en: "Create a Facebook Page" },
      tip: {
        fr: "💡 Astuce : si vous en avez plusieurs, vous pourrez choisir laquelle (ou lesquelles) connecter à l'étape suivante.",
        en: "💡 Tip: if you have multiple, you'll be able to pick which one(s) to connect in the next step.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de publier votre premier post",
      en: "Final step before publishing your first post",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers Facebook pour autoriser WanaPush à publier sur votre Page.",
      en: "You'll be redirected to Facebook to authorize WanaPush to post on your Page.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      { fr: "Voir la liste de vos Pages Facebook", en: "See the list of your Facebook Pages" },
      { fr: "Publier des posts sur vos Pages", en: "Publish posts on your Pages" },
      { fr: "Planifier des publications", en: "Schedule publications" },
      {
        fr: "Récupérer les statistiques d'engagement (likes, commentaires, partages)",
        en: "Fetch engagement metrics (likes, comments, shares)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe Facebook. WanaPush ne lit pas vos messages privés ni votre fil personnel.",
      en: "🔒 WanaPush never stores your Facebook password. WanaPush doesn't read your private messages or personal feed.",
    },
    actionLabel: { fr: "Se connecter avec Facebook", en: "Sign in with Facebook" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis Facebook → Paramètres → Apps et sites web.",
      en: "You can revoke access from Facebook → Settings → Apps and websites.",
    },
    flowTip: {
      title: {
        fr: "Lors de la connexion, Meta vous demandera de choisir vos entreprises et vos pages — voici comment faire :",
        en: "Meta will ask you to choose your businesses and pages — here's how:",
      },
      steps: [
        {
          fr: "Sur la popup Meta, cliquez **« Modifier les paramètres »** (lien gris, pas le bouton « Réassocier »).",
          en: "On the Meta popup, click **'Edit settings'** (gray link, not the 'Reauthorize' button).",
        },
        {
          fr: "À l'écran **« Entreprises »**, cochez **tous les portfolios** contenant les pages que vous voulez gérer.",
          en: "On the **'Businesses'** screen, check **all portfolios** containing the pages you want to manage.",
        },
        {
          fr: "À l'écran **« Pages »**, cochez **chaque page** que vous voulez voir dans WanaPush (vous pourrez les sélectionner ensuite).",
          en: "On the **'Pages'** screen, check **each page** you want to appear in WanaPush (you'll be able to select them next).",
        },
      ],
    },
    noPageHint: {
      title: {
        fr: "Pas encore de Page Facebook ?",
        en: "No Facebook Page yet?",
      },
      body: {
        fr: "Meta n'autorise pas WanaPush à créer une Page à votre place (anti-spam). Créez-la vous-même en 3 minutes — ensuite, revenez sur cet écran et cliquez sur « Se connecter avec Facebook ».",
        en: "Meta doesn't allow WanaPush to create a Page on your behalf (anti-spam). Create it yourself in 3 minutes — then come back to this screen and click 'Sign in with Facebook'.",
      },
      ctaLabel: {
        fr: "Créer ma Page Facebook",
        en: "Create my Facebook Page",
      },
      ctaUrl: "https://www.facebook.com/pages/create",
      // Si l'erreur OAuth contient un de ces mots, on met le hint en avant.
      errorMarkers: ["Aucune Page Facebook", "No Facebook Page"],
    },
  },

  success: {
    title: { fr: "🎉 C'est connecté !", en: "🎉 You're connected!" },
    subtitle: {
      fr: "Facebook est connecté à WanaPush",
      en: "Facebook is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant publier et planifier vos posts Facebook depuis WanaPush — avec génération IA des textes et des visuels si vous le souhaitez.",
      en: "You can now publish and schedule your Facebook posts from WanaPush — with AI-generated copy and visuals if you want.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Composer votre premier post avec assistance IA",
        en: "Write your first post with AI assistance",
      },
      {
        fr: "Planifier une série de posts pour les 30 prochains jours",
        en: "Schedule a series of posts for the next 30 days",
      },
      {
        fr: "Connecter Instagram pour publier sur les deux plateformes en un clic",
        en: "Connect Instagram to publish to both platforms in one click",
      },
    ],
    createCampaignLabel: { fr: "Composer mon premier post", en: "Write my first post" },
    backLabel: { fr: "Retour au tableau de bord Social", en: "Back to Social dashboard" },
  },
};
