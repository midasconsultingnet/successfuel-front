import { writable, type Writable } from 'svelte/store';
import { tauriAuthService } from './TauriAuthService';
import { AUTH_CONFIG } from '$lib/config/authConfig';

// Interface pour l'état d'authentification
export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  isInitializing: boolean; // Indicateur de chargement initial
  error: string | null;
}

// État initial
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isInitializing: true, // Par défaut, on est en train d'initialiser
  error: null
};

// Interface pour les callbacks
export interface AuthCallbacks {
  onAuthChange?: (state: AuthState) => void;
  onSessionExpired?: () => void;
}

class AuthManager {
  private store: Writable<AuthState>;
  private callbacks: AuthCallbacks = {};
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor() {
    this.store = writable<AuthState>(initialAuthState);

    // Charger l'état initial depuis le localStorage
    this.loadInitialState();

    // Démarrer la vérification proactive de l'expiration du token
    this.startTokenExpiryCheck();
  }

  private async loadInitialState() {
    // Charger l'état initial sans vérifier la validité du token
    // Puisque nous effaçons les tokens au démarrage, cette méthode ne fera que terminer l'initialisation
    this.updateState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      isInitializing: false,
      error: null
    });
  }

  public setCallbacks(callbacks: AuthCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private updateState(newState: Partial<AuthState>) {
    this.store.update(state => {
      const updatedState = { ...state, ...newState };

      // Appeler le callback de changement d'authentification
      if (this.callbacks.onAuthChange) {
        this.callbacks.onAuthChange(updatedState);
      }

      return updatedState;
    });
  }

  public subscribe(run: (state: AuthState) => void) {
    return this.store.subscribe(run);
  }

  public getSnapshot(): AuthState {
    let currentState: AuthState;
    this.store.subscribe(state => {
      currentState = state;
    })();
    return currentState!;
  }

  public async login(credentials: { login: string; password: string }): Promise<any> {
    this.updateState({ isLoading: true, error: null });
    
    try {
      // Dans l'application Tauri, on délègue au service Tauri
      const response = await tauriAuthService.login(credentials);
      
      // Stocker le token et la date d'expiration
      if (response.access_token) {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + AUTH_CONFIG.DEFAULT_TOKEN_LIFETIME_MINUTES);

        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY, expiry.getTime().toString());
        
        this.updateState({
          isAuthenticated: true,
          user: null, // Le user est récupéré séparément via userService.getMe()
          isLoading: false,
          error: null
        });
        
        return response;
      } else {
        throw new Error('Aucun token reçu lors de la connexion');
      }
    } catch (error: any) {
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error.message || 'Erreur de connexion'
      });
      throw error;
    }
  }

  public async logout(): Promise<void> {
    this.updateState({ isLoading: true });
    
    try {
      // Dans l'application Tauri, on délègue au service Tauri
      await tauriAuthService.logout();
      
      // Nettoyer les tokens locaux
      this.clearTokens();
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      // Même en cas d'erreur, on nettoie les tokens locaux
      this.clearTokens();
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error.message || 'Erreur lors de la déconnexion'
      });
    }
  }

  public async isAuthenticatedAsync(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Vérifier si le token est proche de l'expiration et tenter un refresh si nécessaire
    const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr);
      const refreshThreshold = AUTH_CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

      if (Date.now() >= expiry - refreshThreshold) {
        // Le token est proche de l'expiration, tenter de le rafraîchir
        try {
          await this.refreshToken();
          return true; // Refresh réussi
        } catch (error) {
          // Si le refresh échoue, l'utilisateur n'est plus authentifié
          return false;
        }
      }
    }

    // Vérifier si le token n'est pas encore expiré
    return Date.now() < parseInt(expiryStr || '0');
  }

  // Garder la méthode originale pour la compatibilité, mais elle ne fait plus de refresh automatique
  public isAuthenticated(): boolean {
    // Dans l'application Tauri, on délègue au service Tauri
    return tauriAuthService.isAuthenticated();
  }

  public async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // Si un refresh est déjà en cours, on attend dans la file
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      // Dans l'application Tauri, on délègue au service Tauri
      const token = await tauriAuthService.refreshToken();

      // La mise à jour du token et des headers est gérée par tauriAuthService.refreshToken()
      // qui appelle apiService.setAuthToken() correctement

      // Traiter la file d'attente
      while (this.refreshQueue.length > 0) {
        const resolve = this.refreshQueue.shift();
        if (resolve) resolve(token);
      }

      return token;
    } catch (error: any) {
      // Vérifier si l'erreur est liée à une session expirée (HTTP 401)
      if (error.message && typeof error.message === 'string' && error.message.includes('HTTP_401')) {
        // Le refresh a échoué avec un 401, ce qui signifie que la session est expirée
        // Libérer les requêtes en attente avec une erreur
        while (this.refreshQueue.length > 0) {
          const resolve = this.refreshQueue.shift();
          if (resolve) resolve(null); // Résoudre avec null pour indiquer l'échec
        }

        this.handleSessionExpired();
        throw new Error('Session expirée');
      }

      // En cas d'autre erreur de refresh, on déconnecte l'utilisateur
      // Libérer les requêtes en attente avec une erreur
      while (this.refreshQueue.length > 0) {
        const resolve = this.refreshQueue.shift();
        if (resolve) resolve(null); // Résoudre avec null pour indiquer l'échec
      }

      this.handleSessionExpired();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private handleSessionExpired() {
    this.clearTokens();
    
    this.updateState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: 'Session expirée'
    });

    // Appeler le callback de session expirée
    if (this.callbacks.onSessionExpired) {
      this.callbacks.onSessionExpired();
    }
  }

  private clearTokens() {
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
  }

  private startTokenExpiryCheck() {
    // Vérifier périodiquement si le token est proche de l'expiration
    setInterval(() => {
      const token = this.getToken();
      if (token) {
        const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
        if (expiryStr) {
          const expiry = parseInt(expiryStr);
          const refreshThreshold = AUTH_CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

          if (Date.now() >= expiry - refreshThreshold) {
            // Le token est proche de l'expiration, tenter de le rafraîchir
            this.refreshToken().catch(() => {
              // Si le refresh échoue, l'utilisateur sera déconnecté
              // via le callback onSessionExpired configuré dans authStore
            });
          }
        }
      }
    }, 60000); // Vérifier toutes les minutes
  }

  public getToken(): string | null {
    const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
    
    if (!token || !expiryStr) {
      return null;
    }
    
    const expiry = parseInt(expiryStr);
    if (Date.now() >= expiry) {
      this.clearTokens();
      return null;
    }
    
    return token;
  }

  // Nous devons stocker les paramètres pour pouvoir recréer la requête
  // mais pour cela, nous devons modifier la signature de la méthode
  // ou trouver un moyen de recréer la requête sans créer de boucle infinie

  // Pour résoudre le problème de headers obsolètes, nous allons modifier la méthode
  // pour qu'elle accepte les paramètres nécessaires à la reconstruction de la requête
  // mais pour éviter de changer l'interface publique, nous allons créer une méthode privée

  public async handleRequestWithAuthInternal<T>(
    requestFn: () => Promise<T>,
    recreateRequest?: () => Promise<T>
  ): Promise<T> {
    // Vérifier si l'utilisateur est authentifié
    const authenticated = await this.isAuthenticatedAsync();
    if (!authenticated) {
      throw this.createUnauthorizedError();
    }

    // Vérifier si le token va bientôt expirer et le rafraîchir si nécessaire
    const token = this.getToken();
    if (token) {
      const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
      if (expiryStr) {
        const expiry = parseInt(expiryStr);
        const refreshThreshold = AUTH_CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

        if (Date.now() >= expiry - refreshThreshold) {
          await this.refreshToken();
        }
      }
    }

    try {
      return await requestFn();
    } catch (error: any) {
      // Si la requête échoue avec un 401, essayer de rafraîchir le token
      if (error.status === 401 || (error.response && error.response.status === 401)) {
        try {
          await this.refreshToken();
          // Si une fonction de recréation de requête est fournie, l'utiliser
          // sinon réessayer avec la même fonction (mais les headers devraient être mis à jour)
          if (recreateRequest) {
            return await recreateRequest();
          } else {
            return await requestFn();
          }
        } catch (refreshError: any) {
          // Si le refresh échoue, l'utilisateur est déconnecté
          throw this.createUnauthorizedError();
        }
      }
      throw error;
    }
  }

  public async handleRequestWithAuth<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Pour l'instant, on appelle la méthode interne sans fonction de recréation
    // mais dans ApiService, nous allons passer une fonction de recréation
    return await this.handleRequestWithAuthInternal(requestFn);
  }

  private async loadUserProfile(): Promise<void> {
    try {
      // Importer dynamiquement userService pour éviter les dépendances circulaires
      const { userService } = await import('./UserService');
      const user = await userService.getMe();

      this.updateState({
        isAuthenticated: true,
        user,
        isLoading: false,
        isInitializing: false, // Terminer l'initialisation
        error: null
      });
    } catch (error) {
      // Terminer l'initialisation même en cas d'erreur
      this.updateState({
        isInitializing: false
      });
      throw error;
    }
  }

  private createUnauthorizedError(): Error {
    const error = new Error('Utilisateur non authentifié');
    (error as any).status = 401;
    return error;
  }
}

// Exporter une instance singleton
export const authManager = new AuthManager();