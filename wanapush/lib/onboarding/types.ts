// Schéma des wizards d'onboarding par plateforme.
// Chaque plateforme exporte un PlatformWizardConfig consommé par le composant
// générique AdsSetupWizard. Les strings sont stockées en LocalizedString
// (objet { fr, en }) directement dans la config.

export type LocalizedString = { fr: string; en: string };

export type PlatformWizardConfig = {
  /** "ads" pour les wizards de comptes pub, "social" pour les wizards de réseaux sociaux. */
  kind: "ads" | "social";
  /** Identifiant interne de la plateforme (ex: "META_ADS", "FACEBOOK"). Doit matcher la colonne `platform` dans la DB. */
  platform: string;
  /** Emoji affiché en tête. */
  icon: string;
  /** Slug d'URL — utilisé pour /ads/setup/<slug>/ ou /social/setup/<slug>/. */
  slug: string;
  /** URL de démarrage OAuth (Next.js API route). */
  oauthStartUrl: string;
  /** Couleur d'arrière-plan du bouton OAuth (classes Tailwind). */
  oauthButtonBg: string;
  /** Glyph affiché sur le bouton OAuth (ex: "f" pour Facebook, "G" pour Google). */
  oauthButtonGlyph: string;
  /** Temps total estimé en minutes. */
  estimatedMinutes: number;

  /** API qui liste les comptes connectés (ads ou social). DELETE = `${accountsApiPath}/${id}`. */
  accountsApiPath: string;
  /** Page de retour pour le bouton "Créer ma première campagne / mon premier post". */
  successPrimaryCtaHref: string;
  /** Page de retour pour le bouton secondaire. */
  successSecondaryCtaHref: string;
  /** Path racine pour la sortie du wizard. */
  exitHref: string;

  /** Étape d'introduction. */
  welcome: WelcomeStepConfig;
  /** Étapes de checkpoint (Yes/Help — tutoriel intégré). */
  checkpoints: CheckpointStepConfig[];
  /** Étape OAuth. */
  connect: ConnectStepConfig;
  /** Étape finale de succès. */
  success: SuccessStepConfig;
};

export type WelcomeStepConfig = {
  title: LocalizedString;
  subtitle: LocalizedString;
  intro: LocalizedString;
  /** Liste des prérequis (3 items typiquement). */
  prerequisites: LocalizedString[];
  timeWarn: LocalizedString;
  /** Label du bouton "Commencer". */
  startLabel: LocalizedString;
};

export type CheckpointStepConfig = {
  /** Identifiant interne (pour debugging). */
  id: string;
  icon: string;
  title: LocalizedString;
  subtitle: LocalizedString;
  /** Carte d'explication "C'est quoi X ?". */
  whatTitle: LocalizedString;
  whatDesc: LocalizedString;
  /** Question Yes/No posée à l'utilisateur. */
  question: LocalizedString;
  haveItLabel: LocalizedString;
  createItLabel: LocalizedString;
  /** Tutoriel "Comment créer X". */
  howToTitle: LocalizedString;
  howToSteps: LocalizedString[];
  /** URL externe vers la page Meta/Google/etc. */
  externalUrl: string;
  openLinkLabel: LocalizedString;
  tip: LocalizedString;
  tipVariant?: "tip" | "warn";
};

export type ConnectStepConfig = {
  title: LocalizedString;
  subtitle: LocalizedString;
  intro: LocalizedString;
  permissionsTitle: LocalizedString;
  permissions: LocalizedString[];
  security: LocalizedString;
  actionLabel: LocalizedString;
  cancelHint: LocalizedString;
  /** Hint procédural affiché juste avant le bouton OAuth — utile pour les plateformes
   * où le flow provider exige des actions non-intuitives (ex. Meta Login for Business
   * qui demande de cliquer "Modifier les paramètres" pour sélectionner les pages). */
  flowTip?: { title: LocalizedString; steps: LocalizedString[] };
};

export type SuccessStepConfig = {
  title: LocalizedString;
  subtitle: LocalizedString;
  intro: LocalizedString;
  nextStepsTitle: LocalizedString;
  nextSteps: LocalizedString[];
  createCampaignLabel: LocalizedString;
  backLabel: LocalizedString;
};
