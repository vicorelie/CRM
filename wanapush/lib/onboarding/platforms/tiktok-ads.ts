import type { PlatformWizardConfig } from "../types";

export const tiktokAdsConfig: PlatformWizardConfig = {
  kind: "ads",
  platform: "TIKTOK_ADS",
  slug: "tiktok-ads",
  icon: "🎵",
  oauthStartUrl: "/api/ads/oauth/tiktok_ads/start",
  oauthButtonBg: "bg-black hover:bg-slate-800 shadow-pink-500/20 border border-pink-500/40",
  oauthButtonGlyph: "♪",
  estimatedMinutes: 12,

  accountsApiPath: "/api/ads/accounts",
  successPrimaryCtaHref: "/ads?tab=builder",
  successSecondaryCtaHref: "/ads",
  exitHref: "/ads",

  welcome: {
    title: { fr: "Connecter TikTok Ads à WanaPush", en: "Connect TikTok Ads to WanaPush" },
    subtitle: {
      fr: "Touchez la Gen Z et les jeunes adultes là où ils passent leur temps",
      en: "Reach Gen Z and young adults where they spend their time",
    },
    intro: {
      fr: "TikTok est la plateforme la plus engageante au monde pour les moins de 35 ans. Les pubs TikTok intégrées au feed se regardent comme du contenu organique. WanaPush vous aide à tout mettre en place.",
      en: "TikTok is the most engaging platform in the world for under-35s. In-feed TikTok ads look just like organic content. WanaPush will help you set it all up.",
    },
    prerequisites: [
      {
        fr: "Un compte TikTok Business (différent d'un compte créateur personnel)",
        en: "A TikTok Business account (different from a personal creator account)",
      },
      {
        fr: "Une carte bancaire au nom de votre entreprise",
        en: "A credit card in your business name",
      },
      {
        fr: "Vos infos d'entreprise (nom légal, secteur, site web)",
        en: "Your business info (legal name, industry, website)",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 10 à 15 minutes. La validation par TikTok peut prendre quelques heures.",
      en: "Plan around 10–15 minutes. TikTok validation may take a few hours.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "business_account",
      icon: "💼",
      title: { fr: "Compte TikTok Business", en: "TikTok Business account" },
      subtitle: {
        fr: "L'écosystème pro de TikTok (pas le compte créateur classique)",
        en: "TikTok's pro ecosystem (not the regular creator account)",
      },
      whatTitle: {
        fr: "Quelle différence avec un compte créateur ?",
        en: "How is it different from a creator account?",
      },
      whatDesc: {
        fr: "TikTok Business Center est l'équivalent du Business Manager Meta : il centralise vos comptes pub TikTok, vos pixels de tracking, et les accès de votre équipe. Sans Business Center, vous ne pouvez pas faire de pub sur TikTok.",
        en: "TikTok Business Center is the equivalent of Meta's Business Manager: it centralizes your TikTok ad accounts, tracking pixels, and team access. No Business Center = no TikTok ads.",
      },
      question: {
        fr: "Avez-vous un compte TikTok Business Center ?",
        en: "Do you have a TikTok Business Center account?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider à en créer un", en: "No, help me create one" },
      howToTitle: { fr: "Créer votre TikTok Business Center — 4 étapes", en: "Create your TikTok Business Center — 4 steps" },
      howToSteps: [
        {
          fr: "Allez sur business.tiktok.com et cliquez sur « Get Started ».",
          en: "Go to business.tiktok.com and click « Get Started ».",
        },
        {
          fr: "Inscrivez-vous avec votre email pro (ou avec votre compte TikTok personnel — vous pourrez créer un Business Center indépendant après).",
          en: "Sign up with your business email (or your personal TikTok account — you can create an independent Business Center after).",
        },
        {
          fr: "Renseignez : nom légal, secteur d'activité, site web, fuseau horaire.",
          en: "Fill in: legal name, industry, website, time zone.",
        },
        {
          fr: "Validez votre email. Votre Business Center est créé.",
          en: "Verify your email. Your Business Center is created.",
        },
      ],
      externalUrl: "https://business.tiktok.com/",
      openLinkLabel: { fr: "Ouvrir TikTok Business", en: "Open TikTok Business" },
      tip: {
        fr: "💡 Astuce : utilisez un email professionnel (@votre-domaine.com), TikTok valide plus rapidement les comptes avec un domaine propre.",
        en: "💡 Tip: use a business email (@your-domain.com), TikTok validates accounts with a proper domain faster.",
      },
    },
    {
      id: "ads_account",
      icon: "🎯",
      title: { fr: "Compte publicitaire TikTok", en: "TikTok Ads account" },
      subtitle: {
        fr: "Le compte qui héberge budgets et campagnes",
        en: "The account that hosts budgets and campaigns",
      },
      whatTitle: { fr: "Qu'est-ce qu'un Ads Manager TikTok ?", en: "What is a TikTok Ads Manager?" },
      whatDesc: {
        fr: "TikTok Ads Manager est l'interface où vous créez et gérez vos campagnes. Un compte Ads Manager est créé dans votre Business Center et lié à un Ad Account (qui héberge le budget).",
        en: "TikTok Ads Manager is the interface where you create and manage campaigns. An Ads Manager account is created in your Business Center and linked to an Ad Account (which holds the budget).",
      },
      question: {
        fr: "Avez-vous un Ad Account créé dans votre Business Center ?",
        en: "Do you have an Ad Account created in your Business Center?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Créer un Ad Account TikTok — 4 étapes", en: "Create a TikTok Ad Account — 4 steps" },
      howToSteps: [
        {
          fr: "Dans Business Center, allez dans le menu Ad Accounts → Add → Create New.",
          en: "In Business Center, go to Ad Accounts menu → Add → Create New.",
        },
        {
          fr: "Renseignez le nom (ex: « Pub WanaPush »), pays, secteur d'activité.",
          en: "Set name (e.g. « WanaPush Ads »), country, industry.",
        },
        {
          fr: "Choisissez la **devise** et le fuseau horaire. Attention : devise non modifiable ensuite.",
          en: "Pick **currency** and time zone. Warning: currency can't be changed later.",
        },
        {
          fr: "TikTok demande des informations supplémentaires sur votre entreprise pour validation (numéro fiscal, site web). Remplissez tout pour accélérer.",
          en: "TikTok asks for extra business info for validation (tax number, website). Fill everything to speed things up.",
        },
      ],
      externalUrl: "https://ads.tiktok.com/i18n/dashboard/",
      openLinkLabel: { fr: "Ouvrir TikTok Ads Manager", en: "Open TikTok Ads Manager" },
      tip: {
        fr: "⚠️ TikTok est strict sur la modération. Les secteurs interdits (CBD, paris, contenus adultes…) sont automatiquement rejetés.",
        en: "⚠️ TikTok is strict on moderation. Forbidden sectors (CBD, gambling, adult content…) are auto-rejected.",
      },
      tipVariant: "warn",
    },
    {
      id: "billing",
      icon: "💳",
      title: { fr: "Moyen de paiement", en: "Payment method" },
      subtitle: {
        fr: "Sans paiement, vos pubs ne démarreront pas",
        en: "Without payment, your ads won't start",
      },
      whatTitle: { fr: "Comment TikTok vous facture ?", en: "How does TikTok bill you?" },
      whatDesc: {
        fr: "TikTok est en mode **prépayé** par défaut : vous chargez votre compte avec un montant, et vos pubs dépensent jusqu'à épuisement. Possibilité de basculer en post-payé après quelques semaines d'usage.",
        en: "TikTok defaults to **prepaid**: you load your account with an amount, and ads spend until it's used up. Switch to postpaid possible after a few weeks of activity.",
      },
      question: {
        fr: "Votre Ad Account TikTok a-t-il un mode de paiement actif ?",
        en: "Does your TikTok Ad Account have an active payment method?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Ajouter un mode de paiement — 3 étapes", en: "Add a payment method — 3 steps" },
      howToSteps: [
        {
          fr: "Dans Ads Manager, cliquez sur l'icône paramètres → Payment → Add Payment Method.",
          en: "In Ads Manager, click settings icon → Payment → Add Payment Method.",
        },
        {
          fr: "Choisissez Carte bancaire. TikTok accepte Visa, Mastercard, AmEx.",
          en: "Pick Credit Card. TikTok accepts Visa, Mastercard, AmEx.",
        },
        {
          fr: "Faites un premier crédit (minimum souvent 20$/€) pour activer les campagnes.",
          en: "Make a first top-up (often $/€20 minimum) to activate campaigns.",
        },
      ],
      externalUrl: "https://ads.tiktok.com/i18n/account_setting/payment",
      openLinkLabel: { fr: "Ouvrir la facturation TikTok", en: "Open TikTok billing" },
      tip: {
        fr: "💡 TikTok recharge automatiquement votre compte quand le solde devient bas si vous activez l'auto-recharge.",
        en: "💡 TikTok auto-tops your account when balance gets low if you enable auto-recharge.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de lancer vos campagnes TikTok",
      en: "Final step before launching your TikTok campaigns",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers TikTok pour autoriser WanaPush à accéder à vos comptes publicitaires.",
      en: "You'll be redirected to TikTok to authorize WanaPush to access your ad accounts.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      {
        fr: "Lire et gérer vos Ad Accounts TikTok",
        en: "Read and manage your TikTok Ad Accounts",
      },
      {
        fr: "Créer et gérer vos campagnes",
        en: "Create and manage your campaigns",
      },
      {
        fr: "Uploader des vidéos en tant que ressources publicitaires",
        en: "Upload videos as ad assets",
      },
      {
        fr: "Récupérer les KPIs (vues, CTR, coût, conversions)",
        en: "Fetch KPIs (views, CTR, cost, conversions)",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe TikTok. La connexion utilise OAuth, vous restez maître de l'autorisation.",
      en: "🔒 WanaPush never stores your TikTok password. The connection uses OAuth, you stay in control.",
    },
    actionLabel: { fr: "Se connecter avec TikTok", en: "Sign in with TikTok" },
    cancelHint: {
      fr: "Vous pouvez révoquer l'accès à tout moment dans les paramètres de votre Business Center.",
      en: "You can revoke access any time in your Business Center settings.",
    },
    noPageHint: {
      title: {
        fr: "Pas encore de TikTok Business Center ?",
        en: "No TikTok Business Center yet?",
      },
      body: {
        fr: "TikTok Ads exige un **Business Center** (gratuit) puis un **Ad Account** dedans. Allez sur business.tiktok.com → « S'inscrire » → renseignez nom d'entreprise + email pro + secteur. Validation TikTok sous 24-48h (vérifient que vous n'êtes pas dans un secteur banni : crypto, armes, contenus pour adultes, etc.). Ensuite créez un Ad Account avec votre devise + fuseau horaire.",
        en: "TikTok Ads requires a **Business Center** (free) and an **Ad Account** inside it. Go to business.tiktok.com → 'Sign up' → enter business name + work email + industry. TikTok review within 24-48h (they check you're not in a banned vertical: crypto, weapons, adult content, etc.). Then create an Ad Account with your currency + timezone.",
      },
      ctaLabel: {
        fr: "Créer mon TikTok Business Center",
        en: "Create my TikTok Business Center",
      },
      ctaUrl: "https://business.tiktok.com/",
      errorMarkers: ["No ad account", "Aucun ad account", "no_business_center"],
    },
  },

  success: {
    title: { fr: "🎉 C'est tout bon !", en: "🎉 You're all set!" },
    subtitle: {
      fr: "TikTok Ads est connecté à WanaPush",
      en: "TikTok Ads is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant créer vos premières campagnes TikTok avec génération IA de hooks vidéo et de copies adaptées au format vertical.",
      en: "You can now create your first TikTok campaigns with AI-generated hooks and copy tailored to vertical video.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Lancer votre première campagne In-Feed avec hooks générés par l'IA",
        en: "Launch your first In-Feed campaign with AI-generated hooks",
      },
      {
        fr: "Configurer le pixel TikTok pour tracker les conversions",
        en: "Set up the TikTok pixel to track conversions",
      },
      {
        fr: "Connecter d'autres plateformes (Meta, Google, LinkedIn)",
        en: "Connect other platforms (Meta, Google, LinkedIn)",
      },
    ],
    createCampaignLabel: { fr: "Créer ma première campagne", en: "Create my first campaign" },
    backLabel: { fr: "Retour au tableau de bord Ads", en: "Back to Ads dashboard" },
  },
};
