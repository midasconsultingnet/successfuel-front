import { apiService } from './ApiService';

// Types pour la configuration des partenaires
export interface PartnerConfiguration {
  id: string;
  station_id: string;
  suppliers: Supplier[];
  customers: Customer[];
  created_at: string;
  updated_at: string;
}

// Interface étendue pour le fournisseur avec les champs virtuels
export interface Supplier {
  id: string;
  nom: string;
  code: string;
  email: string;
  telephone: string;
  adresse: string;
  statut: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
  station_ids: string[];
  created_at: string;
  updated_at: string;
  // Champs virtuels extraits de metadonnees
  type?: 'carburants' | 'huiles' | 'equipements' | 'other';
  // Champs virtuels extraits de donnees_personnelles
  contact_person?: string;
}

// Interface pour le fournisseur avec les champs virtuels accessibles
export interface SupplierWithVirtualFields extends Supplier {
  type: 'carburants' | 'huiles' | 'equipements' | 'other';
}

export interface Customer {
  id: string;
  nom: string;
  code: string;
  email: string;
  telephone: string;
  adresse: string;
  statut: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
  station_ids: string[];
  created_at: string;
  updated_at: string;
  // Champs virtuels extraits de metadonnees
  categorie?: 'particulier' | 'entreprise' | 'fleet' | 'gouvernement';
  // Champs virtuels extraits de donnees_personnelles
  contact_person?: string;
}

// Interface pour le client avec les champs virtuels accessibles
export interface CustomerWithVirtualFields extends Customer {
  categorie: 'particulier' | 'entreprise' | 'fleet' | 'gouvernement';
}


export interface CreateSupplierRequest {
  nom: string;
  code: string;
  contact_person: string;
  email: string;
  telephone: string;
  adresse: string;
  type: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
}

export interface UpdateSupplierRequest {
  nom?: string;
  code?: string;
  contact_person?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  type?: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
}

export interface CreateCustomerRequest {
  nom: string;
  code: string;
  contact_person: string;
  email: string;
  telephone: string;
  adresse: string;
  categorie: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
}

export interface UpdateCustomerRequest {
  nom?: string;
  code?: string;
  contact_person?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  categorie?: string;
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: Record<string, any> | null;
}

// Service pour gérer les partenaires (fournisseurs et clients)
class PartnerService {
  /**
   * Récupérer la configuration des partenaires pour une station
   */
  async getPartnersConfiguration(stationId: string) {
    return await apiService.get<PartnerConfiguration>(`/compagnie/stations/${stationId}/partenaires`);
  }

  /**
   * Sauvegarder la configuration des partenaires pour une station
   */
  async savePartnersConfiguration(stationId: string, config: PartnerConfiguration) {
    return await apiService.post<PartnerConfiguration>(`/compagnie/stations/${stationId}/partenaires`, config);
  }

  /**
   * Récupérer les fournisseurs d'une station
   */
  async getStationSuppliers(stationId: string) {
    return await apiService.get<Supplier[]>(`/tiers/stations/${stationId}/fournisseurs`);
  }

  /**
   * Récupérer un fournisseur spécifique
   */
  async getSupplierById(supplierId: string) {
    return await apiService.get<Supplier>(`/tiers/fournisseurs/${supplierId}`);
  }

  /**
   * Créer un nouveau fournisseur
   */
  async createSupplier(supplier: CreateSupplierRequest) {
    return await apiService.post<Supplier>(`/tiers/fournisseurs`, supplier);
  }

  /**
   * Créer un nouveau fournisseur et l'associer à une station
   */
  async createSupplierForStation(stationId: string, supplier: CreateSupplierRequest) {
    const createdSupplier = await this.createSupplier(supplier);
    // Associer le fournisseur nouvellement créé à la station
    await this.associateTiersToStation(createdSupplier.id, stationId);
    return createdSupplier;
  }

  /**
   * Mettre à jour un fournisseur
   */
  async updateSupplier(supplierId: string, updates: UpdateSupplierRequest) {
    return await apiService.put<Supplier>(`/tiers/fournisseurs/${supplierId}`, updates);
  }

