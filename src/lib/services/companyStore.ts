import { writable } from 'svelte/store';
import { userService } from './UserService';

// Interface pour les informations de la compagnie
export interface CompanyState {
  company: any | null;
  isLoading: boolean;
  error: string | null;
}

// État initial
const initialCompanyState: CompanyState = {
  company: null,
  isLoading: false,
  error: null
};

// Création du store de la compagnie
const createCompanyStore = () => {
  const { subscribe, set, update } = writable<CompanyState>(initialCompanyState);

  return {
    subscribe,

    // Récupérer les informations de la compagnie
    async fetchCompany() {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const company = await userService.getCompany();
        set({
          company,
          isLoading: false,
          error: null
        });

        // Stocker la devise dans localStorage pour une utilisation globale
        if (company?.devise) {
          localStorage.setItem('currency', company.devise);
        }

        return company;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des informations de la compagnie';
        set({
          company: null,
          isLoading: false,
          error: errorMessage
        });
        throw error;
      }
    },

    // Mettre à jour les informations de la compagnie
    updateCompany(company: any) {
      set({
        company,
        isLoading: false,
        error: null
      });

      // Mettre à jour la devise dans localStorage
      if (company?.devise) {
        localStorage.setItem('currency', company.devise);
      }
    },

    // Vérifier si les données de la compagnie sont disponibles
    hasCompany(): boolean {
      let currentState: CompanyState = initialCompanyState;
      const unsubscribe = subscribe(state => {
        currentState = state;
      });
      unsubscribe();
      return currentState.company !== null;
    }
  };
};

// Export du store de la compagnie
export const companyStore = createCompanyStore();

// Fonction utilitaire pour obtenir la devise
export const getCurrency = (): string => {
  return localStorage.getItem('currency') || 'USD'; // USD par défaut
};

// Fonction utilitaire pour définir la devise
export const setCurrency = (currency: string): void => {
  localStorage.setItem('currency', currency);
};