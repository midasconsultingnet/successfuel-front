import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { authService } from './AuthService';
import { userService } from './UserService';
import { companyStore } from './companyStore';

// Interface pour l'état d'authentification
export interface AuthStore {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
}

// État initial
const initialAuthState: AuthStore = {
  isAuthenticated: authService.isAuthenticated(),
  user: null, // Ne pas récupérer depuis le JWT, mais via l'API
  isLoading: false
};

// Création du store d'authentification
const createAuthStore = () => {
  const { subscribe, set, update } = writable<AuthStore>(initialAuthState);

  return {
    subscribe,

    // Connexion de l'utilisateur
    async login(credentials: { login: string; password: string }) {
      update(state => ({ ...state, isLoading: true }));

      try {
        const response = await authService.login(credentials);

        // Récupérer les informations détaillées de l'utilisateur via l'API
        const user = await userService.getMe();

        // Récupérer les informations de la compagnie
        await companyStore.fetchCompany();

        // Mise à jour du store avec l'état authentifié
        set({
          isAuthenticated: true,
          user,
          isLoading: false
        });

        return { ...response, user };
      } catch (error) {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
        throw error;
      }
    },

    // Déconnexion de l'utilisateur
    async logout() {
      update(state => ({ ...state, isLoading: true }));

      try {
        await authService.logout();

        // Mise à jour du store avec l'état non authentifié
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
      } catch (error) {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
        throw error;
      }
    },

    // Rafraîchissement du token
    async refresh() {
      try {
        await authService.refreshToken();

        // Récupérer les informations détaillées de l'utilisateur via l'API
        const user = await userService.getMe();

        // Récupérer les informations de la compagnie
        await companyStore.fetchCompany();

        // Mise à jour du store avec les nouvelles informations
        update(state => ({
          ...state,
          isAuthenticated: true,
          user
        }));
      } catch (error) {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
        throw error;
      }
    },

    // Vérification de l'état d'authentification
    async checkAuth() {
      const isAuthenticated = authService.isAuthenticated();

      let user = null;
      if (isAuthenticated) {
        try {
          // Récupérer les informations détaillées de l'utilisateur via l'API
          user = await userService.getMe();

          // Récupérer les informations de la compagnie
          await companyStore.fetchCompany();
        } catch (error) {
          // Si l'API échoue, l'utilisateur n'est probablement plus authentifié
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
          return;
        }
      }

      set({
        isAuthenticated,
        user,
        isLoading: false
      });
    }
  };
};

// Export du store d'authentification
export const authStore = createAuthStore();