/**
 * Utilitaires pour la gestion des dates dans SuccessFuel
 */
import { getCurrentLocale } from './locale';

/**
 * Formate une date locale
 * @param date - La date à formater
 * @param locale - La locale à utiliser (par défaut la locale courante de l'utilisateur)
 * @param options - Options de formatage
 * @returns La date formatée
 */
export function formatLocalDate(date: Date | string | number, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const formatLocale = locale || getCurrentLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  return new Intl.DateTimeFormat(formatLocale, options || defaultOptions).format(dateObj);
}

/**
 * Formate une date et heure
 * @param date - La date à formater
 * @param locale - La locale à utiliser (par défaut la locale courante de l'utilisateur)
 * @returns La date et heure formatées
 */
export function formatDateTime(date: Date | string | number, locale?: string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const formatLocale = locale || getCurrentLocale();

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat(formatLocale, options).format(dateObj);
}

/**
 * Ajoute des jours à une date
 * @param date - La date de départ
 * @param days - Nombre de jours à ajouter
 * @returns La nouvelle date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Vérifie si une date est aujourd'hui
 * @param date - La date à vérifier
 * @param locale - La locale à utiliser (par défaut 'fr-FR')
 * @returns True si la date est aujourd'hui
 */
export function isToday(date: Date, locale: string = 'fr-FR'): boolean {
  const today = new Date();
  const dateToCheck = new Date(date);
  
  // Convertir en UTC pour éviter les problèmes de fuseau horaire
  const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateToCheckUTC = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate());
  
  return todayUTC.getTime() === dateToCheckUTC.getTime();
}

/**
 * Vérifie si une date est ce mois
 * @param date - La date à vérifier
 * @returns True si la date est ce mois
 */
export function isThisMonth(date: Date): boolean {
  const today = new Date();
  const dateToCheck = new Date(date);
  
  return dateToCheck.getMonth() === today.getMonth() &&
         dateToCheck.getFullYear() === today.getFullYear();
}

/**
 * Vérifie si une date est cette année
 * @param date - La date à vérifier
 * @returns True si la date est cette année
 */
export function isThisYear(date: Date): boolean {
  const today = new Date();
  const dateToCheck = new Date(date);
  
  return dateToCheck.getFullYear() === today.getFullYear();
}

/**
 * Obtient le nombre de jours dans un mois
 * @param month - Mois (0-11)
 * @param year - Année
 * @returns Le nombre de jours dans le mois
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Obtient le numéro de semaine
 * @param date - La date
 * @returns Le numéro de semaine
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Obtient le début de la semaine
 * @param date - La date
 * @returns Le début de la semaine
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Dimanche est 0
  return new Date(d.setDate(diff));
}

/**
 * Obtient la fin de la semaine
 * @param date - La date
 * @returns La fin de la semaine
 */
export function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  return addDays(startOfWeek, 6);
}

/**
 * Obtient le début du mois
 * @param date - La date
 * @returns Le début du mois
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Obtient la fin du mois
 * @param date - La date
 * @returns La fin du mois
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Obtient le début de l'année
 * @param date - La date
 * @returns Le début de l'année
 */
export function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Obtient la fin de l'année
 * @param date - La date
 * @returns La fin de l'année
 */
export function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

/**
 * Parse une date locale
 * @param dateString - La chaîne de date
 * @param locale - La locale à utiliser (par défaut 'fr-FR')
 * @returns La date parsée
 */
export function parseLocalDate(dateString: string, locale: string = 'fr-FR'): Date {
  // Pour la France, le format est généralement DD/MM/YYYY
  if (locale === 'fr-FR') {
    const [day, month, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Pour d'autres locales, on peut étendre cette logique
  return new Date(dateString);
}