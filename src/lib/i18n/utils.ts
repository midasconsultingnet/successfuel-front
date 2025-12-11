// src/lib/i18n/utils.ts

import { I18N_CONFIG } from './config';
import { type Language } from './config';

/**
 * Vérifie si une langue est supportée
 * @param lang La langue à vérifier
 * @returns true si la langue est supportée, false sinon
 */
export function isSupportedLanguage(lang: string): lang is Language {
  return I18N_CONFIG.supportedLanguages.includes(lang as Language);
}

/**
 * Récupère la liste des langues supportées
 * @returns Array des codes de langues supportées
 */
export function getSupportedLanguages(): readonly string[] {
  return I18N_CONFIG.supportedLanguages;
}

/**
 * Vérifie si un module de traduction est valide
 * @param module Le module à vérifier
 * @returns true si le module est supporté, false sinon
 */
export function isValidModule(module: string): boolean {
  return I18N_CONFIG.modules.includes(module as any);
}

/**
 * Convertit une chaîne de caractères en clé de traduction valide
 * @param str La chaîne à convertir
 * @returns Une clé de traduction formatée
 */
export function formatTranslationKey(str: string): string {
  // Remplacer les espaces et caractères spéciaux par des underscores
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Supprimer les caractères spéciaux
    .replace(/[\s-]+/g, '_')    // Remplacer les espaces par des underscores
    .trim();
}

/**
 * Fonction pour obtenir le nom complet d'une langue à partir de son code
 * @param langCode Le code de la langue
 * @returns Le nom complet de la langue
 */
export function getLanguageName(langCode: string): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    fr: 'Français'
  };
  
  return languageNames[langCode] || langCode;
}

/**
 * Fonction pour charger dynamiquement un module de traduction
 * @param language La langue cible
 * @param module Le module à charger
 * @returns Une promesse résolue quand le module est chargé
 */
export async function dynamicImportTranslations(language: Language, module: string): Promise<any> {
  if (!isSupportedLanguage(language) || !isValidModule(module)) {
    throw new Error(`Module ou langue non supporté: ${module} - ${language}`);
  }

  // Import dynamique basé sur les paramètres
  const importPath = `./${module}/${language}.json`;
  return await import(/* @vite-ignore */ importPath);
}