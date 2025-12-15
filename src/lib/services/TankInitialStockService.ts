import { apiService } from './ApiService';

// Types pour les états initiaux des cuves
export interface TankInitialStock {
  id: string;
  cuve_id: string;
  cuve: {
    id: string;
    nom: string;
    code: string;
    capacite_maximale: number;
    carburant: {
      id: string;
      libelle: string;
      code: string;
    };
  };
  hauteur_jauge_initiale: number;
  volume_initial_calcule: number;
  date_initialisation: string;
  utilisateur_id: string;
  verrouille: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTankInitialStockRequest {
  hauteur_jauge_initiale: number;
}

export interface UpdateTankInitialStockRequest {
  hauteur_jauge_initiale: number;
}

// Service pour gérer les états initiaux des cuves
class TankInitialStockService {
  /**
   * Récupérer l'état initial d'une cuve
   */
  async getTankInitialStock(tankId: string, customFetch?: typeof fetch): Promise<TankInitialStock> {
    return await apiService.get<TankInitialStock>(`/compagnie/cuves/${tankId}/etat_initial`, undefined, customFetch);
  }

  /**
   * Créer l'état initial d'une cuve
   */
  async createTankInitialStock(tankId: string, data: CreateTankInitialStockRequest, customFetch?: typeof fetch): Promise<TankInitialStock> {
    return await apiService.post<TankInitialStock>(`/compagnie/cuves/${tankId}/etat_initial`, data, undefined, customFetch);
  }

  /**
   * Mettre à jour l'état initial d'une cuve
   */
  async updateTankInitialStock(tankId: string, data: UpdateTankInitialStockRequest, customFetch?: typeof fetch): Promise<TankInitialStock> {
    return await apiService.put<TankInitialStock>(`/compagnie/cuves/${tankId}/etat_initial`, data, undefined, customFetch);
  }

  /**
   * Supprimer l'état initial d'une cuve (si nécessaire)
   */
  async deleteTankInitialStock(tankId: string, customFetch?: typeof fetch): Promise<void> {
    return await apiService.delete<void>(`/compagnie/cuves/${tankId}/etat_initial`, undefined, customFetch);
  }
}

// Exporter une instance du service
export const tankInitialStockService = new TankInitialStockService();