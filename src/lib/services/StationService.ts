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
  groupe_id?: string | null; // ID du groupe partenaire
  infos_plus: Record<string, any> | null; // Informations supplémentaires comme NIF, STAT, RCS, Téléphone
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
  groupe_id?: string | null;
  infos_plus: Record<string, any> | null;
}

export interface UpdateStationRequest {
  nom?: string;
  code?: string;
  adresse?: string | null;
  coordonnees_gps?: string;
  groupe_id?: string | null;
  infos_plus?: Record<string, any> | null;
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
  async getStationById(id: string, customFetch?: typeof fetch): Promise<Station> {
    // Si un customFetch est fourni, créer une configuration pour l'utiliser
    // mais s'assurer que les headers d'authentification sont inclus
    if (customFetch) {
      // Pour l'instant, on continue d'utiliser le customFetch mais on s'assure que les headers sont inclus
      // dans l'implémentation d'apiService, ce qui est déjà le cas normalement
      return await apiService.get<Station>(`/compagnie/stations/${id}`, undefined, customFetch);
    } else {
      return await apiService.get<Station>(`/compagnie/stations/${id}`);
    }
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

  /**
   * Activer une station
   */
  async activateStation(id: string): Promise<void> {
    return await apiService.put<void>(`/compagnie/stations/${id}/activate`, {});
  }
}

// Exporter une instance du service
export const stationService = new StationService();