  /**
   * Supprimer un fournisseur
   */
  async deleteSupplier(supplierId: string) {
    return await apiService.delete<void>(`/tiers/fournisseurs/${supplierId}`);
  }

  /**
   * Récupérer les clients d'une station
   */
  async getStationCustomers(stationId: string) {
    return await apiService.get<Customer[]>(`/tiers/stations/${stationId}/clients`);
  }

  /**
   * Récupérer un client spécifique
   */
  async getCustomerById(customerId: string) {
    return await apiService.get<Customer>(`/tiers/clients/${customerId}`);
  }

  /**
   * Créer un nouveau client
   */
  async createCustomer(customer: CreateCustomerRequest) {
    return await apiService.post<Customer>(`/tiers/clients`, customer);
  }

  /**
   * Créer un nouveau client et l'associer à une station
   */
  async createCustomerForStation(stationId: string, customer: CreateCustomerRequest) {
    const createdCustomer = await this.createCustomer(customer);
    // Associer le client nouvellement créé à la station
    await this.associateTiersToStation(createdCustomer.id, stationId);
    return createdCustomer;
  }

  /**
   * Mettre à jour un client
   */
  async updateCustomer(customerId: string, updates: UpdateCustomerRequest) {
    return await apiService.put<Customer>(`/tiers/clients/${customerId}`, updates);
  }

  /**
   * Supprimer un client
   */
  async deleteCustomer(customerId: string) {
    return await apiService.delete<void>(`/tiers/clients/${customerId}`);
  }

  /**
   * Récupérer tous les fournisseurs de la compagnie
   */
  async getAllSuppliers() {
    return await apiService.get<Supplier[]>(`/tiers/fournisseurs`);
  }

  /**
   * Récupérer tous les clients de la compagnie
   */
  async getAllCustomers() {
    return await apiService.get<Customer[]>(`/tiers/clients`);
  }

  /**
   * Associer un tiers (client, fournisseur ou employé) à une station
   */
  async associateTiersToStation(tiersId: string, stationId: string) {
    return await apiService.post(`/tiers/tiers/${tiersId}/associer-station/${stationId}`);
  }

  /**
   * Dissocier un tiers (client, fournisseur ou employé) d'une station
   */
  async dissociateTiersFromStation(tiersId: string, stationId: string) {
    return await apiService.post(`/tiers/tiers/${tiersId}/dissocier-station/${stationId}`);
  }
}

// Fonctions utilitaires pour gérer les champs virtuels
export function extractSupplierType(supplier: Supplier): SupplierWithVirtualFields {
  const type = supplier.metadonnees?.type as 'carburants' | 'huiles' | 'equipements' | 'other' || 'other';
  const contact_person = supplier.donnees_personnelles?.contact_person as string || 'Contact par défaut';
  return {
    ...supplier,
    type,
    contact_person
  };
}

export function integrateSupplierType(supplier: SupplierWithVirtualFields): Supplier {
  const { type, contact_person, ...rest } = supplier;
  const metadonnees = {
    ...supplier.metadonnees,
    type
  };
  const donnees_personnelles = {
    ...supplier.donnees_personnelles,
    contact_person
  };
  return {
    ...rest,
    metadonnees,
    donnees_personnelles
  };
}

export function extractCustomerCategory(customer: Customer): CustomerWithVirtualFields {
  const categorie = customer.metadonnees?.categorie as 'particulier' | 'entreprise' | 'fleet' | 'gouvernement' || 'particulier';
  const contact_person = customer.donnees_personnelles?.contact_person as string || 'Contact par défaut';
  return {
    ...customer,
    categorie,
    contact_person
  };
}

export function integrateCustomerCategory(customer: CustomerWithVirtualFields): Customer {
  const { categorie, contact_person, ...rest } = customer;
  const metadonnees = {
    ...customer.metadonnees,
    categorie
  };
  const donnees_personnelles = {
    ...customer.donnees_personnelles,
    contact_person
  };
  return {
    ...rest,
    metadonnees,
    donnees_personnelles
  };
}

// Exporter une instance du service
export const partnerService = new PartnerService();