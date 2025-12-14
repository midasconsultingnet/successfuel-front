import { apiService } from './ApiService';

// Types pour la configuration de la station
export interface StationConfig {
  completion: {
    cuves: boolean;
    jauge: boolean;
    soldes: boolean;
    clients: boolean;
    station: boolean;
    employes: boolean;
    pistolets: boolean;
    carburants: boolean;
    tresorerie: boolean;
    fournisseurs: boolean;
    immobilisations: boolean;
  };
}

// Types pour les stations
export interface Station {
  id: string;
  compagnie_id: string;
  nom: string;
  code: string;
  adresse: string | null;
  coordonnees_gps: string | null;
  statut: 'actif' | 'inactif';
  config?: StationConfig; // Champ optionnel pour la configuration
  created_at: string;
  updated_at: string;
}

export interface CreateStationRequest {
  nom: string;
  code: string;
  adresse: string;
  coordonnees_gps: string;
}

export interface UpdateStationRequest {
  nom?: string;
  code?: string;
  adresse?: string | null;
  coordonnees_gps?: string;
  statut?: 'actif' | 'inactif';
}

// Service pour gérer les stations
class StationService {
  /**
   * Récupérer la liste des stations
   */
  async getStations(): Promise<Station[]> {
    return await apiService.get<Station[]>('/compagnie/stations');
  }

  /**
   * Récupérer une station par son ID
   */
  async getStationById(id: string): Promise<Station> {
    return await apiService.get<Station>(`/compagnie/stations/${id}`);
  }

  /**
   * Créer une nouvelle station
   */
  async createStation(station: CreateStationRequest): Promise<Station> {
    return await apiService.post<Station>('/compagnie/stations', station);
  }

  /**
   * Mettre à jour une station
   */
  async updateStation(id: string, station: UpdateStationRequest): Promise<Station> {
    return await apiService.put<Station>(`/compagnie/stations/${id}`, station);
  }

  /**
   * Supprimer une station
   */
  async deleteStation(id: string): Promise<void> {
    return await apiService.delete<void>(`/compagnie/stations/${id}`);
  }
}

// Exporter une instance du service
export const stationService = new StationService();