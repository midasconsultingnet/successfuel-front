import type { NotificationHandler } from './HttpClient';
import { apiService } from './ApiService';
import { tauriAuthService } from './TauriAuthService';

// Vérifier si nous sommes dans l'environnement Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

// Interfaces pour les requêtes et réponses d'authentification
export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: Date | null;
}

// Service pour gérer l'authentification
class AuthService {
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(private notificationHandler?: NotificationHandler) {}

  /**
   * Se connecter à l'application
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (isTauri) {
      // Utiliser le service Tauri dans l'environnement Tauri
      return tauriAuthService.login(credentials);
    } else {
      // Utiliser l'approche traditionnelle pour les environnements non-Tauri
      try {
        // Appel à l'API de login sans token d'authentification
        const response = await fetch(`${apiService.getBaseUrl()}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        });

        if (!response.ok) {
          throw new Error(`Erreur de login: ${response.status}`);
        }

        const data: LoginResponse = await response.json();

        // Stocker le token d'accès et sa date d'expiration
        if (data.access_token) {
          // Calculer la date d'expiration (on suppose que le token est valide pendant 30 minutes par défaut)
          const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '30');
          const expiry = new Date();
          expiry.setMinutes(expiry.getMinutes() + tokenLifetimeMinutes);

          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('access_token_expiry', expiry.getTime().toString());

          // Mettre à jour le header d'authentification dans ApiService
          apiService.setAuthToken(data.access_token, expiry);
        }

        return data;
      } catch (error) {
        if (this.notificationHandler) {
          this.notificationHandler.showError('Erreur de connexion', (error as Error).message);
        }
        throw error;
      }
    }
  }

  /**
   * Se déconnecter de l'application
   */
  async logout(): Promise<void> {
    // Pour la déconnexion, on fait la requête API de la même manière dans tous les environnements
    // La requête logout a besoin du token d'accès pour être autorisée par le backend
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Appeler l'API de déconnexion (nécessite le token d'accès)
        const response = await fetch(`${apiService.getBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok && response.status !== 401) { // 401 est acceptable lors du logout
          console.warn(`Erreur lors du logout: ${response.status}`);
        }
      }
    } catch (error) {
      console.warn('Erreur lors de l\'appel API de logout:', error);
      // On continue le nettoyage même en cas d'erreur de requête API
    }

    // Nettoyer les tokens localement dans tous les cas
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_token_expiry');
    apiService.setAuthToken(null);

    // Dans l'environnement Tauri, on appelle quand même la commande Rust pour nettoyer les cookies HTTPOnly
    if (isTauri) {
      try {
        await tauriAuthService.logout();
      } catch (error) {
        console.error('Erreur lors du nettoyage Tauri:', error);
      }
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(): Promise<string> {
    if (isTauri) {
      // Utiliser le service Tauri dans l'environnement Tauri
      return tauriAuthService.refreshToken();
    } else {
      // Si un refresh est déjà en cours, retourner cette promesse
      if (this.tokenRefreshPromise) {
        return this.tokenRefreshPromise;
      }

      this.tokenRefreshPromise = (async () => {
        try {
          const response = await fetch(`${apiService.getBaseUrl()}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Important pour envoyer les cookies HTTPOnly
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            // Si le refresh échoue avec un 401, effectuer une déconnexion locale immédiate
            if (response.status === 401) {
              this.localLogout();
              throw new Error(`Erreur de rafraîchissement du token: ${response.status}`);
            } else {
              // Si le refresh échoue pour une autre raison, déconnecter normalement
              await this.logout();
              throw new Error(`Erreur de rafraîchissement du token: ${response.status}`);
            }
          }

          const data: LoginResponse = await response.json();

