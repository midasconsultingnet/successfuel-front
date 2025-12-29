import { apiService } from './ApiService';

export interface Employee {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  statut: string;
  donnees_personnelles: {
    poste?: string;
    salaire?: number;
    date_embauche?: string;
    contact_urgence?: {
      nom: string;
      telephone: string;
    };
  };
  station_ids: string[];
  metadonnees: {
    poste?: string;
    salaire?: number;
    departement?: string;
    date_embauche?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  statut?: string;
  donnees_personnelles?: {
    poste?: string;
    salaire?: number;
    date_embauche?: string;
    contact_urgence?: {
      nom: string;
      telephone: string;
    };
  };
  station_ids?: string[];
  metadonnees?: {
    poste?: string;
    salaire?: number;
    departement?: string;
    date_embauche?: string;
  };
}

export interface UpdateEmployeeData {
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  statut?: string;
  donnees_personnelles?: {
    poste?: string;
    salaire?: number;
    date_embauche?: string;
    contact_urgence?: {
      nom: string;
      telephone: string;
    };
  };
  station_ids?: string[];
  metadonnees?: {
    poste?: string;
    salaire?: number;
    departement?: string;
    date_embauche?: string;
  };
}

export class EmployeeService {
  private basePath = '/tiers';

  /**
   * Récupérer tous les employés d'une station spécifique
   */
  async getEmployeesByStation(stationId: string): Promise<Employee[]> {
    return apiService.get(`${this.basePath}/stations/${stationId}/employes`);
  }

  /**
   * Récupérer un employé par son ID
   */
  async getEmployeeById(employeeId: string): Promise<Employee> {
    return apiService.get(`${this.basePath}/employes/${employeeId}`);
  }

  /**
   * Créer un nouvel employé
   */
  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    return apiService.post(`${this.basePath}/employes`, data);
  }

  /**
   * Mettre à jour un employé existant
   */
  async updateEmployee(employeeId: string, data: UpdateEmployeeData): Promise<Employee> {
    return apiService.put(`${this.basePath}/employes/${employeeId}`, data);
  }

  /**
   * Supprimer un employé
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    return apiService.delete(`${this.basePath}/employes/${employeeId}`);
  }

  /**
   * Associer un employé à une station
   */
  async associateEmployeeToStation(employeeId: string, stationId: string): Promise<void> {
    return apiService.post(`${this.basePath}/tiers/${employeeId}/associer-station/${stationId}`, {});
  }

  /**
   * Dissocier un employé d'une station
   */
  async dissociateEmployeeFromStation(employeeId: string, stationId: string): Promise<void> {
    return apiService.post(`${this.basePath}/tiers/${employeeId}/dissocier-station/${stationId}`, {});
  }

  /**
   * Récupérer tous les employés de la compagnie (sans les limiter à une station)
   */
  async getAllEmployees(): Promise<Employee[]> {
    return apiService.get(`${this.basePath}/employes`);
  }
}

// Exporter une instance unique du service employés
export const employeeService = new EmployeeService();