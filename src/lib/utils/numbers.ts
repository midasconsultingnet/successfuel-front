/**
 * Utilitaires pour la gestion des nombres et des prix dans SuccessFuel
 */
import { getCurrentLocale, getCurrentCurrency } from './locale';

/**
 * Formate un nombre avec des séparateurs de milliers
 * @param value - Le nombre à formater
 * @param decimals - Le nombre de décimales à conserver
 * @param locale - La locale à utiliser (par défaut la locale courante de l'utilisateur)
 * @returns Le nombre formaté en chaîne de caractères
 */
export function formatNumber(value: number | string, decimals: number = 2, locale?: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return 'N/A';
  }

  const formatLocale = locale || getCurrentLocale();

  return new Intl.NumberFormat(formatLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Formate une valeur monétaire
 * @param value - Le montant à formater
 * @param currency - Le code de la devise (par défaut la devise courante de l'utilisateur)
 * @param locale - La locale à utiliser (par défaut la locale courante de l'utilisateur)
 * @returns Le montant formaté en chaîne de caractères
 */
export function formatCurrency(value: number | string, currency?: string, locale?: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return 'N/A';
  }

  const formatLocale = locale || getCurrentLocale();
  const formatCurrency = currency || getCurrentCurrency();

  return new Intl.NumberFormat(formatLocale, {
    style: 'currency',
    currency: formatCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Arrondit une valeur monétaire au centime près
 * @param value - La valeur à arrondir
 * @returns La valeur arrondie
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Arrondit une valeur monétaire à l'unité
 * @param value - La valeur à arrondir
 * @returns La valeur arrondie
 */
export function roundToUnit(value: number): number {
  return Math.round(value);
}

/**
 * Arrondit une valeur à un nombre spécifique de décimales
 * @param value - La valeur à arrondir
 * @param decimals - Le nombre de décimales
 * @returns La valeur arrondie
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calcule un pourcentage
 * @param value - La valeur de base
 * @param percent - Le pourcentage à appliquer
 * @returns Le résultat du calcul
 */
export function calculatePercent(value: number, percent: number): number {
  return value * (percent / 100);
}

/**
 * Formate un pourcentage
 * @param value - La valeur à formater
 * @param locale - La locale à utiliser (par défaut 'fr-FR')
 * @returns Le pourcentage formaté
 */
export function formatPercent(value: number, locale: string = 'fr-FR'): string {
  if (isNaN(value)) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value / 100);
}

/**
 * Vérifie si une valeur est un nombre valide
 * @param value - La valeur à vérifier
 * @returns True si la valeur est un nombre valide, false sinon
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Vérifie si une chaîne peut être convertie en nombre valide
 * @param value - La chaîne à vérifier
 * @returns True si la chaîne peut être convertie en nombre valide, false sinon
 */
export function isValidNumberString(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Convertit une chaîne en nombre, avec une valeur par défaut en cas d'échec
 * @param value - La chaîne à convertir
 * @param defaultValue - La valeur par défaut en cas d'échec (par défaut 0)
 * @returns Le nombre converti ou la valeur par défaut
 */
export function stringToNumber(value: string, defaultValue: number = 0): number {
  if (typeof value !== 'string') {
    return defaultValue;
  }
  
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Calcule une différence entre deux nombres
 * @param a - Première valeur
 * @param b - Deuxième valeur
 * @returns La différence absolue
 */
export function calculateDifference(a: number, b: number): number {
  return Math.abs(a - b);
}

/**
 * Calcule un ratio entre deux nombres
 * @param numerator - Numérateur
 * @param denominator - Dénominateur
 * @returns Le ratio ou 0 si le dénominateur est 0
 */
export function calculateRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

/**
 * Limite une valeur entre un minimum et un maximum
 * @param value - La valeur à limiter
 * @param min - La valeur minimale
 * @param max - La valeur maximale
 * @returns La valeur limitée
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}