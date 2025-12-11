// src/lib/i18n/index.ts
import { writable } from 'svelte/store';
import type { Language } from './config';

export interface I18nState {
  currentLanguage: Language;
  isInitialized: boolean;
  resources: Record<string, any>;
}

// Store centralisé pour l'état i18n
export const i18nStore = writable<I18nState>({
  currentLanguage: 'en',
  isInitialized: false,
  resources: {}
});

// Fonction d'initialisation
export const initializeI18n = async () => {
  // Charger la langue sauvegardée
  let savedLanguage: Language | null = null;

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language');
    if (saved && ['en', 'fr'].includes(saved)) {
      savedLanguage = saved as Language;
    }
  }

  const langToLoad = savedLanguage || 'en';

  // Charger toutes les ressources
  const resources = await loadAllTranslations(langToLoad);

  i18nStore.set({
    currentLanguage: langToLoad,
    isInitialized: true,
    resources
  });
};

// Charger toutes les traductions
const loadAllTranslations = async (language: Language) => {
  // Charger tous les modules de traduction
  const [common, navigation, sales] = await Promise.all([
    import(`./common/${language}.json`).then(m => m.default),
    import(`./navigation/${language}.json`).then(m => m.default),
    import(`./sales/${language}.json`).then(m => m.default)
  ]);

  return {
    common,
    navigation,
    sales
  };
};

// Fonction pour changer la langue
export const setLanguage = async (language: Language) => {
  const resources = await loadAllTranslations(language);

  i18nStore.update(state => ({
    ...state,
    currentLanguage: language,
    resources
  }));

  // Sauvegarder la langue
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', language);
  }
};

// Fonction utilitaire pour obtenir une traduction
export const getTranslation = (resources: Record<string, any>, key: string, module: 'common' | 'navigation' = 'common'): string => {
  if (!resources || !resources[module]) {
    return key; // Retourne la clé si le module n'est pas chargé
  }

  const keys = key.split('.');
  let current: any = resources[module];

  for (const k of keys) {
    if (current && typeof current === 'object' && current[k] !== undefined) {
      current = current[k];
    } else {
      return key; // Retourne la clé si la traduction n'est pas trouvée
    }
  }

  return typeof current === 'string' ? current : key;
};

// Fonction utilitaire pour créer une fonction de traduction réactive
// (à utiliser dans les composants Svelte 5 avec $derived)
export const createTranslator = () => {
  // On ne peut pas retourner une fonction qui est réactive directement
  // La fonction de traduction doit être utilisée dans un contexte réactif
  return getTranslation;
};