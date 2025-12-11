// src/lib/i18n/fallback.ts

import { getTranslation, type Language } from './translationManager';
import { I18N_CONFIG, type Module } from './config';

/**
 * Mécanisme de fallback pour les traductions manquantes
 * Si une traduction n'est pas trouvée dans la langue cible,
 * le système essaie de la trouver dans la langue par défaut (en)
 */
export function getTranslationWithFallback(language: Language, key: string, module: Module): string {
  // Essayer d'abord la langue demandée
  const translation = getTranslation(language, key, module);

  // Si la traduction est identique à la clé, cela signifie qu'elle n'a pas été trouvée
  if (translation === key) {
    // Essayer dans la langue par défaut
    const defaultTranslation = getTranslation(I18N_CONFIG.defaultLanguage as Language, key, module);

    // Si trouvé dans la langue par défaut, retourner cette traduction
    if (defaultTranslation !== key) {
      return defaultTranslation;
    }

    // Si toujours pas trouvé, retourner la clé originale
    console.warn(`Traduction manquante pour la clé '${key}' dans le module '${module}'`);
    return key;
  }

  return translation;
}