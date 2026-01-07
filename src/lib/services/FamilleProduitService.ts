import { apiService } from '$lib/services/ApiService';
import { handleError } from '$lib/services/ErrorHandler';

export interface FamilleProduit {
  id: string;
  nom: string;
  description: string;
  code: string;
  compagnie_id: string;
  famille_parente_id: string | null;
  famille_parente: any | null;
}

export interface FamilleProduitResponse {
  items: FamilleProduit[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface CreateProduitPayload {
  nom: string;
  code: string;
  code_barre?: string;
  description?: string;
  unite_mesure: string;
  type: string;
  famille_id: string;
  has_stock: boolean;
}

export interface StockInitialPayload {
  produit_id: string;
  station_id: string;
  quantite_initiale: number;
  cout_unitaire: number;
  prix_vente: number;
  seuil_stock_min: number;
  date_stock_initial: string;
}

export interface UpdateProduitPayload {
  nom: string;
  code_barre?: string;
  description?: string;
  famille_id: string;
  has_stock: boolean;
}

export interface Produit {
  id: string;
  nom: string;
  code: string;
  code_barre?: string;
  description?: string;
  unite_mesure: string;
  type: string;
  famille_id: string;
  compagnie_id: string;
  has_stock: boolean;
  created_at: string;
  updated_at: string;
  est_actif: boolean;
  quantite_stock: number;
  prix_vente: number;
  seuil_stock_min: number;
}

class FamilleProduitService {
  private basePath = '/produits/familles';

  async getFamillesRacines(): Promise<FamilleProduit[]> {
    try {
      const response = await apiService.get<FamilleProduitResponse>(`${this.basePath}/racines`);
      return response.items;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  async createProduit(payload: CreateProduitPayload): Promise<Produit> {
    try {
      const response = await apiService.post<CreateProduitPayload, Produit>('/produits/', payload);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  async updateProduit(produitId: string, payload: UpdateProduitPayload): Promise<Produit> {
    try {
      const response = await apiService.put<UpdateProduitPayload, Produit>(`/produits/${produitId}`, payload);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  async initializeStock(payload: StockInitialPayload): Promise<any> {
    try {
      const response = await apiService.post<StockInitialPayload, any>('/stocks/stocks_initiaux', payload);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  async getProduitsByStation(stationId: string): Promise<Produit[]> {
    try {
      const response = await apiService.get<Produit[]>(`/produits/par_station/${stationId}`);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
}

export const familleProduitService = new FamilleProduitService();