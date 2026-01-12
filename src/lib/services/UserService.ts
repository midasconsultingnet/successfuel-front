import { apiService } from './ApiService';
import type { HttpRequestConfig } from './HttpClient';

// Interface pour les stations accessibles
export interface StationAccessible {
  id: string;
  compagnie_id: string;
  nom: string;
  code: string;
  adresse: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  est_actif: boolean;
}

// Interfaces pour les réponses de l'API utilisateur
export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  login: string;
  role: string;
  created_at: string;
  updated_at: string;
  date_derniere_connexion: string;
  actif: boolean;
  compagnie_id: string;
  stations_accessibles: StationAccessible[];
}

export interface Company {
  id: string;
  nom: string;
  pays_id: string;
  adresse: string;
  telephone: string;
  email: string | null;
  devise: string;
  created_at: string;
  updated_at: string;
}

// Service pour gérer les opérations liées aux utilisateurs
class UserService {
  private userEndpoint = '/auth/users';
  private companyEndpoint = '/compagnie';

  /**
   * Récupérer les informations de l'utilisateur connecté
   */
  async getMe(config: HttpRequestConfig = {}): Promise<User> {
    return apiService.get<User>('/auth/users/me', config);
  }

  /**
   * Récupérer les informations de la compagnie
   */
  async getCompany(config: HttpRequestConfig = {}): Promise<Company> {
    return apiService.get<Company>(this.companyEndpoint, config);
  }

  /**
   * Mettre à jour les informations de l'utilisateur
   */
  async updateMe(userData: Partial<User>, config: HttpRequestConfig = {}): Promise<User> {
    return apiService.put<User>(`${this.userEndpoint}/me`, userData, config);
  }
}

// Export d'une instance unique du service utilisateur
export const userService = new UserService();