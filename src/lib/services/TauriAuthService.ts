import { invoke } from '@tauri-apps/api/core';
import { apiService } from './ApiService';
import type { LoginRequest, LoginResponse } from '../types/auth';
import { AUTH_CONFIG } from '../config/authConfig';

// Service pour gérer l'authentification via Tauri
export class TauriAuthService {
  private apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://successfuel-api.onrender.com/api/v1';

  /**
   * Se connecter à l'application via Tauri
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response: LoginResponse = await invoke('login', {
        credentials: {
          login: credentials.login,
          password: credentials.password
        }
      });

      // Stocker le token d'accès dans localStorage pour les requêtes API
      if (response.access_token) {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + AUTH_CONFIG.DEFAULT_TOKEN_LIFETIME_MINUTES);

        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY, expiry.getTime().toString());

        // Mettre à jour le header d'authentification dans ApiService
        apiService.setAuthToken(response.access_token, expiry);
      }

      return response;
    } catch (error) {
      console.error('Erreur de connexion Tauri:', error);
      throw error;
    }
  }

  /**
   * Rafraîchir le token via Tauri
   */
  async refreshToken(): Promise<string> {
    try {
      const response: LoginResponse = await invoke('refresh_token');

      // Mettre à jour le token d'accès dans localStorage
      if (response.access_token) {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + AUTH_CONFIG.DEFAULT_TOKEN_LIFETIME_MINUTES);

        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY, expiry.getTime().toString());

        // Mettre à jour le header d'authentification dans ApiService
        apiService.setAuthToken(response.access_token, expiry);
      }

      return response.access_token;
    } catch (error) {
      console.error('Erreur de refresh Tauri:', error);

      // Détecter si l'erreur est un 401 (Unauthorized) provenant du serveur backend
      if (error && typeof error === 'string' && error.includes('HTTP_401')) {
        // Créer une erreur spécifique pour indiquer que la session a expiré
        const unauthorizedError = new Error('Session expirée: impossible de rafraîchir le token d\'authentification');
        (unauthorizedError as any).status = 401; // Ajouter le code d'état pour que le frontend puisse le détecter

        // Lancer un événement personnalisé pour signaler l'expiration de session
        // Cela permettra au composant SessionExpiredPopover de s'activer
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        }, 0);

        throw unauthorizedError;
      }

      throw error;
    }
  }

  /**
   * Se déconnecter via Tauri
   * Nettoie les données locales
   */
  async logout(): Promise<void> {
    try {
      // Appeler la commande Tauri pour nettoyer les cookies HTTPOnly côté Rust
      await invoke('logout');

      // Nettoyer les tokens localement
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);

      // Mettre à jour le header d'authentification dans ApiService
      apiService.setAuthToken(null);
    } catch (error) {
      console.error('Erreur de déconnexion Tauri:', error);
      // Même en cas d'erreur, on nettoie les tokens localement
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
      apiService.setAuthToken(null);
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   * Vérifie la présence et la validité du token dans le localStorage
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);

    if (!token || !expiryStr) {
      return false;
    }

    const expiry = parseInt(expiryStr);
    return Date.now() < expiry;
  }

  /**
   * Déconnexion locale (nettoyage du localStorage)
   */
  localLogout(): void {
    // Nettoyer les tokens localement
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);

    // Mettre à jour le header d'authentification dans ApiService
    apiService.setAuthToken(null);
  }
}

// Instance unique du service
export const tauriAuthService = new TauriAuthService();