import { apiService } from './ApiService';
import type { HttpRequestConfig } from './HttpClient';

/**
 * Interfaces pour le plan comptable
 */
export interface PlanComptable {
  id: string;
  numero_compte?: string | null;
  libelle_compte: string;
  categorie: string;
  type_compte: string;
  parent_id?: string | null;
  compagnie_id?: string | null;
  est_actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanComptableCreate {
  numero_compte?: string | null;
  libelle_compte: string;
  categorie?: string;
  type_compte?: string;
  parent_id?: string | null;
  compagnie_id?: string | null;
  est_actif?: boolean;
}

export interface PlanComptableUpdate {
  numero_compte?: string | null;
  libelle_compte?: string | null;
  categorie?: string | null;
  type_compte?: string | null;
  parent_id?: string | null;
  compagnie_id?: string | null;
  est_actif?: boolean | null;
}

export interface PlanComptableHierarchy extends PlanComptable {
  enfants: PlanComptableHierarchy[];
}

/**
 * Service pour gérer les opérations liées au plan comptable
 */
class PlanComptableService {
  private endpoint = '/plan-comptable/plan-comptable';

  /**
   * Récupère la liste paginée des plans comptables
   */
  async getPlansComptables(
    page: number = 1,
    pageSize: number = 100,
    config: HttpRequestConfig = {}
  ): Promise<{ data: PlanComptable[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;

    const params: Record<string, string | number> = {
      skip,
      limit: pageSize
    };

    const response = await apiService.get<{ data: PlanComptable[]; total: number }>(this.endpoint, {
      params,
      ...config
    });

    // Adapter la réponse pour correspondre à notre format standard
    return {
      data: response.data,
      total: response.total,
      page,
      pageSize,
      totalPages: Math.ceil(response.total / pageSize) || 1
    };
  }

  /**
   * Récupère un plan comptable par son ID
   */
  async getPlanComptableById(id: string, config: HttpRequestConfig = {}): Promise<PlanComptable> {
    return apiService.get<PlanComptable>(`${this.endpoint}/${id}`, config);
  }

  /**
   * Crée un nouveau plan comptable
   */
  async createPlanComptable(plan: PlanComptableCreate, config: HttpRequestConfig = {}): Promise<PlanComptable> {
    return apiService.post<PlanComptable>(this.endpoint, plan, config);
  }

  /**
   * Met à jour un plan comptable existant
   */
  async updatePlanComptable(id: string, plan: PlanComptableUpdate, config: HttpRequestConfig = {}): Promise<PlanComptable> {
    return apiService.put<PlanComptable>(`${this.endpoint}/${id}`, plan, config);
  }

  /**
   * Supprime un plan comptable
   */
  async deletePlanComptable(id: string, config: HttpRequestConfig = {}): Promise<void> {
    await apiService.delete(`${this.endpoint}/${id}`, config);
  }

  /**
   * Récupère un plan comptable avec sa hiérarchie complète
   */
  async getPlanComptableWithHierarchy(id: string, config: HttpRequestConfig = {}): Promise<PlanComptableHierarchy> {
    return apiService.get<PlanComptableHierarchy>(`${this.endpoint}/${id}/hierarchy`, config);
  }

  /**
   * Récupère la hiérarchie complète du plan comptable
   */
  async getFullPlanHierarchy(config: HttpRequestConfig = {}): Promise<PlanComptableHierarchy[]> {
    return apiService.get<PlanComptableHierarchy[]>(`${this.endpoint}/hierarchy/full`, config);
  }

  /**
   * Récupère un plan comptable par son numéro de compte
   */
  async getPlanComptableByNumero(numeroCompte: string, config: HttpRequestConfig = {}): Promise<PlanComptableHierarchy> {
    return apiService.get<PlanComptableHierarchy>(`${this.endpoint}/by-numero/${numeroCompte}`, config);
  }

  /**
   * Recherche des plans comptables par libellé ou numéro
   */
  async searchPlansComptables(query: string, config: HttpRequestConfig = {}): Promise<PlanComptable[]> {
    const params = { q: query };
    return apiService.get<PlanComptable[]>(`${this.endpoint}/search`, {
      params,
      ...config
    });
  }

  /**
   * Active/désactive un plan comptable
   */
  async togglePlanComptableStatus(id: string, estActif: boolean, config: HttpRequestConfig = {}): Promise<PlanComptable> {
    // Note: L'API n'a pas d'endpoint spécifique pour activer/désactiver, donc on fait une mise à jour partielle
    return this.updatePlanComptable(id, { est_actif: estActif }, config);
  }
}

// Export d'une instance unique du service
export const planComptableService = new PlanComptableService();

/**
 * Interface pour les données du formulaire de plan comptable
 */
export interface PlanComptableFormData {
  numero_compte?: string;
  libelle_compte: string;
  categorie: string;
  type_compte: string;
  parent_id?: string;
  compagnie_id?: string;
}