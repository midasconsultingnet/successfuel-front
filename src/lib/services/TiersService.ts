import { apiService } from './ApiService';
import type { InitialBalanceConfig } from './ConfigurationService';

// Types pour les tiers
export interface Tiers {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  type: 'client' | 'fournisseur' | 'employe';
  statut: string;
  created_at: string;
  updated_at: string;
}

// Types pour les soldes des tiers
export interface SoldeTiersCreate {
  montant_initial: number;
  type_solde_initial: 'dette' | 'creance';
  devise?: string | null;
}

export interface SoldeTiersUpdate {
  montant_initial?: number | null;
  montant_actuel?: number | null;
}

export interface SoldeTiersResponse {
  id: string;
  tiers_id: string;
  station_id: string;
  montant_initial: number;
  montant_actuel: number;
  devise: string | null;
  type_solde_initial: 'dette' | 'creance';
  date_derniere_mise_a_jour: string | null;
  created_at: string;
}

/**
 * Service de gestion des tiers (clients, fournisseurs, employés) et de leurs soldes
 */
export class TiersService {
  /**
   * Récupérer un tiers par son ID
   */
  async getTiersById(tiersId: string): Promise<Tiers> {
    const response = await apiService.get(`/tiers/tiers/${tiersId}`);
    return response;
  }

  /**
   * Récupérer tous les soldes d'un tiers par station
   */
  async getSoldesByTiers(tiersId: string): Promise<SoldeTiersResponse[]> {
    const response = await apiService.get(`/tiers/tiers/${tiersId}/soldes`);
    return response;
  }

  /**
   * Récupérer les soldes d'un tiers pour une station spécifique
   */
  async getSoldeByTiersAndStation(tiersId: string, stationId: string): Promise<SoldeTiersResponse> {
    const response = await apiService.get(`/tiers/tiers/${tiersId}/soldes/${stationId}`);
    return response;
  }

  /**
   * Initialiser le solde d'un tiers pour une station spécifique
   */
  async createSoldeTiers(tiersId: string, stationId: string, soldeData: SoldeTiersCreate): Promise<SoldeTiersResponse> {
    const response = await apiService.post(`/tiers/tiers/${tiersId}/soldes/${stationId}`, soldeData);
    return response;
  }

  /**
   * Mettre à jour le solde d'un tiers pour une station spécifique
   */
  async updateSoldeTiers(tiersId: string, stationId: string, soldeData: SoldeTiersUpdate): Promise<SoldeTiersResponse> {
    const response = await apiService.put(`/tiers/tiers/${tiersId}/soldes/${stationId}`, soldeData);
    return response;
  }

  /**
   * Supprimer le solde d'un tiers pour une station spécifique
   * Note: L'API ne semble pas avoir d'endpoint DELETE, donc on mettra à zéro le montant
   */
  async deleteSoldeTiers(tiersId: string, stationId: string): Promise<void> {
    // Pour supprimer un solde, on le met à zéro
    await apiService.put(`/tiers/tiers/${tiersId}/soldes/${stationId}`, {
      montant_initial: 0,
      montant_actuel: 0
    });
  }

  /**
   * Récupérer tous les soldes pour une station spécifique (utile pour l'onglet Balance)
   */
  async getSoldesByStation(stationId: string): Promise<SoldeTiersResponse[]> {
    const response = await apiService.get(`/tiers/stations/${stationId}/soldes`);
    return response;
  }

  /**
   * Récupérer les créances d'une station (soldes avec type_solde_initial === 'creance')
   */
  async getCreancesByStation(stationId: string): Promise<SoldeTiersResponse[]> {
    const soldes = await this.getSoldesByStation(stationId);
    return soldes.filter(solde => solde.type_solde_initial === 'creance');
  }

  /**
   * Récupérer les dettes d'une station (soldes avec type_solde_initial === 'dette')
   */
  async getDettesByStation(stationId: string): Promise<SoldeTiersResponse[]> {
    const soldes = await this.getSoldesByStation(stationId);
    return soldes.filter(solde => solde.type_solde_initial === 'dette');
  }

  /**
   * Créer une créance pour une station
   */
  async createCreance(tiersId: string, stationId: string, montant: number, devise: string = 'XOF'): Promise<SoldeTiersResponse> {
    return this.createSoldeTiers(tiersId, stationId, {
      montant_initial: montant,
      type_solde_initial: 'creance',
      devise
    });
  }

  /**
   * Créer une dette pour une station
   */
  async createDette(tiersId: string, stationId: string, montant: number, devise: string = 'XOF'): Promise<SoldeTiersResponse> {
    return this.createSoldeTiers(tiersId, stationId, {
      montant_initial: montant,
      type_solde_initial: 'dette',
      devise
    });
  }
  /**
   * Récupérer tous les tiers (clients, fournisseurs, employés) pour une station
   */
  async getAllTiersForStation(stationId: string): Promise<Tiers[]> {
    // On n'a pas un endpoint direct, donc on combine les appels aux différents services
    // Mais pour l'instant, utilisons les services existants
    return []; // À implémenter via les services correspondants
  }
}

// Instance singleton du service
export const tiersService = new TiersService();