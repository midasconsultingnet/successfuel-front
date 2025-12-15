import { HttpClient } from './HttpClient';
import type { HttpRequestConfig, NotificationHandler } from './HttpClient';
import { i18nStore } from '$lib/i18n';
import { authService } from './AuthService';

// Configuration de l'API principale
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Service principal pour les interactions avec l'API backend
class ApiService extends HttpClient {
  private unsubscribeFromStore: (() => void) | null = null;

  constructor(notificationHandler?: NotificationHandler) {
    // Initialiser avec les headers de base
    super(API_BASE_URL, {}, notificationHandler);

    // Initialiser le header de langue avec la valeur actuelle
    let currentLanguage = 'en'; // Valeur par défaut
    this.unsubscribeFromStore = i18nStore.subscribe((state) => {
      if (state.currentLanguage && state.isInitialized) {
        currentLanguage = state.currentLanguage;
        this.setDefaultHeader('Accept-Language', currentLanguage);
      }
    });

    // Écouter les changements de langue pour mettre à jour le header
    this.setupLanguageListener();

    // Ajouter un intercepteur pour inclure le token JWT dans toutes les requêtes
    this.setupAuthInterceptor();

    // Vérifier le token au démarrage
    this.checkAndSetAuthToken();
  }

  private checkAndSetAuthToken() {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.setDefaultHeader('Authorization', `Bearer ${token}`);
    } else {
      this.removeDefaultHeader('Authorization');
    }
  }

  private setupLanguageListener() {
    // Écouter les changements de langue et mettre à jour le header correspondant
    if (typeof window !== 'undefined') {
      window.addEventListener('languageChanged', (event: any) => {
        const newLanguage = event.detail.language;
        this.setDefaultHeader('Accept-Language', newLanguage);
      });
    }
  }

  private setupAuthInterceptor() {
    // Écoute les changements de token d'authentification et met à jour les headers
    const authToken = localStorage.getItem('access_token');
    if (authToken) {
      this.setDefaultHeader('Authorization', `Bearer ${authToken}`);
    }

    // Écouter les changements de token dans localStorage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'access_token') {
          if (event.newValue) {
            this.setDefaultHeader('Authorization', `Bearer ${event.newValue}`);
          } else {
            this.removeDefaultHeader('Authorization');
          }
        }
      });
    }
  }

  // Actualise le token d'authentification
  setAuthToken(token: string | null, expiry: Date | null = null) {
    if (token) {
      this.setDefaultHeader('Authorization', `Bearer ${token}`);
      localStorage.setItem('access_token', token);

      // Stocker la date d'expiration pour éviter le décodage JWT
      if (expiry) {
        localStorage.setItem('access_token_expiry', expiry.getTime().toString());
      }
    } else {
      this.removeDefaultHeader('Authorization');
      localStorage.removeItem('access_token');
      localStorage.removeItem('access_token_expiry');
    }
  }

  // Surcharge des méthodes pour gérer automatiquement le rafraîchissement du token
  async get<T>(endpoint: string, config: HttpRequestConfig = {}, customFetch?: typeof fetch): Promise<T> {
    return authService.handleRequestWithAuth(() => super.get<T>(endpoint, config, customFetch));
  }

  async post<T>(endpoint: string, data?: any, config: HttpRequestConfig = {}, customFetch?: typeof fetch): Promise<T> {
    return authService.handleRequestWithAuth(() => super.post<T>(endpoint, data, config, customFetch));
  }

  async put<T>(endpoint: string, data?: any, config: HttpRequestConfig = {}, customFetch?: typeof fetch): Promise<T> {
    return authService.handleRequestWithAuth(() => super.put<T>(endpoint, data, config, customFetch));
  }

  async delete<T>(endpoint: string, config: HttpRequestConfig = {}, customFetch?: typeof fetch): Promise<T> {
    return authService.handleRequestWithAuth(() => super.delete<T>(endpoint, config, customFetch));
  }

  // Nettoyage des ressources
  destroy() {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }
  }
}

// Création d'une instance unique du service API
export const apiService = new ApiService();

// Export pour les types liés aux entités du système
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Types pour les différentes entités
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product extends BaseEntity {
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
}

export interface Sale extends BaseEntity {
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
}

export interface Inventory extends BaseEntity {
  productId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
}