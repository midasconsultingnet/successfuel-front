// Déclaration des types pour étendre globalThis
declare global {
  var __i18nState: {
    currentLanguage: string;
    isInitialized: boolean;
  } | undefined;
}

export {};