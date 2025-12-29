import { apiService } from './ApiService';

// Types pour les états initiaux de trésorerie
export interface TreasuryInitialState {
  id: string;
  treasury_station_id: string;
  date_enregistrement: string;
  montant: number;
  commentaire?: string | null;
  enregistre_par: string;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateTreasuryInitialStateData {
  tresorerie_station_id: string;
  date_enregistrement: string;
  montant: number;
  commentaire?: string | null;
  enregistre_par: string;
}

export interface UpdateTreasuryInitialStateData {
  date_enregistrement?: string;
  montant?: number;
  commentaire?: string | null;
}

export class TreasuryInitialStateService {
  private basePath = '/tresoreries/etats-initiaux';

  /**
   * Créer un état initial de trésorerie
   */
  async createInitialState(data: CreateTreasuryInitialStateData): Promise<TreasuryInitialState> {
    return apiService.post(`${this.basePath}/`, data);
  }

  /**
   * Mettre à jour un état initial de trésorerie
   */
  async updateInitialState(initialStateId: string, data: UpdateTreasuryInitialStateData): Promise<TreasuryInitialState> {
    return apiService.put(`${this.basePath}/${initialStateId}`, data);
  }

  /**
   * Supprimer un état initial de trésorerie
   */
  async deleteInitialState(initialStateId: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${initialStateId}`);
  }
}

// Exporter une instance unique du service
export const treasuryInitialStateService = new TreasuryInitialStateService();