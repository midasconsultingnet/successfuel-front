import { writable, type Writable } from 'svelte/store';
import { tauriAuthService } from './TauriAuthService';
import { AUTH_CONFIG } from '$lib/config/authConfig';

// Interface pour l'état d'authentification
export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: string | null;
}

// État initial
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
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
  }

  private loadInitialState() {
    const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const expiryStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
    
    if (token && expiryStr) {
      const expiry = parseInt(expiryStr);
      const isValid = Date.now() < expiry;
      
      if (isValid) {
        // Token toujours valide, mais on ne sait pas si l'utilisateur est réellement authentifié
        // On considère qu'il est authentifié jusqu'à ce qu'une requête échoue
        this.updateState({ 
          isAuthenticated: true, 
          user: null, 
          isLoading: false,
          error: null
        });
      } else {
        // Token expiré, nettoyer le localStorage
        this.clearTokens();
      }
    }
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
      
      // Mettre à jour le localStorage avec le nouveau token
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + AUTH_CONFIG.DEFAULT_TOKEN_LIFETIME_MINUTES);

      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY, expiry.getTime().toString());

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
        this.handleSessionExpired();
        throw new Error('Session expirée');
      }
      
      // En cas d'autre erreur de refresh, on déconnecte l'utilisateur
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

  public async handleRequestWithAuth<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Vérifier si l'utilisateur est authentifié
    if (!this.isAuthenticated()) {
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
          return await requestFn(); // Réessayer la requête
        } catch (refreshError: any) {
          // Si le refresh échoue, l'utilisateur est déconnecté
          throw this.createUnauthorizedError();
        }
      }
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