import type { PlatformWizardConfig } from "../types";

export const googleAdsConfig: PlatformWizardConfig = {
  kind: "ads",
  platform: "GOOGLE_ADS",
  slug: "google-ads",
  icon: "🔎",
  oauthStartUrl: "/api/ads/oauth/google_ads/start",
  oauthButtonBg: "bg-white hover:bg-slate-100 !text-slate-900 shadow-slate-200/40",
  oauthButtonGlyph: "G",
  estimatedMinutes: 10,

  accountsApiPath: "/api/ads/accounts",
  successPrimaryCtaHref: "/ads?tab=builder",
  successSecondaryCtaHref: "/ads",
  exitHref: "/ads",

  welcome: {
    title: {
      fr: "Connecter Google Ads à WanaPush",
      en: "Connect Google Ads to WanaPush",
    },
    subtitle: {
      fr: "Lancez vos campagnes Search, YouTube, Display & Shopping",
      en: "Launch your Search, YouTube, Display & Shopping campaigns",
    },
    intro: {
      fr: "Google Ads est la plus grande régie publicitaire au monde. Avec elle, vos pubs peuvent apparaître sur Google, YouTube, Gmail et des millions de sites partenaires. WanaPush vous accompagne pour tout configurer.",
      en: "Google Ads is the world's largest ad network. Your ads can show on Google, YouTube, Gmail and millions of partner sites. WanaPush will help you set everything up.",
    },
    prerequisites: [
      {
        fr: "Un compte Google (Gmail ou Google Workspace)",
        en: "A Google account (Gmail or Google Workspace)",
      },
      {
        fr: "Une carte bancaire au nom de votre entreprise",
        en: "A credit card in your business name",
      },
      {
        fr: "Votre site web pour la vérification (URL, capacité à éditer le DNS ou ajouter un tag)",
        en: "Your website for verification (URL, ability to edit DNS or add a tag)",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 10 minutes. La validation du paiement peut prendre jusqu'à 24h chez Google.",
      en: "Plan around 10 minutes. Google payment validation may take up to 24h.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "google_account",
      icon: "👤",
      title: { fr: "Compte Google", en: "Google account" },
      subtitle: {
        fr: "Votre identité unique sur tout l'écosystème Google",
        en: "Your single identity across the Google ecosystem",
      },
      whatTitle: { fr: "Quel compte utiliser ?", en: "Which account to use?" },
      whatDesc: {
        fr: "Utilisez un compte Google **professionnel** que vous garderez longtemps (idéalement Google Workspace avec votre domaine). Évitez votre adresse Gmail personnelle — si vous quittez l'entreprise, vous perdrez l'accès à toutes les campagnes.",
        en: "Use a **business** Google account that you'll keep long-term (ideally Google Workspace with your own domain). Avoid your personal Gmail — if you leave the company, you'll lose access to all campaigns.",
      },
      question: {
        fr: "Avez-vous un compte Google professionnel ?",
        en: "Do you have a business Google account?",
      },
      haveItLabel: { fr: "Oui, je suis prêt(e)", en: "Yes, I'm ready" },
      createItLabel: { fr: "Non, m'aider à en créer un", en: "No, help me create one" },
      howToTitle: { fr: "Créer un compte Google — 3 options", en: "Create a Google account — 3 options" },
      howToSteps: [
        {
          fr: "Option 1 (gratuit) : créez un compte Gmail dédié sur accounts.google.com avec un nom proche de votre marque.",
          en: "Option 1 (free): create a dedicated Gmail account at accounts.google.com with a name close to your brand.",
        },
        {
          fr: "Option 2 (recommandé, ~6€/mois) : créez un compte Google Workspace pour pouvoir utiliser votre propre domaine (ex: contact@votre-site.com).",
          en: "Option 2 (recommended, ~$6/mo): create a Google Workspace account so you can use your own domain (e.g. contact@your-site.com).",
        },
        {
          fr: "Option 3 : utilisez un compte Google déjà existant que vous contrôlez pleinement.",
          en: "Option 3: use an existing Google account that you fully control.",
        },
      ],
      externalUrl: "https://accounts.google.com/signup",
      openLinkLabel: { fr: "Créer un compte Google", en: "Create a Google account" },
      tip: {
        fr: "💡 Astuce : activez la double authentification (2FA) immédiatement. Un compte Google Ads piraté = budget volé.",
        en: "💡 Tip: enable two-factor authentication (2FA) immediately. A hacked Google Ads account = stolen budget.",
      },
    },
    {
      id: "ads_account",
      icon: "🎯",
      title: { fr: "Compte Google Ads", en: "Google Ads account" },
      subtitle: {
        fr: "Là où vivent vos campagnes Google",
        en: "Where your Google campaigns live",
      },
      whatTitle: { fr: "C'est quoi Google Ads ?", en: "What is Google Ads?" },
      whatDesc: {
        fr: "Google Ads (anciennement AdWords) est la plateforme publicitaire de Google. Un compte Google Ads est lié à un compte Google, et héberge vos campagnes, budgets et statistiques.",
        en: "Google Ads (formerly AdWords) is Google's advertising platform. A Google Ads account is linked to a Google account, and hosts your campaigns, budgets and stats.",
      },
      question: {
        fr: "Avez-vous déjà un compte Google Ads ?",
        en: "Do you already have a Google Ads account?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Créer un compte Google Ads — 4 étapes", en: "Create a Google Ads account — 4 steps" },
      howToSteps: [
        {
          fr: "Connectez-vous à ads.google.com avec votre compte Google professionnel.",
          en: "Sign in to ads.google.com with your business Google account.",
        },
        {
          fr: "Google peut vous proposer le « mode intelligent » au démarrage : refusez et choisissez « Passer en mode expert » (en bas de la page) pour avoir le vrai contrôle.",
          en: "Google may suggest « Smart mode » at start: refuse and pick « Switch to Expert mode » (bottom of page) for real control.",
        },
        {
          fr: "Renseignez votre pays, fuseau horaire et devise. Ces choix sont définitifs.",
          en: "Set your country, time zone and currency. These choices are permanent.",
        },
        {
          fr: "Skippez la création de la première campagne — vous la créerez via WanaPush.",
          en: "Skip the first campaign creation — you'll create it via WanaPush.",
        },
      ],
      externalUrl: "https://ads.google.com/",
      openLinkLabel: { fr: "Ouvrir Google Ads", en: "Open Google Ads" },
      tip: {
        fr: "⚠️ Devise et fuseau horaire ne peuvent **pas** être changés après création. Choisissez la devise dans laquelle vous voulez recevoir vos factures.",
        en: "⚠️ Currency and time zone **cannot** be changed after creation. Pick the currency you want to be invoiced in.",
      },
      tipVariant: "warn",
    },
    {
      id: "billing",
      icon: "💳",
      title: { fr: "Configuration du paiement", en: "Billing setup" },
      subtitle: {
        fr: "Carte bancaire et infos de facturation",
        en: "Credit card and billing details",
      },
      whatTitle: {
        fr: "Comment Google Ads vous facture-t-il ?",
        en: "How does Google Ads bill you?",
      },
      whatDesc: {
        fr: "Google peut soit prélever automatiquement votre carte dès qu'un seuil est atteint, soit envoyer une facture mensuelle. Sans paiement configuré, vos campagnes ne peuvent pas dépenser.",
        en: "Google can either auto-charge your card once a threshold is hit, or send a monthly invoice. With no payment set up, your campaigns can't spend.",
      },
      question: {
        fr: "Avez-vous configuré un mode de paiement dans Google Ads ?",
        en: "Have you set up a payment method in Google Ads?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Configurer le paiement — 4 étapes", en: "Set up billing — 4 steps" },
      howToSteps: [
        {
          fr: "Dans Google Ads, cliquez sur Outils & paramètres → Facturation → Résumé.",
          en: "In Google Ads, click Tools & settings → Billing → Summary.",
        },
        {
          fr: "Renseignez le nom légal de votre entreprise et l'adresse de facturation (doivent matcher avec votre carte).",
          en: "Enter your business legal name and billing address (must match your card).",
        },
        {
          fr: "Ajoutez une carte bancaire (Visa, Mastercard, AmEx). Google peut faire une autorisation de 1€ pour vérifier.",
          en: "Add a credit card (Visa, Mastercard, AmEx). Google may do a $1 hold to verify.",
        },
        {
          fr: "Si vous avez un n° de TVA intracommunautaire (EU) ou un SIRET, renseignez-les pour récupérer la TVA.",
          en: "If you have a VAT or tax ID, enter it to reclaim taxes where applicable.",
        },
      ],
      externalUrl: "https://ads.google.com/aw/billing/summary",
      openLinkLabel: { fr: "Ouvrir la facturation Google Ads", en: "Open Google Ads billing" },
      tip: {
        fr: "💡 Définissez un budget mensuel par campagne plutôt qu'un budget compte — ça vous laisse plus de contrôle.",
        en: "💡 Set a monthly budget per campaign rather than per account — gives you finer control.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de lancer vos campagnes Google",
      en: "Final step before launching your Google campaigns",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers Google pour autoriser WanaPush à accéder à vos comptes Google Ads.",
      en: "You'll be redirected to Google to authorize WanaPush to access your Google Ads accounts.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      {
        fr: "Voir et gérer vos campagnes Google Ads",
        en: "View and manage your Google Ads campaigns",
      },
      {
        fr: "Récupérer vos statistiques de performance",
        en: "Fetch your performance metrics",
      },
      {
        fr: "Lire les informations de votre compte (devise, fuseau horaire, ID)",
        en: "Read your account information (currency, time zone, ID)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe Google. La connexion utilise OAuth 2.0, le standard de sécurité de Google.",
      en: "🔒 WanaPush never stores your Google password. The connection uses OAuth 2.0, Google's security standard.",
    },
    actionLabel: { fr: "Se connecter avec Google", en: "Sign in with Google" },
    cancelHint: {
      fr: "Vous pourrez révoquer cette autorisation à tout moment depuis myaccount.google.com → Sécurité.",
      en: "You can revoke this authorization any time from myaccount.google.com → Security.",
    },
    flowTip: {
      title: {
        fr: "À l'écran Google « Choisir un compte », attention :",
        en: "On the Google 'Choose an account' screen, be careful:",
      },
      steps: [
        {
          fr: "Sélectionnez le **compte Google qui possède** votre compte Google Ads (souvent celui que vous utilisez pour ads.google.com).",
          en: "Select the **Google account that owns** your Google Ads account (often the one you use for ads.google.com).",
        },
        {
          fr: "Si vous utilisez un MCC (manager) avec plusieurs comptes liés, connectez le compte MCC — vous verrez ensuite tous ses comptes enfants.",
          en: "If you use a MCC (manager) with linked sub-accounts, connect the MCC — you'll then see all child accounts.",
        },
      ],
    },
    noPageHint: {
      title: {
        fr: "Pas encore de compte Google Ads ?",
        en: "No Google Ads account yet?",
      },
      body: {
        fr: "Créez-le en 5 minutes sur ads.google.com → cliquez « Commencer » → choisissez le mode **Expert** (PAS Smart Mode qui limite les fonctionnalités API). Vous devrez renseigner une carte bancaire (aucun débit tant que vous ne lancez pas de campagne) et choisir votre fuseau horaire + devise — ces deux choix sont **définitifs**, choisissez bien.",
        en: "Create it in 5 minutes on ads.google.com → click 'Start now' → pick **Expert Mode** (NOT Smart Mode, which restricts API features). You'll enter a credit card (no charge until you launch a campaign) and pick your timezone + currency — these two choices are **permanent**, choose carefully.",
      },
      ctaLabel: {
        fr: "Créer mon compte Google Ads",
        en: "Create my Google Ads account",
      },
      ctaUrl: "https://ads.google.com/intl/fr_fr/start/",
      errorMarkers: ["Aucun compte Google Ads", "No Google Ads", "no_ads_account"],
    },
  },

  success: {
    title: { fr: "🎉 C'est tout bon !", en: "🎉 You're all set!" },
    subtitle: {
      fr: "Google Ads est connecté à WanaPush",
      en: "Google Ads is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant créer vos premières campagnes Google (Search, Performance Max, Shopping…) depuis WanaPush.",
      en: "You can now create your first Google campaigns (Search, Performance Max, Shopping…) from WanaPush.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Créer une campagne Search avec génération IA des annonces",
        en: "Create a Search campaign with AI-generated ads",
      },
      {
        fr: "Connecter votre site pour le tracking des conversions",
        en: "Connect your site for conversion tracking",
      },
      {
        fr: "Lancer une campagne Performance Max alimentée par l'IA",
        en: "Launch an AI-powered Performance Max campaign",
      },
    ],
    createCampaignLabel: { fr: "Créer ma première campagne", en: "Create my first campaign" },
    backLabel: { fr: "Retour au tableau de bord Ads", en: "Back to Ads dashboard" },
  },
};
