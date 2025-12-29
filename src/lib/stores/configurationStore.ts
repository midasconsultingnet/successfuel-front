import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// Interface pour l'état de configuration
export interface ConfigurationCompletion {
  infrastructure?: {
    fuel?: boolean;
    tanks?: boolean;
    pumps?: boolean;
    stock?: boolean;
    overall?: boolean;
  };
  partners?: {
    suppliers?: boolean;
    customers?: boolean;
    overall?: boolean;
  };
  employees?: {
    employees?: boolean;
    overall?: boolean;
  };
  finances?: {
    treasuries?: boolean;
    payment_methods?: boolean;
    overall?: boolean;
  };
  balance?: {
    assets?: boolean;
    receivables?: boolean;
    debts?: boolean;
    overall?: boolean;
  };
}

// Interface pour le store global contenant les configurations par station
export interface StationConfigurations {
  [stationId: string]: ConfigurationCompletion;
}

// Store pour la configuration
const createConfigurationStore = () => {
  const { subscribe, set, update } = writable<StationConfigurations | null>(null);

  return {
    subscribe,
    set,
    update,
    // Fonction pour mettre à jour la configuration d'une station spécifique
    updateStationConfig: (stationId: string, config: ConfigurationCompletion) => {
      update(current => {
        const newConfig = { ...current };
        if (!newConfig) {
          return { [stationId]: config };
        }
        newConfig[stationId] = { ...newConfig[stationId], ...config };
        return newConfig;
      });
    },
    // Fonction pour mettre à jour une partie spécifique de la configuration d'une station
    updatePart: (stationId: string, part: keyof ConfigurationCompletion, data: any) => {
      update(current => {
        const newConfig = { ...current };
        if (!newConfig) {
          return { [stationId]: { [part]: data } };
        }
        if (!newConfig[stationId]) {
          newConfig[stationId] = { [part]: data };
        } else {
          newConfig[stationId] = { ...newConfig[stationId], [part]: data };
        }
        return newConfig;
      });
    },
    // Fonction pour obtenir la configuration d'une station spécifique
    getStationConfig: (stationId: string) => {
      let current: StationConfigurations | null = null;
      const unsubscribe = configurationStore.subscribe(value => {
        current = value;
      });
      unsubscribe(); // Se désabonner immédiatement car on ne veut qu'une lecture ponctuelle
      return current ? current[stationId] : null;
    },
    // Fonction pour réinitialiser le store
    reset: () => {
      set(null);
    }
  };
};

export const configurationStore = createConfigurationStore();

// Charger les données depuis localStorage au démarrage (si on est dans le navigateur)
if (browser) {
  const savedConfigs = localStorage.getItem('stationConfigurations');
  if (savedConfigs) {
    try {
      configurationStore.set(JSON.parse(savedConfigs));
    } catch (e) {
      console.error('Erreur lors du chargement des configurations depuis localStorage:', e);
    }
  }

  // Sauvegarder dans localStorage à chaque changement
  configurationStore.subscribe(value => {
    if (value) {
      localStorage.setItem('stationConfigurations', JSON.stringify(value));
    }
  });
}