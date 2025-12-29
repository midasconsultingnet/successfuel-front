/**
 * Service de configuration locale pour SuccessFuel
 * Gère les paramètres régionaux comme la langue et la devise
 */

// Types pour la configuration locale
export interface LocaleConfig {
  language: string; // ex: 'fr', 'en'
  currency: string; // ex: 'XOF', 'USD'
  locale: string;   // ex: 'fr-FR', 'en-US' (pour Intl APIs)
}

// Configuration par défaut
const DEFAULT_CONFIG: LocaleConfig = {
  language: 'fr',
  currency: 'XOF',
  locale: 'fr-FR'
};

/**
 * Obtient la configuration locale stockée
 * @returns La configuration locale ou la configuration par défaut
 */
export function getLocaleConfig(): LocaleConfig {
  // Essayer d'abord de récupérer depuis localStorage
  if (typeof window !== 'undefined') {
    // Essayer la nouvelle structure (objet unique)
    const storedConfig = localStorage.getItem('successfuel.locale');
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        return {
          ...DEFAULT_CONFIG,
          ...parsed
        };
      } catch (error) {
        console.warn('Erreur de parsing de la configuration locale:', error);
      }
    }

    // Si la nouvelle structure n'existe pas, essayer les clés séparées existantes
    const storedLanguage = localStorage.getItem('language');
    const storedCurrency = localStorage.getItem('currency');

    if (storedLanguage || storedCurrency) {
      return {
        ...DEFAULT_CONFIG,
        language: storedLanguage || DEFAULT_CONFIG.language,
        currency: storedCurrency || DEFAULT_CONFIG.currency,
        locale: `${storedLanguage || DEFAULT_CONFIG.language}-${(storedLanguage || DEFAULT_CONFIG.language).toUpperCase()}`
      };
    }
  }

  // Essayer d'obtenir la langue depuis l'auth store ou i18n
  try {
    // Note: Ces imports sont conditionnels car ils peuvent ne pas être disponibles dans tous les contextes
    let language = DEFAULT_CONFIG.language;
    let currency = DEFAULT_CONFIG.currency;

    // Tenter de récupérer la langue depuis localStorage (plus fiable)
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem('language');
      if (storedLanguage && ['fr', 'en'].includes(storedLanguage)) {
        language = storedLanguage;
      }
    }

    return {
      language,
      currency,
      locale: languageToLocale(language)
    };
  } catch (error) {
    // Si l'accès au store échoue, utiliser les valeurs par défaut
    console.error('Erreur lors de la récupération de la configuration locale:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde la configuration locale
 * @param config - La configuration à sauvegarder
 */
export function saveLocaleConfig(config: Partial<LocaleConfig>): void {
  if (typeof window !== 'undefined') {
    const currentConfig = getLocaleConfig();
    const newConfig = {
      ...currentConfig,
      ...config
    };

    // Sauvegarder dans localStorage
    localStorage.setItem('successfuel.locale', JSON.stringify(newConfig));

    // Mettre à jour la locale pour Intl APIs
    newConfig.locale = `${newConfig.language}-${newConfig.language.toUpperCase()}`;
    localStorage.setItem('successfuel.locale', JSON.stringify(newConfig));
  }
}

/**
 * Obtient la langue actuelle
 * @returns La langue (ex: 'fr', 'en')
 */
export function getCurrentLanguage(): string {
  const config = getLocaleConfig();
  return config.language;
}

/**
 * Obtient la devise actuelle
 * @returns La devise (ex: 'XOF', 'USD')
 */
export function getCurrentCurrency(): string {
  const config = getLocaleConfig();
  return config.currency;
}

/**
 * Obtient la locale pour Intl APIs
 * @returns La locale (ex: 'fr-FR', 'en-US')
 */
export function getCurrentLocale(): string {
  const config = getLocaleConfig();
  return config.locale;
}

/**
 * Convertit un code de langue court en locale complète
 * @param language - Le code de langue court (ex: 'fr', 'en')
 * @returns La locale complète (ex: 'fr-FR', 'en-US')
 */
export function languageToLocale(language: string): string {
  // Mapping simple - pourrait être étendu pour plus de langues
  const localeMap: { [key: string]: string } = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'es': 'es-ES',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ar': 'ar-SA',
    'ru': 'ru-RU',
    'sw': 'sw-TZ' // Pour le swahili, si nécessaire
  };

  return localeMap[language] || `${language}-${language.toUpperCase()}`;
}

/**
 * Charge les paramètres régionaux pour une utilisation immédiate
 * @returns Un objet avec la langue, la devise et la locale
 */
export async function loadLocaleSettings(): Promise<LocaleConfig> {
  // La configuration est déjà chargée depuis localStorage
  const config = getLocaleConfig();

  // On pourrait ajouter ici des appels API pour obtenir des paramètres spécifiques à l'utilisateur
  // Mais pour l'instant, on se base sur la configuration locale

  return config;
}

/**
 * Met à jour les paramètres régionaux
 * @param language - Le code de langue (optionnel)
 * @param currency - Le code de devise (optionnel)
 */
export async function updateLocaleSettings(language?: string, currency?: string): Promise<void> {
  const currentConfig = getLocaleConfig();
  const newConfig: LocaleConfig = {
    ...currentConfig,
    language: language || currentConfig.language,
    currency: currency || currentConfig.currency,
  };

  newConfig.locale = languageToLocale(newConfig.language);

  // Sauvegarder la nouvelle configuration
  saveLocaleConfig(newConfig);

  // Potentiellement, notifier les autres parties de l'application du changement
  // Cela pourrait déclencher des événements ou mettre à jour des stores
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('localeChanged', {
      detail: newConfig
    }));
  }
}