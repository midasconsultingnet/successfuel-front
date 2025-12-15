import { invoke } from '@tauri-apps/api/core';
import { apiService } from './ApiService';

// Interfaces pour les requêtes et réponses d'authentification (copiées depuis AuthService pour éviter la dépendance cyclique)
export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

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
        // Calculer la date d'expiration (utiliser la même logique que l'application)
        const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '120');
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + tokenLifetimeMinutes);

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('access_token_expiry', expiry.getTime().toString());

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
        // Calculer la date d'expiration
        const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '120');
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + tokenLifetimeMinutes);

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('access_token_expiry', expiry.getTime().toString());

        // Mettre à jour le header d'authentification dans ApiService
        apiService.setAuthToken(response.access_token, expiry);
      }

      return response.access_token;
    } catch (error) {
      console.error('Erreur de refresh Tauri:', error);
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('access_token_expiry');

      // Mettre à jour le header d'authentification dans ApiService
      apiService.setAuthToken(null);
    } catch (error) {
      console.error('Erreur de déconnexion Tauri:', error);
      // Même en cas d'erreur, on nettoie les tokens localement
      localStorage.removeItem('access_token');
      localStorage.removeItem('access_token_expiry');
      apiService.setAuthToken(null);
    }
  }
}

// Instance unique du service
export const tauriAuthService = new TauriAuthService();