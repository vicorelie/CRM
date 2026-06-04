import type { PlatformWizardConfig } from "../types";

export const metaAdsConfig: PlatformWizardConfig = {
  kind: "ads",
  platform: "META_ADS",
  slug: "meta-ads",
  icon: "📘",
  oauthStartUrl: "/api/ads/oauth/meta_ads/start",
  oauthButtonBg: "bg-[#1877F2] hover:bg-[#166eda] shadow-blue-500/20",
  oauthButtonGlyph: "f",
  estimatedMinutes: 12,

  accountsApiPath: "/api/ads/accounts",
  successPrimaryCtaHref: "/ads?tab=builder",
  successSecondaryCtaHref: "/ads",
  exitHref: "/ads",

  welcome: {
    title: {
      fr: "Connecter Meta Ads à WanaPush",
      en: "Connect Meta Ads to WanaPush",
    },
    subtitle: {
      fr: "Lancez vos pubs Facebook & Instagram en quelques minutes",
      en: "Launch your Facebook & Instagram ads in minutes",
    },
    intro: {
      fr: "Meta Ads vous permet de toucher des millions d'utilisateurs sur Facebook, Instagram et Messenger. WanaPush va vous guider pas à pas pour tout mettre en place.",
      en: "Meta Ads lets you reach millions of users on Facebook, Instagram and Messenger. WanaPush will guide you step by step.",
    },
    prerequisites: [
      {
        fr: "Un compte personnel Facebook (pour vous identifier comme administrateur)",
        en: "A personal Facebook account (to identify you as administrator)",
      },
      {
        fr: "Une carte bancaire ou un compte PayPal (pour payer vos pubs)",
        en: "A credit card or PayPal account (to pay for your ads)",
      },
      {
        fr: "Vos informations d'entreprise (nom, adresse, n° SIRET si applicable)",
        en: "Your business information (name, address, VAT or tax ID if applicable)",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 10 à 15 minutes si vous partez de zéro.",
      en: "Plan around 10–15 minutes if you're starting from scratch.",
    },
    startLabel: {
      fr: "Commencer la configuration",
      en: "Start setup",
    },
  },

  checkpoints: [
    {
      id: "business",
      icon: "🏢",
      title: {
        fr: "Compte Meta Business",
        en: "Meta Business account",
      },
      subtitle: {
        fr: "L'espace centralisé pour gérer votre marketing Meta",
        en: "The hub for your Meta marketing assets",
      },
      whatTitle: {
        fr: "C'est quoi un compte Meta Business ?",
        en: "What is a Meta Business account?",
      },
      whatDesc: {
        fr: "Aussi appelé « Business Manager », c'est l'espace qui regroupe vos Pages, vos comptes publicitaires et les accès de votre équipe. Une seule porte d'entrée pour tout votre marketing.",
        en: "Also called « Business Manager », it's the workspace that groups your Pages, Ad Accounts and team members. One entry point for all your marketing.",
      },
      question: {
        fr: "Avez-vous déjà un compte Meta Business ?",
        en: "Do you already have a Meta Business account?",
      },
      haveItLabel: {
        fr: "Oui, j'en ai un",
        en: "Yes, I have one",
      },
      createItLabel: {
        fr: "Non, m'aider à en créer un",
        en: "No, help me create one",
      },
      howToTitle: {
        fr: "Créer votre compte Meta Business — 3 étapes",
        en: "Create your Meta Business account — 3 steps",
      },
      howToSteps: [
        {
          fr: "Ouvrez business.facebook.com dans un nouvel onglet et connectez-vous avec votre compte Facebook personnel.",
          en: "Open business.facebook.com in a new tab and sign in with your personal Facebook account.",
        },
        {
          fr: "Cliquez sur le bouton bleu « Créer un compte » en haut à droite.",
          en: "Click the blue « Create account » button at the top right.",
        },
        {
          fr: "Renseignez le nom de votre entreprise, votre nom complet et votre email professionnel. Validez.",
          en: "Fill in your business name, your full name and your work email. Submit.",
        },
      ],
      externalUrl: "https://business.facebook.com/",
      openLinkLabel: {
        fr: "Ouvrir business.facebook.com",
        en: "Open business.facebook.com",
      },
      tip: {
        fr: "💡 Astuce : utilisez votre vrai prénom et nom — Meta vérifie l'identité des administrateurs.",
        en: "💡 Tip: use your real first and last name — Meta verifies admin identity.",
      },
    },
    {
      id: "page",
      icon: "📄",
      title: {
        fr: "Page Facebook professionnelle",
        en: "Facebook business Page",
      },
      subtitle: {
        fr: "L'identité publique de votre marque sur Facebook & Instagram",
        en: "Your brand's public identity on Facebook & Instagram",
      },
      whatTitle: { fr: "Pourquoi une Page Facebook ?", en: "Why a Facebook Page?" },
      whatDesc: {
        fr: "Toutes vos pubs Facebook et Instagram apparaîtront comme provenant de cette Page. C'est elle que les internautes verront, suivront, et avec qui ils interagiront. Sans Page, pas de pub possible.",
        en: "All your Facebook and Instagram ads appear as coming from this Page. It's what users see, follow, and interact with. No Page, no ads.",
      },
      question: {
        fr: "Avez-vous une Page Facebook pour votre entreprise ?",
        en: "Do you have a Facebook Page for your business?",
      },
      haveItLabel: { fr: "Oui, j'en ai une", en: "Yes, I have one" },
      createItLabel: { fr: "Non, m'aider à en créer une", en: "No, help me create one" },
      howToTitle: {
        fr: "Créer votre Page Facebook — 4 étapes",
        en: "Create your Facebook Page — 4 steps",
      },
      howToSteps: [
        {
          fr: "Allez sur facebook.com/pages/create dans un nouvel onglet.",
          en: "Go to facebook.com/pages/create in a new tab.",
        },
        {
          fr: "Choisissez la catégorie qui correspond le mieux à votre activité (Restaurant, Boutique, Service local, etc.).",
          en: "Pick the category that best fits your business (Restaurant, Store, Local service, etc.).",
        },
        {
          fr: "Donnez un nom clair et reconnaissable à votre Page (le nom de votre entreprise, pas de slogan).",
          en: "Give your Page a clear, recognizable name (your business name, no slogan).",
        },
        {
          fr: "Ajoutez une photo de profil (votre logo) et une photo de couverture. Une Page sans visuel inspire peu confiance.",
          en: "Add a profile picture (your logo) and a cover photo. A Page with no visuals looks shady.",
        },
      ],
      externalUrl: "https://www.facebook.com/pages/create",
      openLinkLabel: { fr: "Créer une Page Facebook", en: "Create a Facebook Page" },
      tip: {
        fr: "💡 Astuce : Instagram peut être associé à cette Page plus tard. Une seule Page Facebook suffit pour les pubs Facebook ET Instagram.",
        en: "💡 Tip: Instagram can be linked to this Page later. One Facebook Page covers both Facebook AND Instagram ads.",
      },
    },
    {
      id: "ad_account",
      icon: "💼",
      title: { fr: "Compte publicitaire", en: "Ad Account" },
      subtitle: {
        fr: "Là où vit votre budget et vos campagnes",
        en: "Where your budget and campaigns live",
      },
      whatTitle: { fr: "À quoi sert un compte publicitaire ?", en: "What's an Ad Account for?" },
      whatDesc: {
        fr: "Le compte publicitaire (Ad Account) regroupe vos campagnes, votre budget, vos méthodes de paiement et vos factures. Il est lié à votre Business Manager.",
        en: "The Ad Account holds your campaigns, budget, payment methods and invoices. It's linked to your Business Manager.",
      },
      question: {
        fr: "Avez-vous déjà un compte publicitaire actif ?",
        en: "Do you already have an active Ad Account?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider à en créer un", en: "No, help me create one" },
      howToTitle: {
        fr: "Créer votre compte publicitaire — 4 étapes",
        en: "Create your Ad Account — 4 steps",
      },
      howToSteps: [
        {
          fr: "Connectez-vous à business.facebook.com, puis cliquez sur l'icône « Paramètres » (en bas à gauche).",
          en: "Sign in to business.facebook.com, then click the « Settings » icon (bottom left).",
        },
        {
          fr: "Dans le menu de gauche, allez dans Comptes → Comptes publicitaires.",
          en: "In the left menu, go to Accounts → Ad accounts.",
        },
        {
          fr: "Cliquez sur Ajouter → Créer un nouveau compte publicitaire.",
          en: "Click Add → Create a new ad account.",
        },
        {
          fr: "Renseignez un nom (ex: « Pub WanaPush »), votre fuseau horaire et votre devise. Validez.",
          en: "Pick a name (e.g. « WanaPush Ads »), your time zone and currency. Confirm.",
        },
      ],
      externalUrl: "https://business.facebook.com/settings/ad-accounts",
      openLinkLabel: { fr: "Ouvrir Business Manager", en: "Open Business Manager" },
      tip: {
        fr: "⚠️ La devise et le fuseau horaire ne peuvent pas être changés après création. Choisissez avec soin.",
        en: "⚠️ Currency and time zone CAN'T be changed after creation. Choose carefully.",
      },
      tipVariant: "warn",
    },
    {
      id: "payment",
      icon: "💳",
      title: { fr: "Moyen de paiement", en: "Payment method" },
      subtitle: {
        fr: "Sans paiement, vos pubs ne peuvent pas démarrer",
        en: "Without payment, your ads can't start",
      },
      whatTitle: {
        fr: "Pourquoi ajouter un moyen de paiement maintenant ?",
        en: "Why add payment right now?",
      },
      whatDesc: {
        fr: "Meta facture à l'usage : vos pubs commencent à dépenser dès qu'elles sont actives. Sans carte ou PayPal renseigné, vous ne pourrez pas lancer de campagne, même via WanaPush.",
        en: "Meta bills on usage: your ads spend money as soon as they're live. With no card or PayPal on file, no campaign can launch — including via WanaPush.",
      },
      question: {
        fr: "Votre compte publicitaire a-t-il un moyen de paiement valide ?",
        en: "Does your Ad Account have a valid payment method?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider à en ajouter un", en: "No, help me add one" },
      howToTitle: {
        fr: "Ajouter un moyen de paiement — 3 étapes",
        en: "Add a payment method — 3 steps",
      },
      howToSteps: [
        {
          fr: "Dans Business Manager → Paramètres → Comptes publicitaires, cliquez sur votre compte pub.",
          en: "In Business Manager → Settings → Ad accounts, click your ad account.",
        },
        {
          fr: "Dans l'onglet « Paiements » (ou « Facturation »), cliquez sur Ajouter un mode de paiement.",
          en: "Under the « Payments » (or « Billing ») tab, click Add payment method.",
        },
        {
          fr: "Choisissez Carte bancaire ou PayPal et renseignez les informations. Meta peut faire une petite préautorisation (~1€) pour vérifier.",
          en: "Pick Credit card or PayPal and fill in the details. Meta may do a small pre-authorization (~$1) to verify.",
        },
      ],
      externalUrl: "https://business.facebook.com/billing_hub/payment_settings",
      openLinkLabel: { fr: "Ouvrir la facturation Meta", en: "Open Meta billing" },
      tip: {
        fr: "💡 Vous pouvez définir un plafond mensuel (« limite de dépense du compte ») pour ne jamais dépasser votre budget.",
        en: "💡 You can set a monthly cap (« account spending limit ») so you never go over budget.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de lancer vos premières campagnes",
      en: "Final step before launching your first campaigns",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers Meta pour autoriser WanaPush à accéder à vos comptes publicitaires.",
      en: "You'll be redirected to Meta to authorize WanaPush to access your ad accounts.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      {
        fr: "Lire la liste de vos comptes publicitaires Meta",
        en: "Read the list of your Meta ad accounts",
      },
      {
        fr: "Créer et gérer vos campagnes publicitaires",
        en: "Create and manage your ad campaigns",
      },
      {
        fr: "Récupérer les statistiques de performance (impressions, clics, coût)",
        en: "Fetch performance metrics (impressions, clicks, cost)",
      },
      {
        fr: "Lire la liste de vos Pages Facebook & comptes Instagram associés",
        en: "Read the list of your Facebook Pages & linked Instagram accounts",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe Meta. La connexion utilise OAuth, le standard sécurisé de l'industrie.",
      en: "🔒 WanaPush never stores your Meta password. The connection uses OAuth, the secure industry standard.",
    },
    actionLabel: { fr: "Se connecter avec Meta", en: "Sign in with Meta" },
    cancelHint: {
      fr: "Vous pourrez révoquer cette autorisation à tout moment depuis vos paramètres Meta.",
      en: "You can revoke this authorization any time from your Meta settings.",
    },
    flowTip: {
      title: {
        fr: "Lors de la connexion, Meta vous demandera de choisir vos entreprises et vos comptes publicitaires — voici comment faire :",
        en: "Meta will ask you to choose your businesses and ad accounts — here's how:",
      },
      steps: [
        {
          fr: "Sur la popup Meta, cliquez **« Modifier les paramètres »** (lien gris, pas le bouton « Réassocier »).",
          en: "On the Meta popup, click **'Edit settings'** (gray link, not the 'Reauthorize' button).",
        },
        {
          fr: "À l'écran **« Entreprises »**, cochez **tous les portfolios** contenant les comptes pub que vous voulez gérer.",
          en: "On the **'Businesses'** screen, check **all portfolios** containing the ad accounts you want to manage.",
        },
        {
          fr: "À l'écran **« Comptes publicitaires »**, cochez **chaque compte** que vous voulez voir dans WanaPush.",
          en: "On the **'Ad accounts'** screen, check **each account** you want to appear in WanaPush.",
        },
      ],
    },
  },

  success: {
    title: { fr: "🎉 C'est tout bon !", en: "🎉 You're all set!" },
    subtitle: {
      fr: "Meta Ads est connecté à WanaPush",
      en: "Meta Ads is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant créer vos premières campagnes Facebook & Instagram depuis WanaPush, avec l'aide de l'IA pour générer vos copies et vos visuels.",
      en: "You can now create your first Facebook & Instagram campaigns from WanaPush, with AI helping you with copy and visuals.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Créer votre première campagne avec le Campaign Builder IA",
        en: "Create your first campaign with the AI Campaign Builder",
      },
      {
        fr: "Importer vos audiences clients pour le retargeting",
        en: "Import your customer audiences for retargeting",
      },
      {
        fr: "Connecter d'autres plateformes (Google, TikTok, LinkedIn)",
        en: "Connect other platforms (Google, TikTok, LinkedIn)",
      },
    ],
    createCampaignLabel: { fr: "Créer ma première campagne", en: "Create my first campaign" },
    backLabel: { fr: "Retour au tableau de bord Ads", en: "Back to Ads dashboard" },
  },
};
