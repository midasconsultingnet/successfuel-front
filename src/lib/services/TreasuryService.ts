import { apiService } from './ApiService';

// Types pour les trésoreries
export interface Treasury {
  id: string;
  nom: string;
  type: 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres';
  solde_initial: number;
  solde_tresorerie?: number;
  devise?: string | null;
  informations_bancaires?: string | null;
  station_ids?: string[];
  compagnie_id: string;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateTreasuryData {
  nom: string;
  type: 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres';
  solde_initial: number;
  devise?: string | null;
  informations_bancaires?: string | null;
}

export interface UpdateTreasuryData {
  nom?: string;
  type?: 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres';
  solde_initial?: number;
  devise?: string | null;
  informations_bancaires?: string | null;
}

export class TreasuryService {
  private basePath = '/tresoreries';

  /**
   * Récupérer toutes les trésoreries
   */
  async getAllTreasuries(): Promise<Treasury[]> {
    return apiService.get(`${this.basePath}/`);
  }

  /**
   * Récupérer une trésorerie par son ID
   */
  async getTreasuryById(treasuryId: string): Promise<Treasury> {
    return apiService.get(`${this.basePath}/${treasuryId}`);
  }

  /**
   * Créer une nouvelle trésorerie
   */
  async createTreasury(data: CreateTreasuryData): Promise<Treasury> {
    return apiService.post(`${this.basePath}/`, data);
  }

  /**
   * Mettre à jour une trésorerie existante
   */
  async updateTreasury(treasuryId: string, data: UpdateTreasuryData): Promise<Treasury> {
    return apiService.put(`${this.basePath}/${treasuryId}`, data);
  }

  /**
   * Supprimer une trésorerie
   */
  async deleteTreasury(treasuryId: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${treasuryId}`);
  }

  /**
   * Récupérer les associations trésorerie-station pour une station spécifique
   */
  async getTreasuryStationAssociations(stationId: string): Promise<any[]> {
    return apiService.get(`${this.basePath}/stations/${stationId}/tresoreries`);
  }

  /**
   * Récupérer les trésoreries d'une station spécifique (avec soldes initiaux)
   */
  async getTreasuriesByStation(stationId: string): Promise<any[]> {
    return apiService.get(`${this.basePath}/stations/${stationId}/tresoreries`);
  }

  /**
   * Associer une trésorerie à une station
   */
  async associateTreasuryToStation(treasuryId: string, stationId: string): Promise<void> {
    return apiService.post(`${this.basePath}/stations`, {
      tresorerie_id: treasuryId,
      station_id: stationId,
      solde_initial: 0
    });
  }

  /**
   * Dissocier une trésorerie d'une station
   */
  async dissociateTreasuryFromStation(treasuryId: string, stationId: string): Promise<void> {
    // Cette opération pourrait être effectuée par une suppression d'association
    // ou par un appel spécifique si disponible dans l'API
    throw new Error('Dissocier une trésorerie d\'une station: non implémenté dans l\'API actuelle');
  }
}

// Exporter une instance unique du service trésorerie
export const treasuryService = new TreasuryService();