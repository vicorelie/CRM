import type { PlatformWizardConfig } from "../types";

export const linkedinAdsConfig: PlatformWizardConfig = {
  kind: "ads",
  platform: "LINKEDIN_ADS",
  slug: "linkedin-ads",
  icon: "💼",
  oauthStartUrl: "/api/ads/oauth/linkedin_ads/start",
  oauthButtonBg: "bg-[#0A66C2] hover:bg-[#0958a8] shadow-blue-500/20",
  oauthButtonGlyph: "in",
  estimatedMinutes: 15,

  accountsApiPath: "/api/ads/accounts",
  successPrimaryCtaHref: "/ads?tab=builder",
  successSecondaryCtaHref: "/ads",
  exitHref: "/ads",

  welcome: {
    title: { fr: "Connecter LinkedIn Ads à WanaPush", en: "Connect LinkedIn Ads to WanaPush" },
    subtitle: {
      fr: "Touchez les décideurs et professionnels B2B",
      en: "Reach decision-makers and B2B professionals",
    },
    intro: {
      fr: "LinkedIn Ads est THE plateforme pour cibler des professionnels par poste, secteur, taille d'entreprise ou ancienneté. Idéal pour le B2B, le recrutement et les ventes complexes. WanaPush vous guide.",
      en: "LinkedIn Ads is THE platform to target professionals by role, industry, company size or seniority. Ideal for B2B, recruitment and complex sales. WanaPush will guide you.",
    },
    prerequisites: [
      {
        fr: "Un compte LinkedIn personnel actif (avec photo et infos remplies)",
        en: "An active personal LinkedIn account (with photo and filled info)",
      },
      {
        fr: "Une **Page LinkedIn d'entreprise** (vous devez en être admin)",
        en: "A **LinkedIn Company Page** (you must be an admin)",
      },
      {
        fr: "Une carte bancaire au nom de l'entreprise",
        en: "A credit card in the company's name",
      },
    ],
    timeWarn: {
      fr: "Comptez environ 15 minutes. La validation LinkedIn peut prendre 24h à 48h.",
      en: "Plan around 15 minutes. LinkedIn validation may take 24h–48h.",
    },
    startLabel: { fr: "Commencer la configuration", en: "Start setup" },
  },

  checkpoints: [
    {
      id: "company_page",
      icon: "🏛",
      title: { fr: "Page LinkedIn d'entreprise", en: "LinkedIn Company Page" },
      subtitle: {
        fr: "L'identité de votre marque sur LinkedIn (obligatoire pour faire de la pub)",
        en: "Your brand's identity on LinkedIn (required to run ads)",
      },
      whatTitle: { fr: "Pourquoi une Page Entreprise ?", en: "Why a Company Page?" },
      whatDesc: {
        fr: "Toutes vos pubs LinkedIn apparaîtront comme provenant d'une Page entreprise (pas d'un profil personnel). LinkedIn refuse de servir des pubs sans Page rattachée. Vous devez **être admin** de cette Page.",
        en: "All your LinkedIn ads appear as coming from a Company Page (not a personal profile). LinkedIn won't serve ads without a Page. You must **be an admin** of this Page.",
      },
      question: {
        fr: "Avez-vous une Page LinkedIn d'entreprise dont vous êtes admin ?",
        en: "Do you have a LinkedIn Company Page where you are admin?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider à en créer une", en: "No, help me create one" },
      howToTitle: { fr: "Créer une Page Entreprise — 4 étapes", en: "Create a Company Page — 4 steps" },
      howToSteps: [
        {
          fr: "Sur LinkedIn, cliquez sur l'icône « Pour les entreprises » (en haut à droite) → « Créer une Page ».",
          en: "On LinkedIn, click the « Work » icon (top right) → « Create a Company Page ».",
        },
        {
          fr: "Choisissez le type : Petite entreprise (< 200 employés), Moyenne/Grande entreprise (200+), ou Établissement scolaire.",
          en: "Pick the type: Small business (< 200 employees), Medium/Large company (200+), or Educational institution.",
        },
        {
          fr: "Renseignez nom, URL personnalisée, site web, secteur et taille. Ajoutez un logo et une bannière.",
          en: "Fill in name, custom URL, website, industry and size. Add a logo and banner.",
        },
        {
          fr: "Validez et publiez la Page. Encouragez quelques collègues à s'y abonner pour la légitimer.",
          en: "Submit and publish the Page. Have a few colleagues follow it to legitimize it.",
        },
      ],
      externalUrl: "https://www.linkedin.com/company/setup/new/",
      openLinkLabel: { fr: "Créer une Page LinkedIn", en: "Create a LinkedIn Page" },
      tip: {
        fr: "💡 LinkedIn exige un site web valide pour valider la Page. Si vous n'en avez pas, créez-en un (WanaPush peut vous aider !) avant.",
        en: "💡 LinkedIn requires a valid website to verify the Page. If you don't have one, build one (WanaPush can help!) first.",
      },
    },
    {
      id: "campaign_manager",
      icon: "🎯",
      title: { fr: "Compte Campaign Manager", en: "Campaign Manager account" },
      subtitle: {
        fr: "L'interface où vous créerez vos pubs LinkedIn",
        en: "The interface where you'll create LinkedIn ads",
      },
      whatTitle: { fr: "C'est quoi Campaign Manager ?", en: "What is Campaign Manager?" },
      whatDesc: {
        fr: "LinkedIn Campaign Manager (linkedin.com/campaignmanager) est l'équivalent d'Ads Manager Meta ou Google Ads. Un compte Campaign Manager est lié à votre Page Entreprise et à un mode de paiement.",
        en: "LinkedIn Campaign Manager (linkedin.com/campaignmanager) is the equivalent of Meta Ads Manager or Google Ads. A Campaign Manager account links your Company Page to a payment method.",
      },
      question: {
        fr: "Avez-vous un compte Campaign Manager ?",
        en: "Do you have a Campaign Manager account?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Créer un Campaign Manager — 4 étapes", en: "Create a Campaign Manager — 4 steps" },
      howToSteps: [
        {
          fr: "Allez sur linkedin.com/campaignmanager et cliquez sur « Créer un compte ».",
          en: "Go to linkedin.com/campaignmanager and click « Create account ».",
        },
        {
          fr: "Renseignez le nom du compte (ex: « WanaPush B2B »), choisissez votre **devise** (non modifiable ensuite !).",
          en: "Set account name (e.g. « WanaPush B2B »), pick your **currency** (can't be changed later!).",
        },
        {
          fr: "Liez-le à votre Page LinkedIn d'entreprise.",
          en: "Link it to your LinkedIn Company Page.",
        },
        {
          fr: "Validez. Le compte est actif mais en attente d'un mode de paiement.",
          en: "Submit. The account is active but waiting on a payment method.",
        },
      ],
      externalUrl: "https://www.linkedin.com/campaignmanager/",
      openLinkLabel: { fr: "Ouvrir Campaign Manager", en: "Open Campaign Manager" },
      tip: {
        fr: "⚠️ Devise non modifiable après création. Choisissez celle dans laquelle vous voulez payer.",
        en: "⚠️ Currency can't be changed after creation. Pick the one you want to pay in.",
      },
      tipVariant: "warn",
    },
    {
      id: "billing",
      icon: "💳",
      title: { fr: "Moyen de paiement", en: "Payment method" },
      subtitle: {
        fr: "LinkedIn ne sert aucune pub sans paiement valide",
        en: "LinkedIn won't serve any ads without a valid payment",
      },
      whatTitle: {
        fr: "Combien coûte LinkedIn Ads ?",
        en: "How much does LinkedIn Ads cost?",
      },
      whatDesc: {
        fr: "LinkedIn est la plateforme la plus **chère** au CPM (~30€-60€ contre 5-10€ pour Meta). Mais c'est la seule qui cible aussi finement les professionnels B2B. Minimum recommandé : 500€/campagne pour des résultats.",
        en: "LinkedIn is the most **expensive** platform per CPM (~$30-60 vs $5-10 for Meta). But it's the only one with such fine B2B professional targeting. Recommended minimum: $500/campaign for results.",
      },
      question: {
        fr: "Avez-vous configuré un mode de paiement dans Campaign Manager ?",
        en: "Have you set up a payment method in Campaign Manager?",
      },
      haveItLabel: { fr: "Oui", en: "Yes" },
      createItLabel: { fr: "Non, m'aider", en: "No, help me" },
      howToTitle: { fr: "Ajouter un paiement — 3 étapes", en: "Add payment — 3 steps" },
      howToSteps: [
        {
          fr: "Dans Campaign Manager, cliquez sur Comptes → Sélectionnez votre compte → Onglet « Centre de facturation ».",
          en: "In Campaign Manager, click Accounts → Pick your account → « Billing Center » tab.",
        },
        {
          fr: "Cliquez sur « Ajouter une carte ». LinkedIn n'accepte que les cartes bancaires (pas de PayPal).",
          en: "Click « Add a card ». LinkedIn only accepts credit cards (no PayPal).",
        },
        {
          fr: "Renseignez les infos de facturation (nom légal, adresse, n° TVA si EU). LinkedIn fera une petite préautorisation.",
          en: "Enter billing details (legal name, address, VAT/tax number if EU). LinkedIn will do a small pre-auth.",
        },
      ],
      externalUrl: "https://www.linkedin.com/campaignmanager/billing-center",
      openLinkLabel: { fr: "Ouvrir le centre de facturation", en: "Open Billing Center" },
      tip: {
        fr: "💡 LinkedIn facture en post-payé : vous payez à la fin du mois la consommation réelle. Surveillez bien vos plafonds quotidiens.",
        en: "💡 LinkedIn bills post-paid: you pay at month-end for actual usage. Watch your daily caps carefully.",
      },
    },
  ],

  connect: {
    title: { fr: "Autoriser WanaPush", en: "Authorize WanaPush" },
    subtitle: {
      fr: "Dernière étape avant de lancer vos campagnes B2B",
      en: "Final step before launching your B2B campaigns",
    },
    intro: {
      fr: "Vous allez être redirigé(e) vers LinkedIn pour autoriser WanaPush à accéder à vos comptes publicitaires.",
      en: "You'll be redirected to LinkedIn to authorize WanaPush to access your ad accounts.",
    },
    permissionsTitle: {
      fr: "Permissions demandées par WanaPush :",
      en: "Permissions WanaPush will request:",
    },
    permissions: [
      {
        fr: "Lire vos comptes Campaign Manager et Pages Entreprises",
        en: "Read your Campaign Manager accounts and Company Pages",
      },
      {
        fr: "Créer et gérer vos campagnes Sponsored Content & Message Ads",
        en: "Create and manage your Sponsored Content & Message Ads campaigns",
      },
      {
        fr: "Récupérer les performances (impressions, clics, CTR, coût)",
        en: "Fetch performance metrics (impressions, clicks, CTR, cost)",
      },
      {
        fr: "Lire vos audiences sauvegardées",
        en: "Read your saved audiences",
      },
    ],
    security: {
      fr: "🔒 WanaPush ne stocke jamais votre mot de passe LinkedIn. La connexion utilise OAuth 2.0.",
      en: "🔒 WanaPush never stores your LinkedIn password. The connection uses OAuth 2.0.",
    },
    actionLabel: { fr: "Se connecter avec LinkedIn", en: "Sign in with LinkedIn" },
    cancelHint: {
      fr: "Vous pourrez révoquer l'accès depuis vos paramètres LinkedIn → Confidentialité → Autres applications.",
      en: "You can revoke access from your LinkedIn settings → Privacy → Third-party apps.",
    },
  },

  success: {
    title: { fr: "🎉 C'est tout bon !", en: "🎉 You're all set!" },
    subtitle: {
      fr: "LinkedIn Ads est connecté à WanaPush",
      en: "LinkedIn Ads is connected to WanaPush",
    },
    intro: {
      fr: "Vous pouvez maintenant créer vos premières campagnes B2B LinkedIn (Sponsored Content, Message Ads) avec génération IA des copies adaptées au ton professionnel.",
      en: "You can now create your first B2B LinkedIn campaigns (Sponsored Content, Message Ads) with AI-generated copy tuned for a professional tone.",
    },
    nextStepsTitle: { fr: "Et maintenant ?", en: "What's next?" },
    nextSteps: [
      {
        fr: "Importer une liste de leads pour faire du Account-Based Marketing (ABM)",
        en: "Import a leads list for Account-Based Marketing (ABM)",
      },
      {
        fr: "Configurer le tag LinkedIn Insight pour tracker les conversions",
        en: "Set up the LinkedIn Insight Tag to track conversions",
      },
      {
        fr: "Lancer une campagne Sponsored Content avec ciblage par poste",
        en: "Launch a Sponsored Content campaign with job-title targeting",
      },
    ],
    createCampaignLabel: { fr: "Créer ma première campagne", en: "Create my first campaign" },
    backLabel: { fr: "Retour au tableau de bord Ads", en: "Back to Ads dashboard" },
  },
};
