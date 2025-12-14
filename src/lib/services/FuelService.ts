import { apiService, type BaseEntity } from './ApiService';

// Types pour les carburants
export interface Fuel {
  id: string;
  libelle: string;
  code: string;
  createdAt: string;
  updatedAt?: string;
}

// Types pour les prix de carburant d'une station
export interface StationFuelPrice {
  id: string;
  carburant_id: string;
  station_id: string;
  prix_achat: number;
  prix_vente: number;
  created_at: string;
  carburant_libelle: string;
  carburant_code: string;
}

// Types pour la création/mise à jour des prix de carburant
export interface CreateStationFuelPrice {
  carburant_id: string;
  station_id: string;
  prix_achat: number;
  prix_vente: number;
}

export interface UpdateStationFuelPrice {
  prix_achat: number;
  prix_vente: number;
}

// Service pour les carburants
class FuelService {
  private basePath = '/carburant';
  private companyPath = '/compagnie';

  // Récupérer la liste complète des types de carburants
  async getFuels(): Promise<Fuel[]> {
    return apiService.get<Fuel[]>(`${this.basePath}/carburants`);
  }

  // Récupérer les prix des carburants pour une station spécifique
  async getStationFuelPrices(stationId: string): Promise<StationFuelPrice[]> {
    return apiService.get<StationFuelPrice[]>(`${this.companyPath}/stations/${stationId}/carburants`);
  }

  // Ajouter un type de carburant à une station avec ses prix
  async addFuelToStation(data: CreateStationFuelPrice): Promise<StationFuelPrice> {
    return apiService.post<StationFuelPrice>(`${this.companyPath}/prix-carburants`, data);
  }

  // Mettre à jour les prix d'un carburant pour une station
  async updateFuelPrice(carburantId: string, stationId: string, data: UpdateStationFuelPrice): Promise<StationFuelPrice> {
    return apiService.put<StationFuelPrice>(`${this.companyPath}/prix-carburants/${carburantId}/${stationId}`, data);
  }

  // Supprimer un carburant d'une station
  async removeFuelFromStation(carburantId: string, stationId: string): Promise<void> {
    return apiService.delete<void>(`${this.companyPath}/prix-carburants/${carburantId}/${stationId}`);
  }
}

// Exporter une instance unique du service
export const fuelService = new FuelService();