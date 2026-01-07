import { apiService } from './ApiService';

// Types pour les groupes partenaires
export interface GroupePartenaire {
  id: string;
  nom: string;
  infos_plus: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupePartenaireRequest {
  nom: string;
  infos_plus?: Record<string, any> | null;
}

export interface UpdateGroupePartenaireRequest {
  nom?: string;
  infos_plus?: Record<string, any> | null;
}

// Service pour gérer les groupes partenaires
class GroupePartenaireService {
  /**
   * Récupérer la liste des groupes partenaires
   */
  async getGroupesPartenaires(): Promise<GroupePartenaire[]> {
    return await apiService.get<GroupePartenaire[]>('/groupe-partenaire');
  }

  /**
   * Récupérer un groupe partenaire par son ID
   */
  async getGroupePartenaireById(id: string): Promise<GroupePartenaire> {
    return await apiService.get<GroupePartenaire>(`/groupe-partenaire/${id}`);
  }

  /**
   * Créer un nouveau groupe partenaire
   */
  async createGroupePartenaire(groupe: CreateGroupePartenaireRequest): Promise<GroupePartenaire> {
    return await apiService.post<GroupePartenaire>('/groupe-partenaire', groupe);
  }

  /**
   * Mettre à jour un groupe partenaire
   */
  async updateGroupePartenaire(id: string, groupe: UpdateGroupePartenaireRequest): Promise<GroupePartenaire> {
    return await apiService.put<GroupePartenaire>(`/groupe-partenaire/${id}`, groupe);
  }

  /**
   * Supprimer un groupe partenaire
   */
  async deleteGroupePartenaire(id: string): Promise<void> {
    return await apiService.delete<void>(`/groupe-partenaire/${id}`);
  }
}

// Exporter une instance du service
export const groupePartenaireService = new GroupePartenaireService();