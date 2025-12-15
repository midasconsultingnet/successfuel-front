/**
 * Utilitaires de sécurité pour SuccessFuel
 */

/**
 * Génère un ID sécurisé
 * @param length - Longueur de l'ID à générer
 * @returns Un ID aléatoire sécurisé
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Utiliser crypto.getRandomValues si disponible pour une meilleure sécurité
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < array.length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback pour Node.js ou environnements sans window.crypto
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
}

/**
 * Génère un jeton sécurisé
 * @param length - Longueur du jeton
 * @returns Un jeton aléatoire sécurisé
 */
export function generateSecureToken(length: number = 32): string {
  return generateSecureId(length);
}

/**
 * Hachage simple d'une chaîne (ne pas utiliser pour les mots de passe sensibles dans un environnement de production)
 * @param input - La chaîne à hasher
 * @returns Le hash de la chaîne
 */
export async function hashString(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback simple pour des environnements sans crypto API
    // ATTENTION: Cette implémentation est à des fins de démonstration uniquement
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en entier 32 bits
    }
    return hash.toString();
  }
}

/**
 * Vérifie si un hash correspond à une chaîne d'origine
 * @param input - La chaîne d'origine
 * @param hash - Le hash à comparer
 * @returns True si le hash correspond
 */
export async function verifyHash(input: string, hash: string): Promise<boolean> {
  const inputHash = await hashString(input);
  return inputHash === hash;
}

/**
 * Génère une chaîne aléatoire
 * @param length - Longueur de la chaîne
 * @returns Une chaîne aléatoire
 */
export function generateRandomString(length: number): string {
  return generateSecureId(length);
}

/**
 * Nettoie les entrées utilisateur pour prévenir les injections
 * @param input - L'entrée à nettoyer
 * @returns L'entrée nettoyée
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Supprimer les caractères potentiellement dangereux
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Échappe le HTML pour prévenir les XSS
 * @param text - Le texte à échapper
 * @returns Le texte avec le HTML échappé
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * Valide une entrée utilisateur
 * @param input - L'entrée à valider
 * @param allowedTags - Tags HTML autorisés (optionnel)
 * @returns True si l'entrée est valide
 */
export function validateInput(input: string, allowedTags?: string[]): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Vérifier la longueur
  if (input.length > 10000) { // Limite raisonnable
    return false;
  }
  
  // Si des tags sont spécifiés, vérifier qu'ils sont dans la liste autorisée
  if (allowedTags && allowedTags.length > 0) {
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    let match;
    while ((match = tagRegex.exec(input)) !== null) {
      const tag = match[1].toLowerCase();
      if (!allowedTags.includes(tag)) {
        return false;
      }
    }
  }
  
  // Vérifier les scripts potentiellement dangereux
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onmouseover=/gi,
    /onclick=/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Valide une entrée contre les attaques XSS
 * @param input - L'entrée à valider
 * @returns True si l'entrée est sûre
 */
export function validateAgainstXSS(input: string): boolean {
  return validateInput(input);
}