import { apiService } from './ApiService';
import type { PlanComptable } from './PlanComptableService';

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
  compte_comptable_id?: string | null;  // ID du compte comptable associé
  // Champs virtuels extraits de metadonnees
  type?: string;
  // Champs virtuels extraits de donnees_personnelles
  contact_person?: string;
}

// Interface pour le fournisseur avec les champs virtuels accessibles
export interface SupplierWithVirtualFields extends Supplier {
  type: string;
  compte_comptable_libelle?: string;  // Libellé du compte comptable associé
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
  // Champs virtuels extraits de metadonnees (non inclus dans la structure de base)
  // categorie?: 'particulier' | 'entreprise' | 'fleet' | 'gouvernement'; // Remplacé par metadonnees.type
  // Champs virtuels extraits de donnees_personnelles
  contact_person?: string;
}

// Interface pour le client avec les champs virtuels accessibles
export interface CustomerWithVirtualFields extends Customer {
  categorie: string;  // Contient l'UUID du compte comptable (type) ou une catégorie traditionnelle
}


export interface CreateSupplierRequest {
  nom: string;
  code: string;
  contact_person: string;
  email: string;
  telephone: string;
  adresse: string;
  type: string;  // Le type est maintenant le libellé du compte comptable
  compte_comptable_id?: string | null;  // ID du compte comptable associé
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
  type?: string;  // Le type est maintenant le libellé du compte comptable
  compte_comptable_id?: string | null;  // ID du compte comptable associé
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
  categorie: 'client'; // Toujours 'client' pour les clients
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: {
    type?: string;      // UUID du compte comptable
  };
}

export interface UpdateCustomerRequest {
  nom?: string;
  code?: string;
  contact_person?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  categorie?: 'client'; // Toujours 'client' pour les clients
  donnees_personnelles?: Record<string, any> | null;
  metadonnees?: {
    type?: string;      // UUID du compte comptable
  };
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
  // Le type est directement ce qui est stocké dans le champ type
  const type = supplier.type as string || 'Fournisseur';

  const contact_person = supplier.donnees_personnelles?.contact_person as string || 'Contact par défaut';
  return {
    ...supplier,
    type,
    contact_person,
    // compte_comptable_libelle sera ajouté dans le composant Svelte
  };
}

// Fonction utilitaire pour valider si une chaîne est un UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function integrateSupplierType(supplier: SupplierWithVirtualFields): Supplier {
  const { type, contact_person, compte_comptable_libelle, compte_comptable_id, ...rest } = supplier;
  const metadonnees = {
    ...supplier.metadonnees,
    type: type, // On stocke le type tel quel
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
  // Extraire le type du champ principal
  const categorie = customer.metadonnees?.type as string || 'particulier';
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
    type: categorie  // Le champ categorie contient maintenant l'UUID du compte
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