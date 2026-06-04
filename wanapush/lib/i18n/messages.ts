// Dictionnaire bilingue FR/EN — clés réutilisables (chrome du wizard, communs).
// Le contenu spécifique aux plateformes vit dans lib/onboarding/platforms/*.ts
// sous forme de LocalizedString { fr, en }.

export const fr = {
  // ─── Generic UI ───
  "lang.fr": "Français",
  "lang.en": "English",
  "common.next": "Suivant",
  "common.back": "Retour",
  "common.skip": "Passer",
  "common.continue": "Continuer",
  "common.finish": "Terminer",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.cancel": "Annuler",
  "common.openInNewTab": "Ouvrir dans un nouvel onglet",
  "common.done": "C'est fait, suivant",
  "common.help": "Aide",

  // ─── Wizard chrome ───
  "wizard.step": "Étape",
  "wizard.of": "sur",
  "wizard.estimatedTime": "Temps estimé : {minutes} min",
  "wizard.exitConfirm": "Voulez-vous vraiment quitter ? Votre progression est sauvegardée.",
  "wizard.exit": "Quitter",
  "wizard.resumeBanner": "Vous reprenez là où vous étiez resté(e).",

  // ─── Sélection des comptes (étape générique post-OAuth, utilisée par toutes les plateformes ads et social) ───
  "selectAccount.title": "Choisir vos comptes",
  "selectAccount.subtitle": "Sélectionnez les comptes à gérer via WanaPush",
  "selectAccount.intro":
    "Voici les comptes auxquels vous avez accès. Cochez ceux que vous voulez gérer depuis WanaPush. Vous pourrez en ajouter ou retirer plus tard.",
  "selectAccount.loading": "Récupération de vos comptes…",
  "selectAccount.empty":
    "Aucun compte trouvé. Vérifiez que la connexion s'est bien passée, puis revenez.",
  "selectAccount.selectAll": "Tout sélectionner",
  "selectAccount.deselectAll": "Tout désélectionner",
  "selectAccount.confirm": "Connecter les comptes sélectionnés",
  "selectAccount.unnamed": "Compte sans nom",
} as const;

export type MessageKey = keyof typeof fr;

export const en: Record<MessageKey, string> = {
  "lang.fr": "Français",
  "lang.en": "English",
  "common.next": "Next",
  "common.back": "Back",
  "common.skip": "Skip",
  "common.continue": "Continue",
  "common.finish": "Finish",
  "common.yes": "Yes",
  "common.no": "No",
  "common.cancel": "Cancel",
  "common.openInNewTab": "Open in new tab",
  "common.done": "Done, next",
  "common.help": "Help",

  "wizard.step": "Step",
  "wizard.of": "of",
  "wizard.estimatedTime": "Estimated time: {minutes} min",
  "wizard.exitConfirm": "Are you sure you want to leave? Your progress is saved.",
  "wizard.exit": "Exit",
  "wizard.resumeBanner": "Resuming where you left off.",

  "selectAccount.title": "Pick your accounts",
  "selectAccount.subtitle": "Select the accounts to manage via WanaPush",
  "selectAccount.intro":
    "Here are the accounts you have access to. Check the ones you want to manage from WanaPush. You can add or remove them later.",
  "selectAccount.loading": "Fetching your accounts…",
  "selectAccount.empty":
    "No account found. Make sure the connection worked, then come back.",
  "selectAccount.selectAll": "Select all",
  "selectAccount.deselectAll": "Deselect all",
  "selectAccount.confirm": "Connect selected accounts",
  "selectAccount.unnamed": "Unnamed account",
};

export type Locale = "fr" | "en";
export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";

export const messages: Record<Locale, Record<MessageKey, string>> = { fr, en };
