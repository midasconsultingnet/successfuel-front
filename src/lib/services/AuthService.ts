import type { NotificationHandler } from './HttpClient';
import { apiService } from './ApiService';
import { authManager } from './AuthManager';
import type { LoginRequest, LoginResponse } from '../types/auth';
import { AUTH_CONFIG } from '../config/authConfig';

// Service pour gérer l'authentification
// Dans une application Tauri-first, ce service délègue tout au AuthManager
class AuthService {
  constructor(private notificationHandler?: NotificationHandler) {}

  /**
   * Se connecter à l'application
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return await authManager.login(credentials);
  }

  /**
   * Se déconnecter de l'application
   */
  async logout(): Promise<void> {
    await authManager.logout();
  }

  /**
   * Rafraîchir le token d'authentification
   */
  async refreshToken(): Promise<string> {
    const token = await authManager.refreshToken();
    if (!token) {
      throw new Error('Impossible de rafraîchir le token');
    }
    return token;
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return authManager.isAuthenticated();
  }

  /**
   * Déconnexion locale (nettoyage du localStorage)
   */
  localLogout(): void {
    // Nettoyer le localStorage
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
    // Mettre à jour le header d'authentification dans ApiService
    apiService.setAuthToken(null);
  }

  /**
   * Interceptor pour les requêtes automatiques
   * Cette méthode peut être utilisée pour rafraîchir automatiquement les tokens expirés
   */
  async handleRequestWithAuth<T>(requestFn: () => Promise<T>): Promise<T> {
    return await authManager.handleRequestWithAuth(requestFn);
  }
}

// Exporter une instance unique du service d'authentification
export const authService = new AuthService();

export default AuthService;