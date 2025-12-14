import { apiService } from './ApiService';
import type { HttpRequestConfig } from './HttpClient';

// Interface pour la mise à jour du profil utilisateur
export interface UpdateProfileRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
}

// Interface pour la réponse de mise à jour du profil
export interface UpdateProfileResponse {
  id: string;
  nom?: string;
  prenom?: string;
  email: string;
  login: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * Service pour gérer les opérations liées au profil utilisateur
 */
class ProfileService {
  /**
   * Met à jour le profil de l'utilisateur connecté
   */
  async updateProfile(
    profileData: UpdateProfileRequest,
    config: HttpRequestConfig = {}
  ): Promise<UpdateProfileResponse> {
    return apiService.put<UpdateProfileResponse>('/auth/users/me', profileData, config);
  }

  /**
   * Récupère les informations du profil de l'utilisateur connecté
   */
  async getProfile(config: HttpRequestConfig = {}): Promise<UpdateProfileResponse> {
    return apiService.get<UpdateProfileResponse>('/auth/users/me', config);
  }
}

// Export d'une instance unique du service profil
export const profileService = new ProfileService();

// Export pour les types liés à l'interface utilisateur
export interface ProfileFormData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  confirmPassword: string;
}