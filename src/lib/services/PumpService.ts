import { apiService } from './ApiService';

// Interface pour les pistolets
export interface Pump {
  id: string;
  cuve_id: string;
  cuve?: {
    id: string;
    nom: string;
    code: string;
    capacite_maximale: number;
    niveau_actuel: number;
    carburant_id: string;
    statut: string;
    created_at: string;
    updated_at: string;
  };
  numero: string;
  statut: string; // 'actif' ou 'inactif'
  index_initial: number;
  index_final: number;
  date_derniere_utilisation: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePump {
  numero: string;
  statut?: string;
  index_initial: number;
  index_final?: number;
  date_derniere_utilisation?: string;
}

export interface UpdatePump {
  numero?: string;
  statut?: string;
  index_initial?: number;
  index_final?: number;
  date_derniere_utilisation?: string;
}

// Service pour la gestion des pistolets
class PumpService {
  private basePath = '/compagnie';

  // Récupérer tous les pistolets d'une station via les cuves
  async getStationPumps(stationId: string): Promise<Pump[]> {
    return apiService.get<Pump[]>(`${this.basePath}/stations/${stationId}/pistolets`);
  }

  // Récupérer les pistolets liés à une cuve spécifique
  async getTankPumps(tankId: string): Promise<Pump[]> {
    return apiService.get<Pump[]>(`${this.basePath}/cuves/${tankId}/pistolets`);
  }

  // Créer un pistolet lié à une cuve
  async createPump(tankId: string, data: CreatePump): Promise<Pump> {
    return apiService.post<Pump>(`${this.basePath}/cuves/${tankId}/pistolets`, data);
  }

  // Mettre à jour un pistolet
  async updatePump(pumpId: string, data: UpdatePump): Promise<Pump> {
    return apiService.put<Pump>(`${this.basePath}/pistolets/${pumpId}`, data);
  }

  // Supprimer un pistolet
  async deletePump(pumpId: string): Promise<void> {
    return apiService.delete<void>(`${this.basePath}/pistolets/${pumpId}`);
  }

  // Récupérer un pistolet spécifique
  async getPumpById(pumpId: string): Promise<Pump> {
    return apiService.get<Pump>(`${this.basePath}/pistolets/${pumpId}`);
  }
}

// Exporter une instance unique du service
export const pumpService = new PumpService();