import { apiService } from './ApiService';

// Interfaces pour les cuves
// Interface pour un point de barémage
export interface CalibrationPoint {
  hauteur: number;
  volume: number;
}

export interface Tank {
  id: string;
  station_id: string;
  nom: string;
  code: string;
  capacite_maximale: number;
  niveau_actuel: number;
  carburant_id: string;
  carburant?: {
    id: string;
    libelle: string;
    code: string;
  } | null;
  statut: string; // 'actif' ou autre
  barremage: string; // format texte
  created_at: string;
  updated_at: string;
}

export interface CreateTank {
  nom: string;
  code: string;
  capacite_maximale: number;
  carburant_id: string;
  barremage: string;
}

export interface UpdateTank {
  nom?: string;
  code?: string;
  capacite_maximale?: number;
  carburant_id?: string;
  statut?: string;
  barremage?: string;
}

// Service pour la gestion des cuves
class TankService {
  private basePath = '/compagnie';

  // Récupérer toutes les cuves d'une station
  async getStationTanks(stationId: string): Promise<Tank[]> {
    return apiService.get<Tank[]>(`${this.basePath}/stations/${stationId}/cuves`);
  }

  // Créer une cuve pour une station
  async createTank(stationId: string, data: CreateTank): Promise<Tank> {
    return apiService.post<Tank>(`${this.basePath}/stations/${stationId}/cuves`, data);
  }

  // Mettre à jour une cuve
  async updateTank(tankId: string, data: UpdateTank): Promise<Tank> {
    return apiService.put<Tank>(`${this.basePath}/cuves/${tankId}`, data);
  }

  // Supprimer une cuve
  async deleteTank(tankId: string): Promise<void> {
    return apiService.delete<void>(`${this.basePath}/cuves/${tankId}`);
  }

  // Récupérer une cuve spécifique
  async getTankById(tankId: string): Promise<Tank> {
    return apiService.get<Tank>(`${this.basePath}/cuves/${tankId}`);
  }
}

// Exporter une instance unique du service
export const tankService = new TankService();