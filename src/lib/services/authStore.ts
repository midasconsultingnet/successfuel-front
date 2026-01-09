import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { authManager, type AuthState } from './AuthManager';
import { userService } from './UserService';
import { companyStore } from './companyStore';

// Interface pour l'état d'authentification
export interface AuthStore {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: string | null;
}

// Création du store d'authentification qui s'abonne au AuthManager
const createAuthStore = () => {
  const { subscribe, set, update } = writable<AuthStore>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });

  // S'abonner aux changements d'état du AuthManager
  const unsubscribe = authManager.subscribe((managerState: AuthState) => {
    set({
      isAuthenticated: managerState.isAuthenticated,
      user: managerState.user,
      isLoading: managerState.isLoading,
      error: managerState.error
    });
  });

  // Configurer les callbacks pour le AuthManager
  authManager.setCallbacks({
    onSessionExpired: () => {
      // Lancer un événement personnalisé pour signaler l'expiration de session
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }, 0);
    }
  });

  return {
    subscribe,

    // Connexion de l'utilisateur
    async login(credentials: { login: string; password: string }) {
      try {
        const response = await authManager.login(credentials);

        // Récupérer les informations détaillées de l'utilisateur via l'API
        const user = await userService.getMe();

        // Récupérer les informations de la compagnie
        await companyStore.fetchCompany();

        // Mettre à jour le store avec les nouvelles informations
        update(state => ({
          ...state,
          user,
          isLoading: false,
          error: null
        }));

        return { ...response, user };
      } catch (error) {
        // L'erreur est déjà gérée par le AuthManager
        throw error;
      }
    },

    // Déconnexion de l'utilisateur
    async logout() {
      await authManager.logout();
      // La mise à jour du store est gérée par le AuthManager
    },

    // Rafraîchissement du token
    async refresh() {
      try {
        await authManager.refreshToken();

        // Récupérer les informations détaillées de l'utilisateur via l'API
        const user = await userService.getMe();

        // Récupérer les informations de la compagnie
        await companyStore.fetchCompany();

        // Mettre à jour le store avec les nouvelles informations
        update(state => ({
          ...state,
          user,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        // L'erreur est déjà gérée par le AuthManager
        throw error;
      }
    },

    // Vérification de l'état d'authentification
    async checkAuth() {
      // Cette méthode n'est plus nécessaire car le AuthManager gère l'état
      // On peut laisser cette méthode vide ou la supprimer
    }
  };
};

// Export du store d'authentification
export const authStore = createAuthStore();