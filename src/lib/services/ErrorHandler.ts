import type { ApiError, NotificationHandler } from './HttpClient';

/**
 * Types pour les erreurs applicatives
 */
export enum AppErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Interface pour les erreurs applicatives enrichies
 */
export interface AppError extends ApiError {
  code: AppErrorCode;
  details?: Record<string, any>;
}

/**
 * Fonction utilitaire pour transformer une erreur API en erreur applicative
 */
export function transformApiError(error: any): AppError {
  // Si c'est déjà une erreur application avec un code connu
  if (error.code && Object.values(AppErrorCode).includes(error.code)) {
    return error;
  }

  // Si c'est une erreur avec un statut HTTP
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          code: AppErrorCode.VALIDATION_ERROR,
          message: error.message || 'Données de requête invalides',
          status: error.status,
          data: error.data
        };
      case 401:
        return {
          code: AppErrorCode.AUTHENTICATION_ERROR,
          message: error.message || 'Authentification requise',
          status: error.status,
          data: error.data
        };
      case 403:
        return {
          code: AppErrorCode.AUTHORIZATION_ERROR,
          message: error.message || 'Accès non autorisé',
          status: error.status,
          data: error.data
        };
      case 404:
        return {
          code: AppErrorCode.NOT_FOUND_ERROR,
          message: error.message || 'Ressource non trouvée',
          status: error.status,
          data: error.data
        };
      case 500:
        return {
          code: AppErrorCode.SERVER_ERROR,
          message: error.message || 'Erreur serveur interne',
          status: error.status,
          data: error.data
        };
      default:
        return {
          code: AppErrorCode.UNKNOWN_ERROR,
          message: error.message || `Erreur inconnue (${error.status})`,
          status: error.status,
          data: error.data
        };
    }
  }

  // Si c'est une erreur réseau
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: AppErrorCode.NETWORK_ERROR,
      message: error.message || 'Erreur de réseau',
      status: undefined,
      data: undefined
    };
  }

  // Erreur inconnue
  return {
    code: AppErrorCode.UNKNOWN_ERROR,
    message: error.message || 'Une erreur inconnue s\'est produite',
    status: undefined,
    data: undefined
  };
}

/**
 * Gère l'affichage des erreurs à l'utilisateur
 */
export function handleError(error: any, notificationHandler?: NotificationHandler) {
  const appError = transformApiError(error);

  // Afficher l'erreur via une notification toast si un gestionnaire est disponible
  if (notificationHandler) {
    notificationHandler.showError(getErrorMessageByCode(appError.code), appError.message);
  }

  // Log l'erreur dans la console pour le développement
  console.error('Erreur application:', appError);

  // Retourne l'erreur transformée pour une utilisation ultérieure
  return appError;
}

/**
 * Obtient un message d'erreur convivial basé sur le code d'erreur
 */
function getErrorMessageByCode(code: AppErrorCode): string {
  switch (code) {
    case AppErrorCode.NETWORK_ERROR:
      return 'Erreur de réseau';
    case AppErrorCode.AUTHENTICATION_ERROR:
      return 'Session expirée';
    case AppErrorCode.AUTHORIZATION_ERROR:
      return 'Accès refusé';
    case AppErrorCode.VALIDATION_ERROR:
      return 'Données invalides';
    case AppErrorCode.NOT_FOUND_ERROR:
      return 'Non trouvé';
    case AppErrorCode.SERVER_ERROR:
      return 'Erreur serveur';
    default:
      return 'Erreur';
  }
}

/**
 * Extrait les détails de validation depuis une erreur
 */
export function getValidationErrorDetails(error: AppError): Record<string, string[]> | null {
  if (error.code === AppErrorCode.VALIDATION_ERROR && error.data && typeof error.data === 'object') {
    // Selon la structure typique des erreurs de validation provenant du backend
    if (error.data.errors) {
      return error.data.errors;
    }
    if (error.data.validation) {
      return error.data.validation;
    }
  }
  return null;
}