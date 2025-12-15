/**
 * Utilitaires de validation pour SuccessFuel
 */
import { getCurrentLocale } from './locale';

/**
 * Valide une adresse e-mail
 * @param email - L'adresse e-mail à valider
 * @returns True si l'adresse e-mail est valide
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide un numéro de téléphone
 * @param phone - Le numéro de téléphone à valider
 * @returns True si le numéro de téléphone est valide
 */
export function validatePhoneNumber(phone: string): boolean {
  // Format général pour les numéros internationaux
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Valide un numéro de téléphone français
 * @param phone - Le numéro de téléphone à valider
 * @returns True si le numéro de téléphone français est valide
 */
export function validateFrenchPhoneNumber(phone: string): boolean {
  // Format pour les numéros français: 06XXXXXXXX ou +336XXXXXXXX
  const frenchPhoneRegex = /^(\+33|0)[1-9](\d{8})$/;
  return frenchPhoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Valide un code numérique
 * @param code - Le code à valider
 * @param length - Longueur attendue du code
 * @returns True si le code est valide
 */
export function validateNumericCode(code: string, length?: number): boolean {
  const regex = length ? new RegExp(`^\\d{${length}}$`) : /^\d+$/;
  return regex.test(code);
}

/**
 * Valide qu'une valeur est requise
 * @param value - La valeur à valider
 * @returns True si la valeur est présente
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

/**
 * Valide la longueur minimale d'une chaîne
 * @param value - La chaîne à valider
 * @param minLength - Longueur minimale
 * @returns True si la longueur est suffisante
 */
export function validateMinLength(value: string, minLength: number): boolean {
  return typeof value === 'string' && value.length >= minLength;
}

/**
 * Valide la longueur maximale d'une chaîne
 * @param value - La chaîne à valider
 * @param maxLength - Longueur maximale
 * @returns True si la longueur est valide
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  return typeof value === 'string' && value.length <= maxLength;
}

/**
 * Valide une valeur minimale
 * @param value - La valeur à valider
 * @param minValue - Valeur minimale
 * @returns True si la valeur est supérieure ou égale au minimum
 */
export function validateMinValue(value: number, minValue: number): boolean {
  return typeof value === 'number' && value >= minValue;
}

/**
 * Valide une valeur maximale
 * @param value - La valeur à valider
 * @param maxValue - Valeur maximale
 * @returns True si la valeur est inférieure ou égale au maximum
 */
export function validateMaxValue(value: number, maxValue: number): boolean {
  return typeof value === 'number' && value <= maxValue;
}

/**
 * Valide avec une expression régulière
 * @param value - La valeur à valider
 * @param regex - L'expression régulière
 * @returns True si la valeur correspond à l'expression
 */
export function validateRegex(value: string, regex: RegExp): boolean {
  return typeof value === 'string' && regex.test(value);
}

/**
 * Valide qu'un ID est unique dans une liste
 * @param id - L'ID à valider
 * @param list - La liste d'IDs existants
 * @returns True si l'ID est unique
 */
export function validateUniqueId(id: string, list: string[]): boolean {
  return !list.includes(id);
}

/**
 * Valide qu'une date est valide
 * @param date - La date à valider
 * @returns True si la date est valide
 */
export function validateDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Valide le format d'une date basé sur la locale
 * @param dateString - La chaîne de date à valider
 * @param locale - La locale à utiliser pour la validation (par défaut la locale courante de l'utilisateur)
 * @returns True si le format est valide
 */
export function validateDateFormat(dateString: string, locale?: string): boolean {
  const currentLocale = locale || getCurrentLocale();

  // Déterminer le format attendu en fonction de la locale
  let dateRegex: RegExp;
  let extractParts: (str: string) => number[];

  if (currentLocale.startsWith('fr')) {
    // Format français: DD/MM/YYYY
    dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    extractParts = (str) => str.split('/').map(Number).reverse(); // [year, month, day]
  } else if (currentLocale.startsWith('en')) {
    // Format américain: MM/DD/YYYY
    dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    extractParts = (str) => {
      const parts = str.split('/').map(Number);
      return [parts[2], parts[0], parts[1]]; // [year, month, day]
    };
  } else {
    // Format international: YYYY-MM-DD
    dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
    extractParts = (str) => str.split('-').map(Number); // [year, month, day]
  }

  if (!dateRegex.test(dateString)) {
    return false;
  }

  const [year, month, day] = extractParts(dateString);
  const date = new Date(year, month - 1, day);

  // Vérifier si la date est valide (ex: pas 30 février)
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

/**
 * Valide qu'une heure est valide
 * @param time - L'heure à valider
 * @returns True si l'heure est valide
 */
export function validateTime(time: string): boolean {
  // Format HH:MM ou HH:MM:SS
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
}

/**
 * Valide le format d'une heure
 * @param timeString - La chaîne d'heure à valider
 * @returns True si le format est valide
 */
export function validateTimeFormat(timeString: string): boolean {
  return validateTime(timeString);
}