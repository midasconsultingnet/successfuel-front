// src/lib/i18n/config.ts

// Configuration pour le système de traduction
export const I18N_CONFIG = {
  // Langue par défaut
  defaultLanguage: 'en',

  // Langues supportées
  supportedLanguages: ['en', 'fr'] as const,

  // Modules de traduction disponibles
  modules: [
    'common',
    'navigation',
    'sales',
    'profile',
    'structure',
    'configuration'
  ] as const,

  // Emplacement des fichiers de traduction
  translationPath: 'src/lib/i18n',

  // Clé pour le stockage de la langue dans localStorage
  storageKey: 'language',

  // Format des fichiers de traduction
  fileExtension: '.json'
} as const;

export type Language = typeof I18N_CONFIG.supportedLanguages[number];
export type Module = typeof I18N_CONFIG.modules[number];

/**
 * Fonction utilitaire pour ajouter dynamiquement une langue
 * @param langCode Le code de la nouvelle langue à ajouter
 * @returns Une nouvelle configuration avec la langue ajoutée
 */
export function addLanguage(langCode: string): void {
  // Note: Cette fonction est à utiliser pendant le développement
  // En production, les langues devraient être définies statiquement
  console.warn(`Pour ajouter la langue ${langCode} de manière permanente, mettez à jour le fichier config.ts`);
}