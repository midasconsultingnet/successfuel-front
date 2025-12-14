import { apiService } from './ApiService';
import type { Customer, PaginatedResponse } from './ApiService';
import type { HttpRequestConfig } from './HttpClient';

/**
 * Service pour gérer les opérations liées aux clients
 */
class CustomerService {
  private endpoint = '/customers';

  /**
   * Récupère la liste paginée des clients
   */
  async getCustomers(
    page: number = 1,
    pageSize: number = 10,
    filters?: Partial<Customer>,
    config: HttpRequestConfig = {}
  ): Promise<PaginatedResponse<Customer>> {
    const params: Record<string, string | number> = {
      page,
      pageSize,
      ...filters
    };

    return apiService.get<PaginatedResponse<Customer>>(this.endpoint, {
      params,
      ...config
    });
  }

  /**
   * Récupère un client par son ID
   */
  async getCustomerById(id: string, config: HttpRequestConfig = {}): Promise<Customer> {
    return apiService.get<Customer>(`${this.endpoint}/${id}`, config);
  }

  /**
   * Crée un nouveau client
   */
  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, config: HttpRequestConfig = {}): Promise<Customer> {
    return apiService.post<Customer>(this.endpoint, customer, config);
  }

  /**
   * Met à jour un client existant
   */
  async updateCustomer(id: string, customer: Partial<Customer>, config: HttpRequestConfig = {}): Promise<Customer> {
    return apiService.put<Customer>(`${this.endpoint}/${id}`, customer, config);
  }

  /**
   * Supprime un client
   */
  async deleteCustomer(id: string, config: HttpRequestConfig = {}): Promise<void> {
    await apiService.delete(`${this.endpoint}/${id}`, config);
  }

  /**
   * Recherche des clients par nom ou email
   */
  async searchCustomers(query: string, config: HttpRequestConfig = {}): Promise<Customer[]> {
    const params = { q: query };
    return apiService.get<Customer[]>(`${this.endpoint}/search`, {
      params,
      ...config
    });
  }

  /**
   * Exporte la liste des clients
   */
  async exportCustomers(format: 'csv' | 'xlsx' | 'pdf' = 'csv', config: HttpRequestConfig = {}): Promise<Blob> {
    const params = { format };
    const url = `${apiService.getBaseUrl()}${this.endpoint}/export?${new URLSearchParams(params as Record<string, string>)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...apiService['defaultHeaders'],
        ...config.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de l'export: ${response.status}`);
    }

    return response.blob();
  }
}

// Export d'une instance unique du service client
export const customerService = new CustomerService();

// Export pour les types liés à l'interface utilisateur
export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}