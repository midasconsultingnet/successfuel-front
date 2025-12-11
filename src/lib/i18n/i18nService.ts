// src/lib/i18n/i18nService.ts

import { loadLanguage, type Language, getTranslation } from './translationManager';
import { I18N_CONFIG, type Module } from './config';
import { getTranslationWithFallback } from './fallback';

// État global pour le service i18n (préservé entre les rechargements HMR)
if (!globalThis.__i18nState) {
  globalThis.__i18nState = {
    currentLanguage: I18N_CONFIG.defaultLanguage,
    isInitialized: false
  };
}

let currentLanguage: Language = globalThis.__i18nState.currentLanguage as Language;
let isInitialized: boolean = globalThis.__i18nState.isInitialized;

// Fonction pour accéder à l'état global
const getState = () => globalThis.__i18nState;

// Fonction pour initialiser la langue avec gestion du navigateur
export const initializeLanguage = async (): Promise<void> => {
  try {
    let langToLoad: Language = I18N_CONFIG.defaultLanguage;

    // Charger la langue sauvegardée dans localStorage
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem(I18N_CONFIG.storageKey);
      if (savedLang && I18N_CONFIG.supportedLanguages.includes(savedLang as Language)) {
        langToLoad = savedLang as Language;
      } else {
        // Langue sauvegardée non supportée ou non trouvée
      }
    } else {
      // Environnement non-browser
    }

    // Charger les traductions pour tous les modules
    await loadLanguage(langToLoad);
    // Mettre à jour l'état global
    if (globalThis.__i18nState) {
      globalThis.__i18nState.currentLanguage = langToLoad;
      globalThis.__i18nState.isInitialized = true;
    }

    // Mettre à jour les variables locales
    currentLanguage = langToLoad;
    isInitialized = true;

    // Émettre un événement pour notifier que le service est prêt
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('i18nInitialized', { detail: { language: currentLanguage } }));
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la langue :', error);
    isInitialized = true;
  }
};

// Fonction pour vérifier si la langue est supportée
const isSupportedLanguage = (lang: string): lang is Language => {
  return I18N_CONFIG.supportedLanguages.includes(lang as Language);
};

// Variable pour stocker la promesse d'initialisation
let initializationPromise: Promise<void> | null = null;

// Obtenir une traduction spécifique
const translate = async (key: string, module: Module = 'common'): Promise<string> => {
  try {
    // Si le service n'est pas initialisé, attendre l'initialisation
    if (!isInitialized) {
      if (!initializationPromise) {
        initializationPromise = initializeLanguage();
      }
      await initializationPromise;
    }

    // Vérifier si le module est supporté
    if (!I18N_CONFIG.modules.includes(module)) {
      console.warn(`Module de traduction '${module}' non supporté`);
      // Utiliser le module 'common' par défaut
      module = 'common';
    }

    const translation = getTranslationWithFallback(currentLanguage, key, module);
    return translation;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la traduction pour la clé '${key}' dans le module '${module}' :`, error);
    return key; // Retourner la clé d'origine en cas d'erreur
  }
};

// Changer la langue de l'application
const changeLanguage = async (language: string): Promise<void> => {
  if (!isSupportedLanguage(language)) {
    console.error(`Langue non supportée : ${language}`);
    return;
  }

  try {
    // Charger les traductions pour tous les modules dans la nouvelle langue
    await loadLanguage(language as Language);

    // Mettre à jour l'état global
    currentLanguage = language as Language;

    // Sauvegarder la langue dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(I18N_CONFIG.storageKey, language);
    }

    // Émettre un événement pour notifier les composants du changement de langue
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
    }
  } catch (error) {
    console.error(`Erreur lors du changement de langue vers ${language} :`, error);
    throw error;
  }
};

// Obtenir la langue courante
const getCurrentLang = (): Language => {
  return globalThis.__i18nState?.currentLanguage as Language || I18N_CONFIG.defaultLanguage;
};

// Fonction de traduction synchrone qui retourne la clé tant que le système n'est pas prêt
let syncTranslate: (key: string, module?: Module) => string;

// Initialiser la fonction de traduction synchrone
if (typeof window !== 'undefined') {
  // Dans le navigateur, attendre que le DOM soit prêt pour initialiser
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      if (!isInitialized && !initializationPromise) {
        initializationPromise = initializeLanguage();
      }
    });
  } else {
    // Si le DOM est déjà chargé
    if (!isInitialized && !initializationPromise) {
      initializationPromise = initializeLanguage();
    }
  }
}

// Fonction de traduction synchrone
syncTranslate = (key: string, module: Module = 'common'): string => {
  // Utiliser l'état global pour vérifier l'initialisation
  const state = globalThis.__i18nState;
  if (!state?.isInitialized) {
    // Si le service n'est pas encore initialisé, retourner la clé
    // mais lancer l'initialisation en arrière-plan
    if (!initializationPromise) {
      initializationPromise = initializeLanguage();
    }
    return key;
  }

  // Vérifier si le module est supporté
  if (!I18N_CONFIG.modules.includes(module)) {
    console.warn(`Module de traduction '${module}' non supporté`);
    // Utiliser le module 'common' par défaut
    module = 'common';
  }

  console.log(`Recherche de la traduction pour la clé: ${key}, module: ${module}, langue: ${state.currentLanguage}`);
  const translation = getTranslationWithFallback(state.currentLanguage as Language, key, module);
  console.log(`Traduction trouvée: ${translation}`);
  return translation;
};

// Exporter les fonctions principales
export const t = syncTranslate;

export const setLanguage = (lang: string): Promise<void> => {
  return changeLanguage(lang);
};

export const getCurrentLanguage = (): Language => {
  return getCurrentLang();
};

// Exporter une fonction d'initialisation pour les composants qui en ont besoin
export const waitForInitialization = async (): Promise<void> => {
  if (!isInitialized && initializationPromise) {
    await initializationPromise;
  }
  return new Promise(resolve => {
    const checkInitialized = () => {
      if (isInitialized) {
        resolve();
      } else {
        setTimeout(checkInitialized, 10);
      }
    };
    checkInitialized();
  });
};

// Initialiser le service immédiatement dans un environnement navigateur
const state = globalThis.__i18nState;
console.log('Chargement du module i18n, isInitialized:', state?.isInitialized, 'initializationPromise:', !!initializationPromise);
if (typeof window !== 'undefined' && !state?.isInitialized && !initializationPromise) {
  console.log('Lancement initialisation du service i18n...');
  initializationPromise = initializeLanguage();
}

// Exporter le service pour une utilisation avancée si nécessaire
export const i18nService = {
  t: syncTranslate,
  setLanguage: changeLanguage,
  getCurrentLanguage: getCurrentLang,
  waitForInitialization,
  initializeLanguage
};

export default i18nService;