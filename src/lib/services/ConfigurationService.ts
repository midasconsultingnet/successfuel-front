import { apiService } from './ApiService';

// Types pour la configuration de la station
export interface ConfigurationState {
  id: string;
  station_id: string;
  station_name?: string; // Nom de la station (optionnel)
  station_code?: string; // Code de la station (optionnel)
  station_address?: string | null; // Adresse de la station (optionnel)
  infrastructure_complete: boolean;
  partners_complete: boolean;
  employees_complete: boolean;
  finances_complete: boolean;
  balance_complete: boolean;
  retail_complete: boolean;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureConfig {
  fuels: FuelConfig[];
  tanks: TankConfig[];
  pumps: PumpConfig[];
  initial_stocks: InitialStockConfig[];
}

export interface FuelConfig {
  id?: string;
  type: string;
  purchase_price: number;
  sale_price: number;
  currency: string;
}

export interface TankConfig {
  id?: string;
  code: string;
  name: string;
  capacity: number;
  tank_calibration: CalibrationEntry[]; // Tableau de points de calibrage
}

export interface CalibrationEntry {
  level: number; // hauteur en cm
  volume: number; // volume en litres
}

export interface PumpConfig {
  id?: string;
  number: string;
  name: string;
  tank_id: string;
  initial_index: number;
}

export interface InitialStockConfig {
  id?: string;
  tank_id: string;
  initial_level: number;
  valuation: number;
}

export interface PartnerConfig {
  suppliers: SupplierConfig[];
  customers: CustomerConfig[];
}

export interface SupplierConfig {
  id: string;
  is_new: boolean;
}

export interface CustomerConfig {
  id: string;
  is_new: boolean;
}

export interface EmployeeConfig {
  employees: EmployeeDetails[];
}

export interface EmployeeDetails {
  id?: string;
  user_id: string;
  name: string;
  salary: number;
  position?: string;
}

export interface FinanceConfig {
  treasuries: TreasuryConfig[];
  payment_methods: PaymentMethodConfig[];
}

export interface TreasuryConfig {
  id?: string;
  name: string;
  type: 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres';
  initial_balance: number;
  solde_tresorerie?: number;
  currency?: string;
  bank_details?: Record<string, any>;
}

export interface PaymentMethodConfig {
  id?: string;
  name: string;
  treasury_id: string;
  actif: boolean;
}

export interface PaymentMethodAPI {
  id: string;
  nom: string;
  description?: string | null;
  type_paiement: string;
  trésorerie_id?: string | null;
}

export interface BalanceConfig {
  initial_balances: InitialBalanceConfig[];
  asset_valuations: AssetValuationConfig[];
  treasury_initial_balances: TreasuryInitialBalanceConfig[];
}

export interface InitialBalanceConfig {
  id?: string;
  entity_id: string;
  entity_type: 'supplier' | 'customer' | 'employee';
  balance: number;
  currency: string;
}

export interface AssetValuationConfig {
  id?: string;
  asset_name: string;
  description: string;
  valuation: number;
  currency: string;
}

export interface TreasuryInitialBalanceConfig {
  id?: string;
  treasury_id: string;
  initial_balance: number;
}

export interface RetailConfig {
  products: RetailProductConfig[];
}

export interface RetailProductConfig {
  id?: string;
  name: string;
  category: 'boutique' | 'lubrifiants' | 'gaz' | 'services';
  code?: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  description?: string;
}

// Interface pour la configuration complète de la station
export interface StationConfiguration {
  completion: {
    infrastructure?: {
      fuel?: boolean;
      tanks?: boolean;
      pumps?: boolean;
      stock?: boolean;
      overall?: boolean;
    };
    partners?: {
      suppliers?: boolean;
      customers?: boolean;
      overall?: boolean;
    };
    employees?: {
      employees?: boolean;
      overall?: boolean;
    };
    finances?: {
      treasuries?: boolean;
      payment_methods?: boolean;
      overall?: boolean;
    };
    balance?: {
      assets?: boolean;
      receivables?: boolean;
      debts?: boolean;
      overall?: boolean;
    };
    retail?: {
      overall?: boolean;
    };
  };
}

// Service pour gérer la configuration de la station
class ConfigurationService {
  /**
   * Vérifier l'état de configuration d'une station
   */
  async getConfigurationState(stationId: string): Promise<ConfigurationState> {
    return await apiService.get<ConfigurationState>(`/stations/${stationId}/configuration/state`);
  }

  /**
   * Sauvegarder l'état de configuration d'une station
   */
  async saveConfigurationState(stationId: string, configState: Partial<ConfigurationState>): Promise<ConfigurationState> {
    return await apiService.post<ConfigurationState>(`/stations/${stationId}/configuration/state`, configState);
  }

  /**
   * Sauvegarder la configuration d'infrastructure
   */
  async saveInfrastructureConfig(stationId: string, config: InfrastructureConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/infrastructure`, config);
  }

  /**
   * Sauvegarder la configuration des partenaires
   */
  async savePartnerConfig(stationId: string, config: PartnerConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/partners`, config);
  }

  /**
   * Sauvegarder la configuration des employés
   */
  async saveEmployeeConfig(stationId: string, config: EmployeeConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/employees`, config);
  }

  /**
   * Sauvegarder la configuration financière
   */
  async saveFinanceConfig(stationId: string, config: FinanceConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/finances`, config);
  }

  /**
   * Sauvegarder la configuration du bilan initial
   */
  async saveBalanceConfig(stationId: string, config: BalanceConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/balance`, config);
  }

  /**
   * Sauvegarder la configuration des produits et services
   */
  async saveRetailConfig(stationId: string, config: RetailConfig): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/retail`, config);
  }

  /**
   * Valider et finaliser la configuration
   */
  async finalizeConfiguration(stationId: string): Promise<void> {
    return await apiService.post<void>(`/stations/${stationId}/configuration/finalize`, {});
  }

  /**
   * Obtenir la configuration complète d'une station
   */
  async getFullConfiguration(stationId: string): Promise<any> {
    return await apiService.get<any>(`/stations/${stationId}/configuration/full`);
  }

  /**
   * Sauvegarder la configuration complète d'une station
   */
  async saveStationConfiguration(stationId: string, config: StationConfiguration): Promise<void> {
    return await apiService.put<void>(`/compagnie/stations/${stationId}/config`, config);
  }
}

// Exporter une instance du service
export const configurationService = new ConfigurationService();