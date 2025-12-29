/**
 * Utilitaires généraux pour SuccessFuel
 */

/**
 * Clone profondément un objet
 * @param obj - L'objet à cloner
 * @returns Une copie profonde de l'objet
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj as T;
}

/**
 * Retarde l'exécution d'une fonction
 * @param func - La fonction à exécuter
 * @param wait - Le délai en millisecondes
 * @returns Une fonction wrapper
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Limite la fréquence d'exécution d'une fonction
 * @param func - La fonction à exécuter
 * @param limit - Le délai minimum entre deux exécutions
 * @returns Une fonction throttled
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let timeoutId: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      timeoutId = setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Met en pause l'exécution pendant un certain temps
 * @param ms - Le délai en millisecondes
 * @returns Une promesse résolue après le délai
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Génère un identifiant unique
 * @returns Un identifiant unique
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Met la première lettre en majuscule
 * @param str - La chaîne à transformer
 * @returns La chaîne avec la première lettre en majuscule
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convertit une chaîne en camelCase
 * @param str - La chaîne à convertir
 * @returns La chaîne en camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Convertit une chaîne en kebab-case
 * @param str - La chaîne à convertir
 * @returns La chaîne en kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Tronque une chaîne de caractères
 * @param str - La chaîne à tronquer
 * @param maxLength - La longueur maximale
 * @param suffix - Le suffixe à ajouter (par défaut '...')
 * @returns La chaîne tronquée
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Retire les accents d'une chaîne
 * @param str - La chaîne à traiter
 * @returns La chaîne sans accents
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convertit une chaîne en slug
 * @param str - La chaîne à convertir
 * @returns Le slug
 */
export function slugify(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Compare deux objets
 * @param obj1 - Premier objet
 * @param obj2 - Deuxième objet
 * @returns True si les objets sont égaux, false sinon
 */
export function compareObjects(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!compareObjects(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Retourne les propriétés différentes entre deux objets
 * @param obj1 - Premier objet
 * @param obj2 - Deuxième objet
 * @returns Un objet contenant les différences
 */
export function objectDiff(obj1: any, obj2: any): any {
  const diff: any = {};
  
  for (const key in obj1) {
    if (key in obj2) {
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
        const nestedDiff = objectDiff(obj1[key], obj2[key]);
        if (Object.keys(nestedDiff).length > 0) {
          diff[key] = nestedDiff;
        }
      } else if (obj1[key] !== obj2[key]) {
        diff[key] = { old: obj1[key], new: obj2[key] };
      }
    } else {
      diff[key] = { old: obj1[key], new: undefined };
    }
  }
  
  for (const key in obj2) {
    if (!(key in obj1)) {
      diff[key] = { old: undefined, new: obj2[key] };
    }
  }
  
  return diff;
}