// src/lib/i18n/translationManager.ts

import { I18N_CONFIG, type Language, type Module } from './config';

// Interface pour les traductions
export interface Translations {
  [key: string]: string | Translations;
}

// Interface pour les langues supportées
export interface LanguageResources {
  [language: string]: {
    [module: string]: Translations;
  };
}

// Charger dynamiquement les traductions
const resources: LanguageResources = {
  en: {},
  fr: {}
};

// Fonction utilitaire pour charger un module de traduction
export async function loadTranslationModule(language: Language, module: Module): Promise<Translations> {
  if (resources[language] && resources[language][module]) {
    return resources[language][module];
  }

  try {
    let translations: Translations;

    // Charger le module de traduction spécifique
    switch (module) {
      case 'common':
        translations = await import(/* @vite-ignore */ `./common/${language}.json`).then(m => m.default);
        break;
      case 'navigation':
        translations = await import(/* @vite-ignore */ `./navigation/${language}.json`).then(m => m.default);
        break;
      default:
        throw new Error(`Module de traduction '${module}' non trouvé`);
    }

    // S'assurer que l'objet pour cette langue existe
    if (!resources[language]) {
      resources[language] = {};
    }

    // Enregistrer le module dans les ressources
    resources[language][module] = translations;
    return translations;
  } catch (error) {
    console.error(`Erreur lors du chargement du module de traduction '${module}' pour la langue '${language}':`, error);
    return {};
  }
}

// Fonction pour charger toutes les traductions d'une langue
export async function loadLanguage(language: Language): Promise<void> {
  const allLoads = I18N_CONFIG.modules.map(module => loadTranslationModule(language, module));
  await Promise.all(allLoads);
}

// Fonction pour récupérer une traduction
export async function getTranslationAsync(language: Language, key: string, module: Module): Promise<string> {
  // Vérifier d'abord si le module est chargé
  if (!resources[language] || !resources[language][module]) {
    // Charger le module si ce n'est pas encore fait
    await loadTranslationModule(language, module);
  }

  const keys = key.split('.');
  let current: any = resources[language][module];

  for (const k of keys) {
    if (current && typeof current === 'object' && current[k] !== undefined) {
      current = current[k];
    } else {
      return key; // Retourne la clé si la traduction n'est pas trouvée
    }
  }

  return typeof current === 'string' ? current : key;
}

// Fonction synchrone pour la compatibilité
export function getTranslation(language: Language, key: string, module: Module): string {
  // Vérifier d'abord si le module est chargé
  if (!resources[language] || !resources[language][module]) {
    // Ne charger le module que si on est dans un contexte asynchrone
    // Sinon, retourner la clé et laisser le système asynchrone gérer
    console.warn(`Module de traduction '${module}' non chargé pour la langue '${language}'`);
    return key;
  }

  const keys = key.split('.');
  let current: any = resources[language][module];

  for (const k of keys) {
    if (current && typeof current === 'object' && current[k] !== undefined) {
      current = current[k];
    } else {
      return key; // Retourne la clé si la traduction n'est pas trouvée
    }
  }

  return typeof current === 'string' ? current : key;
}

// Exporter le type Language pour qu'il soit disponible ailleurs
export type { Language, Module };