/**
 * Interface pour configurer les requêtes HTTP
 */
export interface HttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * Interface pour les erreurs d'API
 */
export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

/**
 * Interface pour les gestionnaires de notifications
 */
export interface NotificationHandler {
  showError(title: string, description?: string): void;
  showSuccess(title: string, description?: string): void;
  showInfo(title: string, description?: string): void;
  showWarning(title: string, description?: string): void;
}

/**
 * Classe générique pour gérer les appels HTTP
 */
export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private notificationHandler?: NotificationHandler;

  constructor(
    baseUrl: string, 
    defaultHeaders: Record<string, string> = {},
    notificationHandler?: NotificationHandler
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.notificationHandler = notificationHandler;
  }

  /**
   * Méthode GET
   */
  async get<T>(endpoint: string, config: HttpRequestConfig = {}): Promise<T> {
    const url = this.buildUrl(endpoint, config.params);
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...config.headers }
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Méthode POST
   */
  async post<T>(endpoint: string, data?: any, config: HttpRequestConfig = {}): Promise<T> {
    const url = this.buildUrl(endpoint, config.params);
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...config.headers },
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Méthode PUT
   */
  async put<T>(endpoint: string, data?: any, config: HttpRequestConfig = {}): Promise<T> {
    const url = this.buildUrl(endpoint, config.params);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { ...this.defaultHeaders, ...config.headers },
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Méthode DELETE
   */
  async delete<T>(endpoint: string, config: HttpRequestConfig = {}): Promise<T> {
    const url = this.buildUrl(endpoint, config.params);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...config.headers }
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Construit l'URL complète avec les paramètres de requête
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    // Si l'endpoint commence par /, on le concatène avec l'URL de base
    // Sinon, on utilise le comportement par défaut de URL
    let url: string;
    if (endpoint.startsWith('/')) {
      // S'assurer que l'URL de base ne se termine pas par / et que le endpoint commence par /
      const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      url = baseUrl + endpoint;
    } else {
      url = new URL(endpoint, this.baseUrl).toString();
    }

    // Créer l'URL finale
    const urlObj = new URL(url);

    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });
    }

    return urlObj.toString();
  }

  /**
   * Gère la réponse HTTP et retourne les données ou lève une erreur
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      const apiError: ApiError = {
        message: errorData.message || `Erreur HTTP: ${response.status}`,
        status: response.status,
        data: errorData
      };

      // Affiche une notification d'erreur si un gestionnaire est disponible
      if (this.notificationHandler) {
        this.notificationHandler.showError(`Erreur ${response.status}`, apiError.message);
      }

      throw apiError;
    }

    // Les réponses avec statut 204 (No Content) n'ont pas de corps
    if (response.status === 204) {
      return {} as T;
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      // Si la réponse n'est pas au format JSON, retourne la chaîne brute
      console.warn('La réponse n\'est pas au format JSON:', error);
      const text = await response.text();
      return text as unknown as T;
    }
  }

  /**
   * Parse les erreurs de réponse
   */
  private async parseErrorResponse(response: Response) {
    try {
      return await response.json();
    } catch (error) {
      // Si le corps n'est pas au format JSON, retourne le texte brut
      try {
        const text = await response.text();
        return { message: text };
      } catch (textError) {
        return { message: response.statusText };
      }
    }
  }

  /**
   * Met à jour les headers par défaut
   */
  setDefaultHeader(name: string, value: string) {
    this.defaultHeaders[name] = value;
  }

  /**
   * Supprime un header par défaut
   */
  removeDefaultHeader(name: string) {
    delete this.defaultHeaders[name];
  }

  /**
   * Met à jour le gestionnaire de notifications
   */
  setNotificationHandler(handler: NotificationHandler) {
    this.notificationHandler = handler;
  }

  /**
   * Accesseur pour l'URL de base
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}