          // Stocker le nouveau token d'accès et sa date d'expiration
          if (data.access_token) {
            // Calculer la date d'expiration (on suppose que le token est valide pendant 30 minutes par défaut)
            const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '30');
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + tokenLifetimeMinutes);

            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('access_token_expiry', expiry.getTime().toString());

            // Mettre à jour le header d'authentification dans ApiService
            apiService.setAuthToken(data.access_token, expiry);

            return data.access_token;
          } else {
            throw new Error('Aucun token reçu lors du refresh');
          }
        } catch (error) {
          if (this.notificationHandler) {
            this.notificationHandler.showError('Erreur de session', 'Votre session a expiré, veuillez vous reconnecter');
          }
          throw error;
        } finally {
          this.tokenRefreshPromise = null;
        }
      })();

      return this.tokenRefreshPromise;
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié (côté client uniquement)
   * ATTENTION : Cette méthode vérifie seulement si un token est présent et non expiré
   * La véracité du token doit être validée côté backend pour des opérations sensibles
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const expiryStr = localStorage.getItem('access_token_expiry');

    if (token && expiryStr) {
      // Utiliser la date d'expiration stockée pour éviter le décodage JWT
      const expiry = parseInt(expiryStr);
      return Date.now() < expiry;
    } else if (token) {
      // Si on a un token mais pas d'expiry, on utilise l'ancienne méthode (rétrocompatibilité)
      try {
        const payload = this.parseJwtPayload(token);
        const expiry = payload.exp * 1000; // Convertir en millisecondes
        return Date.now() < expiry;
      } catch (e) {
        console.error('Erreur lors de la vérification du token:', e);
        return false;
      }
    }

    return false;
  }

  /**
   * Récupérer les informations de l'utilisateur à partir du JWT
   * ATTENTION : Les données extraites du JWT côté client doivent être considérées comme non fiables
   * La validation de la véracité du token doit être faite côté backend
   * Pour les informations détaillées de l'utilisateur, utiliser userService.getMe()
   */
  getCurrentUser(): any | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    try {
      return this.parseJwtPayload(token);
    } catch (e) {
      console.error('Erreur lors de la récupération des infos utilisateur:', e);
      return null;
    }
  }

  /**
   * Extraire le payload d'un JWT
   */
  private parseJwtPayload(token: string): any {
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
      throw new Error('Impossible de décoder le token JWT');
    }
  }

  /**
   * Effectue une déconnexion locale (efface les tokens locaux sans appeler l'API)
   */
  localLogout() {
    // Nettoyer les tokens localement
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_token_expiry');
    apiService.setAuthToken(null);

    if (this.notificationHandler) {
      this.notificationHandler.showInfo('Session expirée', 'Votre session a expiré, veuillez vous reconnecter');
    }
  }

  /**
   * Interceptor pour les requêtes automatiques
   * Cette méthode peut être utilisée pour rafraîchir automatiquement les tokens expirés
   */
  async handleRequestWithAuth<T>(requestFn: () => Promise<T>): Promise<T> {
    // Vérifier si le token est expiré avant d'envoyer la requête
    const token = localStorage.getItem('access_token');
    const expiryStr = localStorage.getItem('access_token_expiry');

    if (token && expiryStr) {
      const expiry = parseInt(expiryStr);

      // Obtenir la durée de validité du token depuis les variables d'environnement (en minutes)
      const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '30');
      // Calculer le moment où on devrait rafraîchir le token (5 minutes avant l'expiration)
      const refreshThreshold = Math.min(5 * 60 * 1000, (tokenLifetimeMinutes * 60 * 1000) / 2); // 5 minutes ou la moitié de la durée de vie

      // Si le token expire dans le seuil défini, le rafraîchir
      if (Date.now() >= expiry - refreshThreshold) {
        await this.refreshToken();
      }
    } else if (token) {
      // Si on a un token mais pas d'expiry, on tente de rafraîchir (peut-être ancienne version ou cas de bord)
      try {
        const payload = this.parseJwtPayload(token);
        const expiry = payload.exp * 1000;

        // Obtenir la durée de validité du token depuis les variables d'environnement (en minutes)
        const tokenLifetimeMinutes = parseInt(import.meta.env.VITE_ACCESS_TOKEN_LIFETIME_MINUTES || '30');
        // Calculer le moment où on devrait rafraîchir le token (5 minutes avant l'expiration)
        const refreshThreshold = Math.min(5 * 60 * 1000, (tokenLifetimeMinutes * 60 * 1000) / 2); // 5 minutes ou la moitié de la durée de vie

        // Si le token expire dans le seuil défini, le rafraîchir
        if (Date.now() >= expiry - refreshThreshold) {
          await this.refreshToken();
        }
      } catch (e) {
        console.error('Erreur lors de la vérification du token:', e);
        // Si on ne peut pas vérifier le token, on tente un refresh
        await this.refreshToken();
      }
    }

    try {
      return await requestFn();
    } catch (error: any) {
      // Si la requête échoue avec un 401, essayer de rafraîchir le token et réessayer
      if (error.status === 401) {
        try {
          await this.refreshToken();
          return await requestFn(); // Réessayer la requête avec le nouveau token
        } catch (refreshError: any) {
          // Si le refresh échoue avec un 401 (le serveur ne reconnaît pas le refresh token),
          // effectuer une déconnexion locale immédiate
          if (refreshError.message && refreshError.message.includes('401')) {
            this.localLogout();
            // Propager l'erreur pour que l'interface utilisateur puisse réagir
            throw new Error('Session expirée: impossible de rafraîchir le token d\'authentification');
          } else {
            // Si le refresh échoue pour une autre raison, déconnecter normalement
            await this.logout();
            throw refreshError;
          }
        }
      }
      throw error;
    }
  }
}

// Export d'une instance unique du service d'authentification
export const authService = new AuthService();

export default AuthService;