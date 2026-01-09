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