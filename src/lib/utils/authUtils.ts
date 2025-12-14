import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { authStore } from '../services/authStore';

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns boolean - true si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  return get(authStore).isAuthenticated;
};

/**
 * Redirige vers la page de login si l'utilisateur n'est pas authentifié
 * @param currentPath - Le chemin actuel de l'utilisateur
 */
export const requireAuth = (currentPath: string): void => {
  if (!isAuthenticated() && currentPath !== '/login' && !currentPath.startsWith('/auth/')) {
    goto('/login');
  }
};

/**
 * Redirige vers le dashboard si l'utilisateur est déjà authentifié
 * @param currentPath - Le chemin actuel de l'utilisateur
 */
export const redirectIfAuthenticated = (currentPath: string): void => {
  if (isAuthenticated() && (currentPath === '/login' || currentPath === '/register')) {
    goto('/dashboard');
  }
};

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * @param requiredRole - Le rôle requis
 * @returns boolean - true si l'utilisateur a le rôle requis
 */
export const hasRole = (requiredRole: string): boolean => {
  const user = get(authStore).user;
  if (!user) return false;
  
  // Selon la structure de votre JWT, l'information de rôle pourrait être dans différents champs
  // Cet exemple suppose que le rôle est dans un champ 'role' ou 'roles'
  return user.role === requiredRole || (user.roles && user.roles.includes(requiredRole));
};

/**
 * Vérifie si l'utilisateur a les permissions nécessaires
 * @param requiredPermissions - Les permissions requises
 * @returns boolean - true si l'utilisateur a toutes les permissions
 */
export const hasPermission = (requiredPermissions: string[]): boolean => {
  const user = get(authStore).user;
  if (!user) return false;
  
  // Selon la structure de votre JWT, les permissions pourraient être dans un champ 'permissions'
  const userPermissions = user.permissions || [];
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

/**
 * Récupère le token d'accès
 * @returns string | null - Le token d'accès ou null s'il n'est pas disponible
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

/**
 * Récupère les informations de l'utilisateur connecté
 * @returns any | null - Les informations de l'utilisateur ou null s'il n'est pas connecté
 */
export const getCurrentUser = () => {
  return get(authStore).user;
};

/**
 * Extrait le payload d'un JWT (côté client uniquement pour affichage)
 * ATTENTION : Ne doit pas être utilisé pour valider la véracité du token
 * La validation de la signature JWT doit toujours être faite côté backend
 * @param token - Le token JWT
 * @returns any - Le payload du token (à utiliser uniquement pour afficher des informations)
 */
export const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erreur lors du parsing du JWT:', e);
    return null;
  }
};

/**
 * Vérifie si le token est sur le point d'expirer (dans les 5 prochaines minutes)
 * @returns boolean - true si le token est sur le point d'expirer
 */
export const isTokenExpiringSoon = (): boolean => {
  const token = getAccessToken();
  if (!token) return true; // Si pas de token, on considère qu'il expire

  try {
    const payload = parseJwt(token);
    const expiry = payload.exp * 1000; // Convertir en millisecondes
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes en millisecondes
    
    return Date.now() >= (expiry - fiveMinutes);
  } catch (e) {
    console.error('Erreur lors de la vérification de l\'expiration du token:', e);
    return true; // En cas d'erreur, on considère le token comme expirant
  }
};

/**
 * Attend que l'utilisateur soit authentifié
 * @returns Promise<void> - Une promesse qui se résout quand l'utilisateur est authentifié
 */
export const waitForAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    const unsubscribe = authStore.subscribe((state) => {
      if (state.isAuthenticated) {
        unsubscribe();
        resolve();
      }
    });
  });
};