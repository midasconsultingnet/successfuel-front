import { apiService } from './ApiService';
import { handleError } from './ErrorHandler';

// Type pour la configuration de bilan (utilisé pour la sauvegarde)
export interface AssetValuationConfig {
  id?: string;
  asset_name: string;
  description: string;
  valuation: number;
  currency: string;
}

// Types pour les immobilisations basés sur la documentation OpenAPI
export interface Immobilisation {
  id: string;
  nom: string;
  description?: string;
  code: string;
  type: string;
  date_acquisition: string; // format ISO 8601
  valeur_origine: number;
  station_id: string;
  valeur_nette?: number;
  taux_amortissement?: number;
  duree_vie?: number;
  statut: string;
  created_at: string;
  updated_at: string;
}

export interface ImmobilisationCreateData {
  nom: string;
  description?: string;
  code: string;
  type: string;
  date_acquisition: string; // format ISO 8601
  valeur_origine: number;
  station_id: string;
}

export interface ImmobilisationUpdateData {
  description?: string;
  type?: string;
  valeur_origine?: number;
  valeur_nette?: number;
  taux_amortissement?: number;
  duree_vie?: number;
  statut?: string;
}

export interface ImmobilisationResponse {
  data: Immobilisation;
}

export class ImmobilisationService {
  private basePath = '/immobilisations';

  /**
   * Récupérer toutes les immobilisations
   */
  async getAllImmobilisations(skip: number = 0, limit: number = 100): Promise<Immobilisation[]> {
    try {
      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      const response = await apiService.get(`${this.basePath}?${params.toString()}`);

      // Gérer les deux formats de réponse : { data: [] } ou directement []
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        return response.data as Immobilisation[];
      } else {
        // Si ce n'est ni un tableau ni un objet avec une propriété data qui est un tableau
        // on renvoie un tableau vide
        console.warn('Format de réponse inattendu pour getAllImmobilisations:', response);
        return [];
      }
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }

  /**
   * Récupérer les immobilisations d'une station spécifique
   */
  async getImmobilisationsByStation(stationId: string, skip: number = 0, limit: number = 100): Promise<Immobilisation[]> {
    try {
      // Charger toutes les immobilisations car l'API n'a pas d'endpoint spécifique pour filtrer par station
      // On passe limit à un grand nombre pour récupérer toutes les immobilisations
      const allImmobilisations = await this.getAllImmobilisations(skip, 10000); // Augmenter la limite
      return allImmobilisations.filter(imm => imm.station_id === stationId);
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }

  /**
   * Récupérer une immobilisation par son ID
   */
  async getImmobilisationById(immobilisationId: string): Promise<Immobilisation> {
    try {
      const response = await apiService.get(`${this.basePath}/${immobilisationId}`);

      // Gérer les deux formats de réponse : { data: {} } ou directement {}
      if (response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object') {
        return response.data as Immobilisation;
      } else {
        // Si la réponse n'est pas un objet avec une propriété data, on suppose que c'est directement l'objet
        return response as Immobilisation;
      }
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }

  /**
   * Créer une nouvelle immobilisation
   */
  async createImmobilisation(data: ImmobilisationCreateData): Promise<Immobilisation> {
    try {
      const response = await apiService.post(`${this.basePath}`, data);

      // Gérer les deux formats de réponse : { data: {} } ou directement {}
      if (response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object') {
        return response.data as Immobilisation;
      } else {
        // Si la réponse n'est pas un objet avec une propriété data, on suppose que c'est directement l'objet
        return response as Immobilisation;
      }
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }

  /**
   * Mettre à jour une immobilisation existante
   */
  async updateImmobilisation(immobilisationId: string, data: ImmobilisationUpdateData): Promise<Immobilisation> {
    try {
      const response = await apiService.put(`${this.basePath}/${immobilisationId}`, data);

      // Gérer les deux formats de réponse : { data: {} } ou directement {}
      if (response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object') {
        return response.data as Immobilisation;
      } else {
        // Si la réponse n'est pas un objet avec une propriété data, on suppose que c'est directement l'objet
        return response as Immobilisation;
      }
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }

  /**
   * Supprimer une immobilisation
   */
  async deleteImmobilisation(immobilisationId: string): Promise<void> {
    try {
      await apiService.delete(`${this.basePath}/${immobilisationId}`);
    } catch (error) {
      const processedError = handleError(error);
      throw processedError;
    }
  }
}

// Exporter une instance unique du service immobilisations
export const immobilisationService = new ImmobilisationService();