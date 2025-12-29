import { apiService } from './ApiService';

export interface PaymentMethod {
  id: string;
  nom: string;
  description?: string | null;
  type_paiement: string;
  tresorerie_id?: string | null;
}

export interface CreatePaymentMethodData {
  nom: string;
  description?: string | null;
  type_paiement: string;
  tresorerie_id?: string | null;
}

export interface UpdatePaymentMethodData {
  nom?: string;
  description?: string | null;
  type_paiement?: string;
  tresorerie_id?: string | null;
}

export interface AssociatePaymentMethodToTreasuryData {
  tresorerie_id: string;
  methode_paiement_id: string;
  actif: boolean;
}

export interface TreasuryPaymentMethodAssociation {
  tresorerie_id: string;
  methode_paiement_id: string;
  id: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

class PaymentMethodService {
  private readonly basePath = '/methodes-paiement';

  /**
   * Récupérer toutes les méthodes de paiement
   */
  async getAllPaymentMethods(skip: number = 0, limit: number = 100): Promise<PaymentMethod[]> {
    try {
      const response = await apiService.get<PaymentMethod[]>(
        `${this.basePath}/?skip=${skip}&limit=${limit}`
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des méthodes de paiement:', error);
      throw error;
    }
  }

  /**
   * Récupérer une méthode de paiement par son ID
   */
  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    try {
      const response = await apiService.get<PaymentMethod>(
        `${this.basePath}/${id}`
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération de la méthode de paiement:', error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle méthode de paiement
   */
  async createPaymentMethod(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    try {
      const response = await apiService.post<PaymentMethod>(
        this.basePath,
        data
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de la création de la méthode de paiement:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une méthode de paiement
   */
  async updatePaymentMethod(id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
    try {
      const response = await apiService.put<PaymentMethod>(
        `${this.basePath}/${id}`,
        data
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la méthode de paiement:', error);
      throw error;
    }
  }

  /**
   * Supprimer une méthode de paiement
   */
  async deletePaymentMethod(id: string): Promise<void> {
    try {
      await apiService.delete(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la méthode de paiement:', error);
      throw error;
    }
  }

  /**
   * Associer une méthode de paiement à une trésorerie
   */
  async associatePaymentMethodToTreasury(data: AssociatePaymentMethodToTreasuryData): Promise<TreasuryPaymentMethodAssociation> {
    try {
      const response = await apiService.post<TreasuryPaymentMethodAssociation>(
        `${this.basePath}/associer/`,
        data
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de l\'association de la méthode de paiement à la trésorerie:', error);
      throw error;
    }
  }

  /**
   * Récupérer les méthodes de paiement associées à une trésorerie spécifique
   */
  async getPaymentMethodsByTreasury(treasuryId: string): Promise<PaymentMethod[]> {
    try {
      const response = await apiService.get<PaymentMethod[]>(
        `${this.basePath}/tresorerie/${treasuryId}`
      );
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des méthodes de paiement par trésorerie:', error);
      throw error;
    }
  }

}

export const paymentMethodService = new PaymentMethodService();