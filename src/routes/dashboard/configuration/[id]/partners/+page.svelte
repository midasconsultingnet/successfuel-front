<script lang="ts">
  import { onMount } from 'svelte';
  import { partnerService, type Supplier, type Customer, type CreateSupplierRequest, type UpdateSupplierRequest, type CreateCustomerRequest, type UpdateCustomerRequest, extractSupplierType, extractCustomerCategory, integrateSupplierType, integrateCustomerCategory, type SupplierWithVirtualFields, type CustomerWithVirtualFields } from '$lib/services/PartnerService';
  import { configurationService } from '$lib/services/ConfigurationService';
  import { planComptableService, type PlanComptable, type PlanComptableCreate, type PlanComptableHierarchy } from '$lib/services/PlanComptableService';
  import { authStore } from '$lib/services/authStore';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';

  // Types étendus pour les partenaires avec le libellé du compte comptable
  type SupplierWithAccountLabel = Supplier & { compte_comptable_libelle?: string };
  type CustomerWithAccountLabel = Customer & { compte_comptable_libelle?: string };
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import * as Tabs from '$lib/components/ui/tabs';
  import { toast } from 'svelte-sonner';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { configurationStore } from '$lib/stores/configurationStore';

  // Récupérer les données de la page
  let stationId = $state<string>('');
  let stationInfo = $state({ name: 'Station Inconnue', code: 'N/A', address: 'Adresse inconnue' });

  // États
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Charger les données depuis les données de layout
  $effect(() => {
    const unsubscribe = page.subscribe((data) => {
      if (data.data?.stationId) {
        const newStationId = data.data.stationId;
        if (stationId !== newStationId) {
          stationId = newStationId;
          // Charger les données quand l'ID de station est disponible
          if (stationId && typeof stationId === 'string' && stationId.trim() !== '') {
            loadData();
          }
        }
      }
      if (data.data?.station) {
        stationInfo = data.data.station;
      }
    });
    return unsubscribe;
  });

  // Données de configuration des partenaires
  let suppliers = $state<SupplierWithAccountLabel[]>([]);
  let customers = $state<CustomerWithAccountLabel[]>([]);
  let allSuppliers = $state<SupplierWithAccountLabel[]>([]);
  let allCustomers = $state<CustomerWithAccountLabel[]>([]);

  // États pour les formulaires fournisseurs
  let showAddSupplierDialog = $state(false);
  let showEditSupplierDialog = $state(false);

  // États du formulaire fournisseur
  let supplierName = $state('');
  let supplierEmail = $state('');
  let supplierPhone = $state('');
  let supplierAddress = $state('');
  let supplierContactPerson = $state('');
  let supplierType = $state('');
  let supplierAccount = $state<string | undefined>(undefined);  // ID du compte comptable sélectionné
  let newAccountName = $state('');  // Nom du nouveau compte à créer
  let createNewAccount = $state(false);  // Indicateur pour créer un nouveau compte
  let selectedSupplierId = $state('');

  // États pour l'édition fournisseur
  let editingSupplier = $state<SupplierWithAccountLabel | null>(null);
  let editingSupplierType = $state('');
  let editingSupplierAccount = $state<string | undefined>(undefined);

  // États pour les formulaires clients
  let showAddCustomerDialog = $state(false);
  let showEditCustomerDialog = $state(false);

  // États du formulaire client
  let customerName = $state('');
  let customerEmail = $state('');
  let customerPhone = $state('');
  let customerAddress = $state('');
  let customerContactPerson = $state('');
  let customerCategory = $state('');
  let selectedCustomerId = $state('');

  // États pour l'édition client
  let editingCustomer = $state<CustomerWithAccountLabel | null>(null);
  let editingCustomerCategory = $state('');

  // États pour le dialogue de validation de la configuration
  let showValidationDialog = $state(false);
  let validationResults = $state<any>(null);

  // États pour les comptes comptables
  let supplierAccounts = $state<PlanComptableHierarchy[]>([]);
  let customerAccounts = $state<PlanComptableHierarchy[]>([]);
  let loadingAccounts = $state(false);


  // Fonction pour enrichir les données du fournisseur avec le libellé du compte comptable
  function enrichSupplierWithAccountLabel(supplier: Supplier): SupplierWithAccountLabel {
    // Le type est l'UUID du compte comptable stocké dans les métadonnées
    // Le champ type au niveau racine sert uniquement à distinguer les entités dans la base de données
    const type = supplier.metadonnees?.type as string || 'Fournisseur';

    // Récupérer le libellé à partir du plan comptable pour l'affichage
    let compte_comptable_libelle = '';
    // Vérifier si le type est un UUID valide (ce qui indiquerait qu'il s'agit d'un ID de compte comptable)
    const isUUID = typeof type === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(type);

    if (isUUID && supplierAccounts.length > 0) {
      const compte = supplierAccounts.find(c => c.id === type);
      if (compte) {
        compte_comptable_libelle = compte.libelle_compte;
      } else {
        // Si le compte n'est pas trouvé dans le plan comptable, on peut utiliser le type comme libellé
        // ou afficher un message indiquant que le compte n'existe plus
        compte_comptable_libelle = `Compte inconnu (${type})`;
      }
    } else if (!isUUID) {
      // Si le type n'est pas un UUID, c'est probablement un ancien format ou une valeur personnalisée
      // On l'affiche directement comme libellé
      compte_comptable_libelle = type;
    }

    const contact_person = supplier.donnees_personnelles?.contact_person as string || 'Contact par défaut';
    return {
      ...supplier,
      type,
      contact_person,
      compte_comptable_libelle
    };
  }

  // Fonction pour enrichir les données du client avec le libellé du compte comptable
  function enrichCustomerWithAccountLabel(customer: Customer): CustomerWithAccountLabel {
    // Récupérer le libellé à partir du plan comptable pour l'affichage
    let compte_comptable_libelle = '';

    // Le type est l'UUID du compte comptable stocké dans les métadonnées
    const type = customer.metadonnees?.type as string || '';

    // Vérifier si le type est un UUID valide (ce qui indiquerait qu'il s'agit d'un ID de compte comptable)
    const isUUID = typeof type === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(type);

    if (isUUID && customerAccounts.length > 0) {
      const compte = customerAccounts.find(c => c.id === type);
      if (compte) {
        compte_comptable_libelle = compte.libelle_compte;
      } else {
        // Si le compte n'est pas trouvé dans le plan comptable, on peut utiliser le type comme libellé
        // ou afficher un message indiquant que le compte n'existe plus
        compte_comptable_libelle = `Compte inconnu (${type})`;
      }
    }

    const contact_person = customer.donnees_personnelles?.contact_person as string || 'Contact par défaut';

    return {
      ...customer,
      contact_person,
      compte_comptable_libelle
    } as any; // Extension temporaire pour inclure le champ d'affichage
  }





  // Effet réactif pour s'assurer que le Select est correctement mis à jour
  $effect(() => {
    // Ce simple effet assure que le Select réagit correctement aux changements
    // de l'état des données
    if (!loadingAccounts && supplierAccounts.length > 0) {
      // Forcer une mise à jour mineure pour s'assurer que le Select est à jour
      const currentEditingAccount = editingSupplierAccount;
      const currentSupplierAccount = supplierAccount;

      // Vérifier que les comptes sélectionnés existent toujours dans la liste
      if (currentEditingAccount && !supplierAccounts.some(acc => acc.id === currentEditingAccount)) {
        editingSupplierAccount = undefined;
      }

      if (currentSupplierAccount && !supplierAccounts.some(acc => acc.id === currentSupplierAccount)) {
        supplierAccount = undefined;
      }
    }
  });



  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données des partenaires pour la station:', stationId);
      console.log('Type de stationId:', typeof stationId);
      loading = true;

      // Vérifier que stationId est une chaîne de caractères valide avant de faire l'appel API
      if (typeof stationId === 'string' && stationId && stationId.trim() !== '') {
        // Charger les comptes comptables pour les fournisseurs en premier
        const { supplierAccs, customerAccs } = await loadSupplierAccounts();

        // Charger les fournisseurs et clients associés à la station
        let fetchedSuppliers = await partnerService.getStationSuppliers(stationId);
        let fetchedCustomers = await partnerService.getStationCustomers(stationId);

        // Extraire les champs virtuels pour les affichages
        suppliers = fetchedSuppliers.map(enrichSupplierWithAccountLabel);
        customers = fetchedCustomers.map(enrichCustomerWithAccountLabel);

        // Charger tous les fournisseurs et clients de la compagnie pour la sélection
        allSuppliers = (await partnerService.getAllSuppliers()).map(enrichSupplierWithAccountLabel);
        allCustomers = (await partnerService.getAllCustomers()).map(enrichCustomerWithAccountLabel);
      } else {
        console.error('ID de station invalide:', stationId, 'type:', typeof stationId);
        suppliers = [];
        customers = [];
        allSuppliers = [];
        allCustomers = [];
        supplierAccounts = [];
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données des partenaires:', err);
      error = 'Impossible de charger les données des partenaires: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      suppliers = [];
      customers = [];
      allSuppliers = [];
      allCustomers = [];
      supplierAccounts = [];
    } finally {
      loading = false;
      console.log('Chargement terminé, loading:', loading);
    }
  }

  // Sauvegarder la configuration
  async function saveConfiguration() {
    validationResults = validateConfiguration();
    showValidationDialog = true;
  }

  // Fonction pour confirmer et sauvegarder la configuration
  async function confirmAndSaveConfiguration() {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Valider à nouveau la configuration avant de sauvegarder
      const validation = validateConfiguration();
      if (!validation.overall.isValid) {
        throw new Error('La configuration ne satisfait pas aux conditions requises');
      }

      // Préparer les données de configuration à sauvegarder
      const configToSave = {
        completion: {
          partners: {
            suppliers: validation.suppliers.isValid,
            customers: validation.customers.isValid,
            overall: validation.overall.isValid
          }
        }
      };

      // Sauvegarder la configuration via le service
      const response = await configurationService.saveStationConfiguration(stationId, configToSave);

      console.log('Configuration des partenaires sauvegardée avec succès pour la station:', stationId);
      console.log(configToSave);

      // Mettre à jour la configuration dans le store global
      configurationStore.updatePart(stationId, 'partners', configToSave.completion.partners);

      // Fermer le dialogue de validation
      showValidationDialog = false;

      // Afficher un message de succès
      toast.success(get(i18nStore).resources?.configuration?.partners_config_saved || 'Configuration des partenaires sauvegardée avec succès');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);
      error = 'Erreur lors de la sauvegarde de la configuration: ' + (err as Error).message;
    }
  }

  // Charger les données au montage
  onMount(() => {
    console.log('Composant partners monté avec stationId:', stationId);
    console.log('Station info:', stationInfo);
  });

  // Charger les comptes comptables pour les fournisseurs
  async function loadSupplierAccounts(): Promise<{supplierAccs: PlanComptable[], customerAccs: PlanComptable[]}> {
    try {
      loadingAccounts = true;

      // Récupérer tous les comptes du plan comptable
      const allAccounts = await planComptableService.getFullPlanHierarchy();

      // Filtrer pour obtenir uniquement les comptes enfants de "Fournisseurs" (401)
      // On suppose que le compte "Fournisseurs" a le numéro 401 ou un libellé correspondant
      const supplierAccs = findSupplierAccounts(allAccounts);

      // Filtrer pour obtenir uniquement les comptes enfants de "Clients" (411)
      // On suppose que le compte "Clients" a le numéro 411 ou un libellé correspondant
      const customerAccs = findCustomerAccounts(allAccounts);

      // Mettre à jour les états
      supplierAccounts = supplierAccs;
      customerAccounts = customerAccs;

      return { supplierAccs, customerAccs };
    } catch (err) {
      console.error('Erreur lors du chargement des comptes comptables pour les fournisseurs et clients:', err);
      error = 'Impossible de charger les comptes comptables: ' + (err as Error).message;
      supplierAccounts = [];
      customerAccounts = [];

      return { supplierAccs: [], customerAccs: [] };
    } finally {
      loadingAccounts = false;
    }
  }

  // Fonction récursive pour trouver les comptes enfants de "Fournisseurs"
  function findSupplierAccounts(accounts: PlanComptableHierarchy[], parentIsSupplier = false): PlanComptableHierarchy[] {
    let result: PlanComptableHierarchy[] = [];

    for (const account of accounts) {
      // Vérifier si c'est un compte "Fournisseurs" ou un de ses enfants
      const isSupplierAccount = parentIsSupplier ||
                               account.numero_compte?.startsWith('401') ||
                               account.libelle_compte.toLowerCase().includes('fournisseur');

      if (isSupplierAccount && account.numero_compte !== '401') { // Exclure le compte parent 401 lui-même
        result.push(account);
      }

      // Explorer récursivement les enfants
      if (account.enfants && account.enfants.length > 0) {
        const childAccounts = findSupplierAccounts(account.enfants, isSupplierAccount);
        result = result.concat(childAccounts);
      }
    }

    return result;
  }


  // Fonction récursive pour trouver les comptes enfants de "Clients"
  function findCustomerAccounts(accounts: PlanComptableHierarchy[], parentIsCustomer = false): PlanComptableHierarchy[] {
    let result: PlanComptableHierarchy[] = [];

    for (const account of accounts) {
      // Vérifier si c'est un compte "Clients" ou un de ses enfants
      const isCustomerAccount = parentIsCustomer ||
                               account.numero_compte?.startsWith('411') ||
                               account.libelle_compte.toLowerCase().includes('client');

      if (isCustomerAccount && account.numero_compte !== '411') { // Exclure le compte parent 411 lui-même
        result.push(account);
      }

      // Explorer récursivement les enfants
      if (account.enfants && account.enfants.length > 0) {
        const childAccounts = findCustomerAccounts(account.enfants, isCustomerAccount);
        result = result.concat(childAccounts);
      }
    }

    return result;
  }

  // Fonctions pour les fournisseurs
  async function addSupplier() {
    try {
      if (!supplierName || !stationId) {
        throw new Error('Le nom et l\'ID de station sont requis');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (createNewAccount && newAccountName) {
        // Trouver le compte parent "Fournisseurs" (401)
        const parentAccount = await findSupplierParentAccount();

        // Créer un nouveau compte comptable pour ce fournisseur
        const newAccount: PlanComptableCreate = {
          libelle_compte: newAccountName
        };

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);
        if (authState.user?.compagnie_id) {
          newAccount.compagnie_id = authState.user.compagnie_id;
        } else {
          throw new Error('ID de la compagnie non disponible');
        }

        if (parentAccount) {
          newAccount.parent_id = parentAccount.id;
        }

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (supplierAccount) {
        compteComptableId = supplierAccount;
        // Récupérer le libellé du compte
        const selectedAccount = supplierAccounts.find(acc => acc.id === supplierAccount);
        // Ne rien faire - on n'utilise plus compteComptableLibelle
      }

      // Créer l'objet du nouveau fournisseur
      const newSupplierData: CreateSupplierRequest = {
        nom: supplierName,
        code: supplierName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4), // Générer un code unique
        contact_person: supplierContactPerson || supplierName,
        email: supplierEmail,
        telephone: supplierPhone,
        adresse: supplierAddress,
        type: 'fournisseur', // Le type racine indique le type d'entité
        donnees_personnelles: {
          contact_person: supplierContactPerson || supplierName
        },  // Données personnelles contenant le contact
        metadonnees: {              // Métadonnées optionnelles
          type: compteComptableId || 'Fournisseur', // Le type dans les métadonnées est l'UUID du compte
          ...(compteComptableId && {
            compte_comptable_id: compteComptableId
          })
        }
      };

      // Créer le fournisseur et l'associer à la station
      const newSupplier = await partnerService.createSupplierForStation(stationId, newSupplierData);

      // Extraire les champs virtuels et ajouter le nouveau fournisseur à la liste locale
      const extractedSupplier = enrichSupplierWithAccountLabel(newSupplier);
      suppliers = [...suppliers, extractedSupplier];

      // Réinitialiser le formulaire
      showAddSupplierDialog = false;
      supplierName = '';
      supplierEmail = '';
      supplierPhone = '';
      supplierAddress = '';
      supplierContactPerson = '';
      supplierType = '';
      supplierAccount = undefined;
      newAccountName = '';
      createNewAccount = false;

      console.log('Fournisseur ajouté avec succès:', newSupplier);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du fournisseur:', err);
      error = 'Impossible d\'ajouter le fournisseur: ' + (err as Error).message;
    }
  }

  // Fonction pour générer un numéro de compte fournisseur
  function generateSupplierAccountNumber(): string {
    // Générer un numéro de compte basé sur la date pour assurer l'unicité
    return `401.${Date.now()}`;
  }

  // Fonction pour trouver le compte parent "Fournisseurs" (401)
  async function findSupplierParentAccount(): Promise<PlanComptable | undefined> {
    try {
      const allAccounts = await planComptableService.getFullPlanHierarchy();
      return findAccountByNumber(allAccounts, '401');
    } catch (err) {
      console.error('Erreur lors de la recherche du compte parent fournisseurs:', err);
      return undefined;
    }
  }

  // Fonction récursive pour trouver un compte par son numéro
  function findAccountByNumber(accounts: PlanComptableHierarchy[], numero: string): PlanComptableHierarchy | undefined {
    for (const account of accounts) {
      if (account.numero_compte === numero) {
        return account;
      }

      if (account.enfants && account.enfants.length > 0) {
        const found = findAccountByNumber(account.enfants, numero);
        if (found) return found;
      }
    }
    return undefined;
  }


  async function updateSupplier() {
    try {
      if (!editingSupplier || !editingSupplier.id) {
        throw new Error('Aucun fournisseur à éditer');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (createNewAccount && newAccountName) {
        // Trouver le compte parent "Fournisseurs" (401)
        const parentAccount = await findSupplierParentAccount();

        // Créer un nouveau compte comptable pour ce fournisseur
        const newAccount: PlanComptableCreate = {
          libelle_compte: newAccountName
        };

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);
        if (authState.user?.compagnie_id) {
          newAccount.compagnie_id = authState.user.compagnie_id;
        } else {
          throw new Error('ID de la compagnie non disponible');
        }

        if (parentAccount) {
          newAccount.parent_id = parentAccount.id;
        }

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (editingSupplierAccount) {
        compteComptableId = editingSupplierAccount;
        // Récupérer le libellé du compte
        const selectedAccount = supplierAccounts.find(acc => acc.id === editingSupplierAccount);
        // Ne rien faire - on n'utilise plus compteComptableLibelle
      }

      // Mettre à jour le fournisseur dans la base de données
      const donnees_personnelles = {
        ...editingSupplier.donnees_personnelles,
        contact_person: editingSupplier.contact_person || 'Contact par défaut'
      };

      const metadonnees = {
        ...editingSupplier.metadonnees,
        type: compteComptableId || 'Fournisseur', // Le type dans les métadonnées est l'UUID du compte
        ...(compteComptableId && {
          compte_comptable_id: compteComptableId
        })
      };

      const updateData: UpdateSupplierRequest = {
        nom: editingSupplier.nom,
        email: editingSupplier.email,
        telephone: editingSupplier.telephone,
        adresse: editingSupplier.adresse,
        type: 'fournisseur', // Le type racine indique le type d'entité
        donnees_personnelles,
        metadonnees
      };

      const updatedSupplier = await partnerService.updateSupplier(editingSupplier.id, updateData);

      // Extraire les champs virtuels et mettre à jour dans la liste
      const extractedUpdatedSupplier = enrichSupplierWithAccountLabel(updatedSupplier);
      suppliers = suppliers.map(sup =>
        sup.id === editingSupplier!.id
          ? extractedUpdatedSupplier
          : sup
      );

      // Fermer la boîte de dialogue
      showEditSupplierDialog = false;
      editingSupplier = null;
      editingSupplierAccount = undefined;
      newAccountName = '';
      createNewAccount = false;

      console.log('Fournisseur mis à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour du fournisseur:', err);
      error = 'Impossible de mettre à jour le fournisseur: ' + (err as Error).message;
    }
  }

  async function addExistingSupplier() {
    try {
      if (!selectedSupplierId || !stationId) {
        throw new Error('Aucun fournisseur sélectionné ou ID de station manquant');
      }

      // Associer le fournisseur existant à la station
      await partnerService.associateTiersToStation(selectedSupplierId, stationId);

      // Charger les données mises à jour
      let fetchedSuppliers = await partnerService.getStationSuppliers(stationId);
      // Extraire les champs virtuels pour l'affichage
      suppliers = fetchedSuppliers.map(enrichSupplierWithAccountLabel);

      // Réinitialiser le formulaire
      selectedSupplierId = '';

      console.log('Fournisseur existant ajouté à la station avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'ajout du fournisseur existant:', err);
      error = 'Impossible d\'ajouter le fournisseur existant: ' + (err as Error).message;
    }
  }

  async function dissociateSupplier(supplierId: string) {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Dissocier le fournisseur de la station
      await partnerService.dissociateTiersFromStation(supplierId, stationId);

      // Recharger les données mises à jour
      let fetchedSuppliers = await partnerService.getStationSuppliers(stationId);
      suppliers = fetchedSuppliers.map(enrichSupplierWithAccountLabel);

      console.log('Fournisseur dissocié de la station avec succès');
    } catch (err) {
      console.error('Erreur lors de la dissociation du fournisseur:', err);
      error = 'Impossible de dissocier le fournisseur: ' + (err as Error).message;
    }
  }

  function prepareEditSupplier(supplier: SupplierWithAccountLabel) {
    editingSupplier = { ...supplier };

    // Le type du fournisseur est directement l'UUID du compte comptable
    // On le définit comme compte à éditer
    const typeIsUUID = typeof supplier.type === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplier.type);

    // Définir le compte à éditer à la valeur du type si c'est un UUID
    editingSupplierAccount = typeIsUUID ? supplier.type as string : undefined;

    // Le type est l'ID du compte comptable
    editingSupplierType = supplier.type || 'Fournisseur';

    // Afficher un message de débogage
    console.log('prepareEditSupplier appelé:', {
      supplierId: supplier.id,
      supplierType: supplier.type,
      editingSupplierAccount,
      supplierAccountsCount: supplierAccounts.length
    });

    showEditSupplierDialog = true;
  }

  // Fonction pour réinitialiser le formulaire de fournisseur
  function resetSupplierForm() {
    supplierName = '';
    supplierEmail = '';
    supplierPhone = '';
    supplierAddress = '';
    supplierContactPerson = '';
    supplierType = 'other'; // Utiliser 'other' comme valeur par défaut
    supplierAccount = undefined;
    newAccountName = '';
    createNewAccount = false;
  }


  // États pour la gestion des comptes clients
  let customerAccount = $state<string | undefined>(undefined);
  let createNewCustomerAccount = $state(false);
  let newCustomerAccountName = $state('');

  // Fonctions pour les clients
  async function addCustomer() {
    try {
      if (!customerName || !stationId) {
        throw new Error('Le nom et l\'ID de station sont requis');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (createNewCustomerAccount) {
        // Vérifier que le nom du nouveau compte n'est pas vide
        if (!newCustomerAccountName || newCustomerAccountName.trim() === '') {
          throw new Error('Le nom du nouveau type de client est requis');
        }

        // Trouver le compte parent "Clients" (411)
        const allAccounts = await planComptableService.getFullPlanHierarchy();
        const parentAccount = findAccountByNumber(allAccounts, '411');

        // Créer un nouveau compte comptable pour ce client
        const newAccount: PlanComptableCreate = {
          libelle_compte: newCustomerAccountName
        };

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);
        if (authState.user?.compagnie_id) {
          newAccount.compagnie_id = authState.user.compagnie_id;
        } else {
          throw new Error('ID de la compagnie non disponible');
        }

        if (parentAccount) {
          newAccount.parent_id = parentAccount.id;
        }

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;

        // Rafraîchir les comptes clients pour inclure le nouveau compte
        await loadSupplierAccounts();
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (customerAccount) {
        compteComptableId = customerAccount;
      }

      // Déterminer le type final - si un compte comptable est sélectionné, utiliser son UUID
      const finalType = compteComptableId || 'particulier';

      // Créer l'objet du nouveau client
      const newCustomerData: CreateCustomerRequest = {
        nom: customerName,
        code: customerName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4), // Générer un code unique
        contact_person: customerContactPerson || customerName,
        email: customerEmail,
        telephone: customerPhone,
        adresse: customerAddress,
        categorie: 'client', // Le type racine indique le type d'entité
        donnees_personnelles: {
          contact_person: customerContactPerson || customerName
        },  // Données personnelles contenant le contact
        metadonnees: {              // Métadonnées optionnelles
          type: finalType // Le type dans les métadonnées est l'UUID du compte
        }
      };

      // Créer le client et l'associer à la station
      const newCustomer = await partnerService.createCustomerForStation(stationId, newCustomerData);

      // Extraire les champs virtuels et ajouter le nouveau client à la liste locale
      const extractedCustomer = extractCustomerCategory(newCustomer);
      customers = [...customers, extractedCustomer];

      // Réinitialiser le formulaire
      showAddCustomerDialog = false;
      customerName = '';
      customerEmail = '';
      customerPhone = '';
      customerAddress = '';
      customerContactPerson = '';
      customerCategory = 'particulier';
      customerAccount = undefined;
      newCustomerAccountName = '';
      createNewCustomerAccount = false;

      console.log('Client ajouté avec succès:', newCustomer);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du client:', err);
      error = 'Impossible d\'ajouter le client: ' + (err as Error).message;
    }
  }

  async function updateCustomer() {
    try {
      if (!editingCustomer || !editingCustomer.id) {
        throw new Error('Aucun client à éditer');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (createNewCustomerAccount) {
        // Vérifier que le nom du nouveau compte n'est pas vide
        if (!newCustomerAccountName || newCustomerAccountName.trim() === '') {
          throw new Error('Le nom du nouveau type de client est requis');
        }

        // Trouver le compte parent "Clients" (411)
        const allAccounts = await planComptableService.getFullPlanHierarchy();
        const parentAccount = findAccountByNumber(allAccounts, '411');

        // Créer un nouveau compte comptable pour ce client
        const newAccount: PlanComptableCreate = {
          libelle_compte: newCustomerAccountName
        };

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);
        if (authState.user?.compagnie_id) {
          newAccount.compagnie_id = authState.user.compagnie_id;
        } else {
          throw new Error('ID de la compagnie non disponible');
        }

        if (parentAccount) {
          newAccount.parent_id = parentAccount.id;
        }

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;

        // Rafraîchir les comptes clients pour inclure le nouveau compte
        await loadSupplierAccounts();
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (customerAccount) {
        compteComptableId = customerAccount;
      }

      // Déterminer le type final - si un compte comptable est sélectionné, utiliser son UUID
      const finalType = compteComptableId || 'particulier';

      // Mettre à jour le client dans la base de données
      const donnees_personnelles = {
        ...editingCustomer.donnees_personnelles,
        contact_person: editingCustomer.contact_person || 'Contact par défaut'
      };

      const metadonnees = {
        ...editingCustomer.metadonnees,
        type: finalType // Le type dans les métadonnées est l'UUID du compte
      };

      const updateData: UpdateCustomerRequest = {
        nom: editingCustomer.nom,
        email: editingCustomer.email,
        telephone: editingCustomer.telephone,
        adresse: editingCustomer.adresse,
        categorie: 'client', // Le type racine indique le type d'entité
        donnees_personnelles,
        metadonnees
      };

      const updatedCustomer = await partnerService.updateCustomer(editingCustomer.id, updateData);

      // Extraire les champs virtuels et mettre à jour dans la liste
      const extractedUpdatedCustomer = enrichCustomerWithAccountLabel(updatedCustomer);
      customers = customers.map(cust =>
        cust.id === editingCustomer!.id
          ? extractedUpdatedCustomer
          : cust
      );

      // Fermer la boîte de dialogue
      showEditCustomerDialog = false;
      editingCustomer = null;
      customerAccount = undefined;
      newCustomerAccountName = '';
      createNewCustomerAccount = false;

      console.log('Client mis à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour du client:', err);
      error = 'Impossible de mettre à jour le client: ' + (err as Error).message;
    }
  }

  async function addExistingCustomer() {
    try {
      if (!selectedCustomerId || !stationId) {
        throw new Error('Aucun client sélectionné ou ID de station manquant');
      }

      // Associer le client existant à la station
      await partnerService.associateTiersToStation(selectedCustomerId, stationId);

      // Charger les données mises à jour
      let fetchedCustomers = await partnerService.getStationCustomers(stationId);
      // Extraire les champs virtuels pour l'affichage
      customers = fetchedCustomers.map(enrichCustomerWithAccountLabel);

      // Réinitialiser le formulaire
      selectedCustomerId = '';

      console.log('Client existant ajouté à la station avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'ajout du client existant:', err);
      error = 'Impossible d\'ajouter le client existant: ' + (err as Error).message;
    }
  }

  async function dissociateCustomer(customerId: string) {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Dissocier le client de la station
      await partnerService.dissociateTiersFromStation(customerId, stationId);

      // Recharger les données mises à jour
      let fetchedCustomers = await partnerService.getStationCustomers(stationId);
      customers = fetchedCustomers.map(enrichCustomerWithAccountLabel);

      console.log('Client dissocié de la station avec succès');
    } catch (err) {
      console.error('Erreur lors de la dissociation du client:', err);
      error = 'Impossible de dissocier le client: ' + (err as Error).message;
    }
  }

  function prepareEditCustomer(customer: CustomerWithAccountLabel) {
    editingCustomer = { ...customer };

    // Charger le compte comptable sélectionné s'il existe
    // Le type dans les métadonnées contient l'UUID du compte comptable
    const typeIsUUID = typeof customer.metadonnees?.type === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customer.metadonnees.type as string);

    // Définir le compte à éditer à la valeur du type si c'est un UUID
    customerAccount = typeIsUUID ? customer.metadonnees?.type as string : undefined;

    // Le type est l'ID du compte comptable
    editingCustomerCategory = customer.metadonnees?.type as string || 'particulier';

    // Afficher un message de débogage
    console.log('prepareEditCustomer appelé:', {
      customerId: customer.id,
      customerType: customer.metadonnees?.type,
      customerAccount,
      customerAccountsCount: customerAccounts.length
    });

    showEditCustomerDialog = true;
  }

  // Fonction de validation globale de la configuration des partenaires
  function validateConfiguration() {
    const validation = {
      suppliers: { isValid: false, message: '', details: [] as string[] },
      customers: { isValid: true, message: '', details: [] as string[] }, // Les clients ne sont pas obligatoires
      overall: { isValid: false, message: '' }
    };

    // Validation des fournisseurs
    if (suppliers.length === 0) {
      validation.suppliers.isValid = false;
      validation.suppliers.message = 'Aucun fournisseur configuré';
      validation.suppliers.details = ['Veuillez ajouter au moins un fournisseur'];
    } else {
      validation.suppliers.isValid = true;
      validation.suppliers.message = `${suppliers.length} fournisseur(s) configuré(s)`;
      validation.suppliers.details = suppliers.map(supplier =>
        `${supplier.nom} (${supplier.compte_comptable_libelle || 'Type non spécifié'})`
      );
    }

    // Validation des clients (non obligatoire)
    if (customers.length === 0) {
      validation.customers.message = 'Aucun client configuré (facultatif)';
    } else {
      validation.customers.message = `${customers.length} client(s) configuré(s)`;
      validation.customers.details = customers.map(customer =>
        `${customer.nom} (${customer.compte_comptable_libelle || 'Compte non spécifié'})`
      );
    }

    // Validation globale
    validation.overall.isValid = validation.suppliers.isValid;

    if (validation.overall.isValid) {
      validation.overall.message = 'Configuration complète';
    } else {
      validation.overall.message = 'Configuration incomplète: fournisseurs requis';
    }

    return validation;
  }
</script>

<div class="space-y-6">
  <!-- Carte d'identification de la station -->
  {#if stationInfo}
    <Card class="border-primary/30 bg-primary/5">
      <CardHeader class="flex flex-row items-center justify-between space-x-4">
        <div class="flex flex-row items-center space-x-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
            👥
          </div>
          <div>
            <CardTitle class="text-lg">
              {get(i18nStore).resources?.configuration?.current_station
                ? get(i18nStore).resources?.configuration?.current_station.replace('{stationName}', stationInfo.name || 'Station Inconnue')
                : `Station: ${stationInfo.name || 'Station Inconnue'}`}
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              <Translate key="code" module="common" fallback="Code" />: {stationInfo.code || 'N/A'} | {stationInfo.address || 'Adresse inconnue'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onclick={() => goto(`/dashboard/configuration/${stationId}`)}
          class="flex flex-row items-center space-x-2"
        >
          ←
          <Translate key="back_to_general_config" module="configuration" fallback="Retour config générale" />
        </Button>
      </CardHeader>
    </Card>
  {/if}

  <div>
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="partner_setup" module="configuration" fallback="Configuration des Partenaires" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="suppliers_customers_setup"
        module="configuration"
        fallback="Gérez les fournisseurs et les clients pour votre station"
      />
    </p>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <Spinner class="w-8 h-8" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      {error}
    </div>
  {:else}
    <Card>
      <CardHeader>
        <div class="flex justify-between items-center">
          <div>
            <CardTitle>
              <Translate key="suppliers_customers_setup" module="configuration" fallback="Fournisseurs et clients" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="suppliers_customers_setup"
                module="configuration"
                fallback="Gérez les partenaires de votre station"
              />
            </CardDescription>
          </div>
          <Button onclick={() => saveConfiguration()}>
            <Translate key="save_configuration" module="configuration" fallback="Sauvegarder" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs.Root value="suppliers" class="w-full">
          <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="suppliers">
              <Translate key="supplier" module="configuration" fallback="Fournisseurs" />
            </Tabs.Trigger>
            <Tabs.Trigger value="customers">
              <Translate key="customer" module="configuration" fallback="Clients" />
            </Tabs.Trigger>
          </Tabs.List>

          <!-- Section des fournisseurs -->
          <Tabs.Content value="suppliers" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="suppliers" module="configuration" fallback="Fournisseurs" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_suppliers"
                        module="configuration"
                        fallback="Gérez les fournisseurs de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddSupplierDialog}>
                    <DialogTrigger>
                      <Button class="w-full">
                        <Translate key="add_supplier" module="configuration" fallback="Ajouter un fournisseur" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_supplier" module="configuration" fallback="Ajouter un fournisseur" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_supplier_description"
                            module="configuration"
                            fallback="Entrez les informations du nouveau fournisseur"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-6 py-4">
                        <!-- Option pour créer un nouveau fournisseur -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="create_new_supplier" module="configuration" fallback="Créer un nouveau fournisseur" />
                          </h3>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="space-y-2 sm:col-span-2">
                              <Label for="supplierName">
                                <Translate key="name" module="common" fallback="Nom" />
                              </Label>
                              <Input
                                id="supplierName"
                                bind:value={supplierName}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.supplier_name || 'Nom du fournisseur'}
                              />
                            </div>

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="supplierEmail">
                                <Translate key="email" module="common" fallback="Email" />
                              </Label>
                              <Input
                                id="supplierEmail"
                                type="email"
                                bind:value={supplierEmail}
                                autocomplete="one-time-code"
                                placeholder="email@fournisseur.com"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="supplierPhone">
                                <Translate key="phone" module="common" fallback="Téléphone" />
                              </Label>
                              <Input
                                id="supplierPhone"
                                bind:value={supplierPhone}
                                autocomplete="one-time-code"
                                placeholder="+221 77 123 45 67"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="supplierAddress">
                                <Translate key="address" module="common" fallback="Adresse" />
                              </Label>
                              <Input
                                id="supplierAddress"
                                bind:value={supplierAddress}
                                autocomplete="one-time-code"
                                placeholder="Adresse du fournisseur"
                              />
                            </div>

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="supplierContactPerson">
                                <Translate key="contact_person" module="configuration" fallback="Personne de contact" />
                              </Label>
                              <Input
                                id="supplierContactPerson"
                                bind:value={supplierContactPerson}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.contact_person || 'Nom du contact'}
                              />
                            </div>

                            <!-- Champ pour le compte comptable (qui servira aussi de type) -->
                            <div class="space-y-2 sm:col-span-2">
                              <Label for="supplierAccount">
                                <Translate key="supplier_type" module="configuration" fallback="Type de fournisseur" /> *
                              </Label>

                              {#if loadingAccounts}
                                <div class="flex items-center space-x-2">
                                  <Spinner class="w-4 h-4" />
                                  <span>
                                    <Translate key="loading_accounts" module="configuration" fallback="Chargement des comptes..." />
                                  </span>
                                </div>
                              {:else}
                                <div class="space-y-2">
                                  <Select.Root bind:value={supplierAccount} type="single">
                                    <Select.Trigger class="w-full">
                                      <span data-slot="select-value">
                                        {#if supplierAccount}
                                          {@const selectedAccount = supplierAccounts.find(acc => acc.id === supplierAccount)}
                                          {#if selectedAccount}
                                            {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                                          {:else}
                                            {get(i18nStore).resources?.configuration?.select_supplier_type || 'Sélectionnez le type de fournisseur'}
                                          {/if}
                                        {:else}
                                          {get(i18nStore).resources?.configuration?.select_supplier_type || 'Sélectionnez le type de fournisseur'}
                                        {/if}
                                      </span>
                                    </Select.Trigger>
                                    <Select.Content>
                                      <Select.Group>
                                        <Select.Label>
                                          <Translate key="supplier_types" module="configuration" fallback="Types de fournisseurs" />
                                        </Select.Label>
                                        {#each supplierAccounts as account (account.id)}
                                          <Select.Item value={account.id}>
                                            {account.libelle_compte} ({account.numero_compte})
                                          </Select.Item>
                                        {/each}
                                      </Select.Group>
                                    </Select.Content>
                                  </Select.Root>

                                  <div class="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id="createNewAccount"
                                      bind:checked={createNewAccount}
                                      class="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label for="createNewAccount" class="text-sm">
                                      <Translate key="create_new_supplier_type" module="configuration" fallback="Créer un nouveau type de fournisseur" />
                                    </Label>
                                  </div>
                                </div>
                              {/if}

                              {#if createNewAccount}
                                <div class="space-y-2 mt-2">
                                  <Label for="newAccountName">
                                    <Translate key="new_supplier_type_name" module="configuration" fallback="Nom du nouveau type de fournisseur" /> *
                                  </Label>
                                  <Input
                                    id="newAccountName"
                                    bind:value={newAccountName}
                                    placeholder={get(i18nStore).resources?.configuration?.enter_supplier_type_name || 'Entrez le nom du nouveau type de fournisseur'}
                                  />
                                </div>
                              {/if}
                            </div>
                          </div>

                          <Button
                            onclick={addSupplier}
                            disabled={!supplierName || (!supplierAccount && !createNewAccount) || (createNewAccount && !newAccountName)}
                            class="w-full"
                          >
                            <Translate key="add_new_supplier" module="configuration" fallback="Ajouter nouveau fournisseur" />
                          </Button>
                        </div>

                        <!-- Ligne de séparation -->
                        <div class="relative pt-4">
                          <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                          </div>
                          <div class="relative flex justify-center text-xs uppercase">
                            <span class="bg-background px-2 text-muted-foreground">
                              <Translate key="or" module="common" fallback="ou" />
                            </span>
                          </div>
                        </div>

                        <!-- Option pour ajouter un fournisseur existant -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="add_existing_supplier" module="configuration" fallback="Ajouter un fournisseur existant" />
                          </h3>

                          <div class="space-y-2">
                            <Select.Root
                              type="single"
                              bind:value={selectedSupplierId}
                            >
                              <Select.Trigger class="w-full">
                                <span data-slot="select-value">
                                  {selectedSupplierId
                                    ? allSuppliers.find(s => s.id === selectedSupplierId)?.nom
                                    : get(i18nStore).resources?.configuration?.select_supplier || 'Sélectionner un fournisseur'}
                                </span>
                              </Select.Trigger>
                              <Select.Content>
                                {#each allSuppliers.filter(s => !suppliers.some(sup => sup.id === s.id)) as supplier}
                                  <Select.Item value={supplier.id}>
                                    {supplier.nom} ({supplier.compte_comptable_libelle || get(i18nStore).resources?.configuration?.no_type || 'Type non spécifié'})
                                  </Select.Item>
                                {/each}
                              </Select.Content>
                            </Select.Root>
                            <Button
                              onclick={addExistingSupplier}
                              disabled={!selectedSupplierId}
                              class="w-full"
                            >
                              <Translate key="add_supplier_to_station" module="configuration" fallback="Ajouter à la station" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddSupplierDialog = false;
                            resetSupplierForm();
                            selectedSupplierId = '';
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  {#if suppliers.length === 0}
                    <div class="text-center py-8 text-muted-foreground">
                      <Translate
                        key="no_suppliers"
                        module="configuration"
                        fallback="Aucun fournisseur trouvé"
                      />
                    </div>
                  {:else}
                    {#each suppliers as supplier (supplier.id)}
                      <Card class="p-4">
                        <div class="grid grid-cols-4 gap-4 items-center">
                          <div>
                            <Label>
                              <Translate key="name" module="common" fallback="Nom" />
                            </Label>
                            <p class="font-medium">{supplier.nom}</p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="contact" module="configuration" fallback="Contact" />
                            </Label>
                            <p class="font-medium">
                              {supplier.telephone || (get(i18nStore).resources?.common?.not_provided || 'Non fourni')}<br>
                              {supplier.contact_person || (get(i18nStore).resources?.common?.not_provided || 'Non fourni')}
                            </p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="type" module="configuration" fallback="Type" />
                            </Label>
                            <p class="font-medium">{supplier.compte_comptable_libelle || get(i18nStore).resources?.configuration?.no_type || 'Type non spécifié'}</p>
                          </div>
                          <div class="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onclick={() => prepareEditSupplier(supplier)}
                            >
                              <Translate key="edit" module="common" fallback="Éditer" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              class="text-destructive border-destructive"
                              onclick={() => dissociateSupplier(supplier.id)}
                            >
                              <Translate key="dissociate" module="common" fallback="Dissocier" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    {/each}
                  {/if}
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>

          <!-- Section des clients -->
          <Tabs.Content value="customers" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="customers" module="configuration" fallback="Clients" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_customers"
                        module="configuration"
                        fallback="Gérez les clients de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddCustomerDialog}>
                    <DialogTrigger>
                      <Button class="w-full">
                        <Translate key="add_customer" module="configuration" fallback="Ajouter un client" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_customer" module="configuration" fallback="Ajouter un client" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_customer_description"
                            module="configuration"
                            fallback="Entrez les informations du nouveau client"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-6 py-4">
                        <!-- Option pour créer un nouveau client -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="create_new_customer" module="configuration" fallback="Créer un nouveau client" />
                          </h3>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="space-y-2 sm:col-span-2">
                              <Label for="customerName">
                                <Translate key="name" module="common" fallback="Nom" />
                              </Label>
                              <Input
                                id="customerName"
                                bind:value={customerName}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.customer_name || 'Nom du client'}
                              />
                            </div>

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="customerEmail">
                                <Translate key="email" module="common" fallback="Email" />
                              </Label>
                              <Input
                                id="customerEmail"
                                type="email"
                                bind:value={customerEmail}
                                autocomplete="one-time-code"
                                placeholder="email@client.com"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="customerPhone">
                                <Translate key="phone" module="common" fallback="Téléphone" />
                              </Label>
                              <Input
                                id="customerPhone"
                                bind:value={customerPhone}
                                autocomplete="one-time-code"
                                placeholder="+221 77 123 45 67"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="customerAddress">
                                <Translate key="address" module="common" fallback="Adresse" />
                              </Label>
                              <Input
                                id="customerAddress"
                                bind:value={customerAddress}
                                autocomplete="one-time-code"
                                placeholder="Adresse du client"
                              />
                            </div>

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="customerContactPerson">
                                <Translate key="contact_person" module="configuration" fallback="Personne de contact" />
                              </Label>
                              <Input
                                id="customerContactPerson"
                                bind:value={customerContactPerson}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.contact_person || 'Nom du contact'}
                              />
                            </div>

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="customerAccount">
                                <Translate key="customer_account" module="configuration" fallback="Compte client" />
                              </Label>
                              <Select.Root bind:value={customerAccount} type="single">
                                <Select.Trigger class="w-full">
                                  <span data-slot="select-value">
                                    {#if customerAccount}
                                      {@const selectedAccount = customerAccounts.find(acc => acc.id === customerAccount)}
                                      {#if selectedAccount}
                                        {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                                      {:else}
                                        {get(i18nStore).resources?.configuration?.select_customer_type || 'Sélectionnez le type de client'}
                                      {/if}
                                    {:else}
                                      {get(i18nStore).resources?.configuration?.select_customer_type || 'Sélectionnez le type de client'}
                                    {/if}
                                  </span>
                                </Select.Trigger>
                                <Select.Content>
                                  <Select.Group>
                                    <Select.Label>
                                      <Translate key="customer_types" module="configuration" fallback="Types de clients" />
                                    </Select.Label>
                                    {#each customerAccounts as account (account.id)}
                                      <Select.Item value={account.id}>
                                        {account.libelle_compte} ({account.numero_compte})
                                      </Select.Item>
                                    {/each}
                                  </Select.Group>
                                </Select.Content>
                              </Select.Root>
                            </div>

                            <!-- Case à cocher pour créer un nouveau type de client -->
                            <div class="flex items-center space-x-2 sm:col-span-2">
                              <input
                                id="createNewCustomerAccount"
                                type="checkbox"
                                bind:checked={createNewCustomerAccount}
                                class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                              />
                              <Label for="createNewCustomerAccount" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                <Translate key="create_new_customer_type" module="configuration" fallback="Créer un nouveau type de client" />
                              </Label>
                            </div>

                            <!-- Champ pour le nom du nouveau type de client -->
                            {#if createNewCustomerAccount}
                              <div class="space-y-2 sm:col-span-2">
                                <Label for="newCustomerAccountName">
                                  <Translate key="new_customer_type_name" module="configuration" fallback="Nom du nouveau type de client" />
                                </Label>
                                <Input
                                  id="newCustomerAccountName"
                                  bind:value={newCustomerAccountName}
                                  autocomplete="one-time-code"
                                  placeholder={get(i18nStore).resources?.configuration?.customer_type_name || 'Nom du nouveau type de client'}
                                />
                              </div>
                            {/if}
                          </div>

                          <Button
                            onclick={addCustomer}
                            disabled={!customerName || (!customerAccount && !createNewCustomerAccount) || (createNewCustomerAccount && !newCustomerAccountName)}
                            class="w-full"
                          >
                            <Translate key="add_new_customer" module="configuration" fallback="Ajouter nouveau client" />
                          </Button>
                        </div>

                        <!-- Ligne de séparation -->
                        <div class="relative pt-4">
                          <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                          </div>
                          <div class="relative flex justify-center text-xs uppercase">
                            <span class="bg-background px-2 text-muted-foreground">
                              <Translate key="or" module="common" fallback="ou" />
                            </span>
                          </div>
                        </div>

                        <!-- Option pour ajouter un client existant -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="add_existing_customer" module="configuration" fallback="Ajouter un client existant" />
                          </h3>

                          <div class="space-y-2">
                            <Select.Root
                              type="single"
                              bind:value={selectedCustomerId}
                            >
                              <Select.Trigger class="w-full">
                                <span data-slot="select-value">
                                  {selectedCustomerId
                                    ? allCustomers.find(c => c.id === selectedCustomerId)?.nom
                                    : get(i18nStore).resources?.configuration?.select_customer || 'Sélectionner un client'}
                                </span>
                              </Select.Trigger>
                              <Select.Content>
                                {#each allCustomers.filter(c => !customers.some(cust => cust.id === c.id)) as customer}
                                  <Select.Item value={customer.id}>
                                    {customer.nom} ({customer.compte_comptable_libelle || get(i18nStore).resources?.configuration?.no_account || 'Compte non spécifié'})
                                  </Select.Item>
                                {/each}
                              </Select.Content>
                            </Select.Root>
                            <Button
                              onclick={addExistingCustomer}
                              disabled={!selectedCustomerId}
                              class="w-full"
                            >
                              <Translate key="add_customer_to_station" module="configuration" fallback="Ajouter à la station" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddCustomerDialog = false;
                            customerName = '';
                            customerEmail = '';
                            customerPhone = '';
                            customerAddress = '';
                            customerContactPerson = '';
                            customerCategory = 'particulier';
                            customerAccount = undefined;
                            newCustomerAccountName = '';
                            createNewCustomerAccount = false;
                            selectedCustomerId = '';
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  {#if customers.length === 0}
                    <div class="text-center py-8 text-muted-foreground">
                      <Translate
                        key="no_customers"
                        module="configuration"
                        fallback="Aucun client trouvé"
                      />
                    </div>
                  {:else}
                    {#each customers as customer (customer.id)}
                      <Card class="p-4">
                        <div class="grid grid-cols-4 gap-4 items-center">
                          <div>
                            <Label>
                              <Translate key="name" module="common" fallback="Nom" />
                            </Label>
                            <p class="font-medium">{customer.nom}</p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="contact" module="configuration" fallback="Contact" />
                            </Label>
                            <p class="font-medium">
                              {customer.telephone || (get(i18nStore).resources?.common?.not_provided || 'Non fourni')}<br>
                              {customer.contact_person || (get(i18nStore).resources?.common?.not_provided || 'Non fourni')}
                            </p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="category" module="configuration" fallback="Catégorie" />
                            </Label>
                            <p class="font-medium">{customer.compte_comptable_libelle || get(i18nStore).resources?.configuration?.no_account || 'Compte non spécifié'}</p>
                          </div>
                          <div class="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onclick={() => prepareEditCustomer(customer)}
                            >
                              <Translate key="edit" module="common" fallback="Éditer" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              class="text-destructive border-destructive"
                              onclick={() => dissociateCustomer(customer.id)}
                            >
                              <Translate key="dissociate" module="common" fallback="Dissocier" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    {/each}
                  {/if}
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </CardContent>
    </Card>

    <!-- Dialogue d'édition de fournisseur -->
    {#if editingSupplier}
      <Dialog bind:open={showEditSupplierDialog}>
        <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_supplier" module="configuration" fallback="Éditer le fournisseur" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_supplier_description"
                module="configuration"
                fallback="Modifiez les informations du fournisseur"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2 sm:col-span-2">
                <Label for="editSupplierName">
                  <Translate key="name" module="common" fallback="Nom" />
                </Label>
                <Input
                  id="editSupplierName"
                  bind:value={editingSupplier.nom}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.supplier_name || 'Nom du fournisseur'}
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editSupplierEmail">
                  <Translate key="email" module="common" fallback="Email" />
                </Label>
                <Input
                  id="editSupplierEmail"
                  type="email"
                  bind:value={editingSupplier.email}
                  autocomplete="one-time-code"
                  placeholder="email@fournisseur.com"
                />
              </div>

              <div class="space-y-2">
                <Label for="editSupplierPhone">
                  <Translate key="phone" module="common" fallback="Téléphone" />
                </Label>
                <Input
                  id="editSupplierPhone"
                  bind:value={editingSupplier.telephone}
                  autocomplete="one-time-code"
                  placeholder="+221 77 123 45 67"
                />
              </div>

              <div class="space-y-2">
                <Label for="editSupplierAddress">
                  <Translate key="address" module="common" fallback="Adresse" />
                </Label>
                <Input
                  id="editSupplierAddress"
                  bind:value={editingSupplier.adresse}
                  autocomplete="one-time-code"
                  placeholder="Adresse du fournisseur"
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editSupplierContactPerson">
                  <Translate key="contact_person" module="configuration" fallback="Personne de contact" />
                </Label>
                <Input
                  id="editSupplierContactPerson"
                  bind:value={editingSupplier.contact_person}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.contact_person || 'Nom du contact'}
                />
              </div>

              <!-- Champ pour le compte comptable (qui servira aussi de type) -->
              <div class="space-y-2 sm:col-span-2">
                <Label for="editSupplierAccount">
                  <Translate key="supplier_type" module="configuration" fallback="Type de fournisseur" />
                </Label>

                {#if loadingAccounts}
                  <div class="flex items-center space-x-2">
                    <Spinner class="w-4 h-4" />
                    <span>
                      <Translate key="loading_accounts" module="configuration" fallback="Chargement des comptes..." />
                    </span>
                  </div>
                {:else}
                  <div class="space-y-2">
                    <Select.Root bind:value={editingSupplierAccount} type="single">
                      <Select.Trigger class="w-full">
                        <span data-slot="select-value">
                          {#if editingSupplierAccount}
                            {@const selectedAccount = supplierAccounts.find(acc => acc.id === editingSupplierAccount)}
                            {#if selectedAccount}
                              {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                            {:else}
                              {get(i18nStore).resources?.configuration?.select_supplier_type || 'Sélectionnez le type de fournisseur'}
                            {/if}
                          {:else}
                            {get(i18nStore).resources?.configuration?.select_supplier_type || 'Sélectionnez le type de fournisseur'}
                          {/if}
                        </span>
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>
                            <Translate key="supplier_types" module="configuration" fallback="Types de fournisseurs" />
                          </Select.Label>
                          {#each supplierAccounts as account (account.id)}
                            <Select.Item value={account.id}>
                              {account.libelle_compte} ({account.numero_compte})
                            </Select.Item>
                          {/each}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>

                    <div class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="editCreateNewAccount"
                        bind:checked={createNewAccount}
                        class="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label for="editCreateNewAccount" class="text-sm">
                        <Translate key="create_new_supplier_type" module="configuration" fallback="Créer un nouveau type de fournisseur" />
                      </Label>
                    </div>
                  </div>
                {/if}

                {#if createNewAccount}
                  <div class="space-y-2 mt-2">
                    <Label for="editNewAccountName">
                      <Translate key="new_supplier_type_name" module="configuration" fallback="Nom du nouveau type de fournisseur" /> *
                    </Label>
                    <Input
                      id="editNewAccountName"
                      bind:value={newAccountName}
                      placeholder={get(i18nStore).resources?.configuration?.enter_supplier_type_name || 'Entrez le nom du nouveau type de fournisseur'}
                    />
                  </div>
                {/if}

              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onclick={() => {
                showEditSupplierDialog = false;
                editingSupplier = null;
                editingSupplierAccount = undefined;
                newAccountName = '';
                createNewAccount = false;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updateSupplier}
              disabled={!editingSupplier?.nom || (!editingSupplierAccount && !createNewAccount) || (createNewAccount && !newAccountName)}
            >
              <Translate key="save" module="common" fallback="Sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}

    <!-- Dialogue d'édition de client -->
    {#if editingCustomer}
      <Dialog bind:open={showEditCustomerDialog}>
        <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_customer" module="configuration" fallback="Éditer le client" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_customer_description"
                module="configuration"
                fallback="Modifiez les informations du client"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2 sm:col-span-2">
                <Label for="editCustomerName">
                  <Translate key="name" module="common" fallback="Nom" />
                </Label>
                <Input
                  id="editCustomerName"
                  bind:value={editingCustomer.nom}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.customer_name || 'Nom du client'}
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editCustomerEmail">
                  <Translate key="email" module="common" fallback="Email" />
                </Label>
                <Input
                  id="editCustomerEmail"
                  type="email"
                  bind:value={editingCustomer.email}
                  autocomplete="one-time-code"
                  placeholder="email@client.com"
                />
              </div>

              <div class="space-y-2">
                <Label for="editCustomerPhone">
                  <Translate key="phone" module="common" fallback="Téléphone" />
                </Label>
                <Input
                  id="editCustomerPhone"
                  bind:value={editingCustomer.telephone}
                  autocomplete="one-time-code"
                  placeholder="+221 77 123 45 67"
                />
              </div>

              <div class="space-y-2">
                <Label for="editCustomerAddress">
                  <Translate key="address" module="common" fallback="Adresse" />
                </Label>
                <Input
                  id="editCustomerAddress"
                  bind:value={editingCustomer.adresse}
                  autocomplete="one-time-code"
                  placeholder="Adresse du client"
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editCustomerContactPerson">
                  <Translate key="contact_person" module="configuration" fallback="Personne de contact" />
                </Label>
                <Input
                  id="editCustomerContactPerson"
                  bind:value={editingCustomer.contact_person}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.contact_person || 'Nom du contact'}
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editCustomerAccount">
                  <Translate key="customer_account" module="configuration" fallback="Compte client" />
                </Label>
                <Select.Root bind:value={customerAccount} type="single">
                  <Select.Trigger class="w-full">
                    <span data-slot="select-value">
                      {#if customerAccount}
                        {@const selectedAccount = customerAccounts.find(acc => acc.id === customerAccount)}
                        {#if selectedAccount}
                          {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                        {:else}
                          {get(i18nStore).resources?.configuration?.select_customer_type || 'Sélectionnez le type de client'}
                        {/if}
                      {:else}
                        {get(i18nStore).resources?.configuration?.select_customer_type || 'Sélectionnez le type de client'}
                      {/if}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>
                        <Translate key="customer_types" module="configuration" fallback="Types de clients" />
                      </Select.Label>
                      {#each customerAccounts as account (account.id)}
                        <Select.Item value={account.id}>
                          {account.libelle_compte} ({account.numero_compte})
                        </Select.Item>
                      {/each}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Case à cocher pour créer un nouveau type de client -->
              <div class="flex items-center space-x-2 sm:col-span-2">
                <input
                  id="editCreateNewCustomerAccount"
                  type="checkbox"
                  bind:checked={createNewCustomerAccount}
                  class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <Label for="editCreateNewCustomerAccount" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <Translate key="create_new_customer_type" module="configuration" fallback="Créer un nouveau type de client" />
                </Label>
              </div>

              <!-- Champ pour le nom du nouveau type de client -->
              {#if createNewCustomerAccount}
                <div class="space-y-2 sm:col-span-2">
                  <Label for="editNewCustomerAccountName">
                    <Translate key="new_customer_type_name" module="configuration" fallback="Nom du nouveau type de client" />
                  </Label>
                  <Input
                    id="editNewCustomerAccountName"
                    bind:value={newCustomerAccountName}
                    autocomplete="one-time-code"
                    placeholder={get(i18nStore).resources?.configuration?.customer_type_name || 'Nom du nouveau type de client'}
                  />
                </div>
              {/if}
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onclick={() => {
                showEditCustomerDialog = false;
                editingCustomer = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updateCustomer}
              disabled={!editingCustomer?.nom || (!customerAccount && !createNewCustomerAccount) || (createNewCustomerAccount && !newCustomerAccountName)}
            >
              <Translate key="save" module="common" fallback="Sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}

    <!-- Dialogue de validation de la configuration -->
    {#if showValidationDialog && validationResults}
      <Dialog bind:open={showValidationDialog}>
        <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Translate key="configuration_validation" module="configuration" fallback="Validation de la configuration" />
            </DialogTitle>
            <DialogDescription>
              {validationResults.overall.isValid
                ? (get(i18nStore).resources?.configuration?.configuration_valid || 'Configuration complète et valide')
                : (get(i18nStore).resources?.configuration?.configuration_incomplete || 'Configuration incomplète')}
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-4 py-4">
            <!-- Section des fournisseurs -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="suppliers" module="configuration" fallback="Fournisseurs" />
                </h3>
                <Badge variant={validationResults.suppliers.isValid ? "default" : "destructive"}>
                  {validationResults.suppliers.isValid ? 'OK' : 'KO'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.suppliers.message}</p>
              {#if validationResults.suppliers.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.suppliers.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Section des clients -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="customers" module="configuration" fallback="Clients" />
                </h3>
                <Badge variant="secondary">
                  OK
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.customers.message}</p>
              {#if validationResults.customers.details && validationResults.customers.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.customers.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Message global -->
            <div class="mt-4 p-3 rounded-lg {validationResults.overall.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              <p class="font-semibold">
                <Translate key="overall_status" module="configuration" fallback="Statut global" />:
                {validationResults.overall.message}
              </p>
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => showValidationDialog = false}
            >
              <Translate key="close" module="common" fallback="Fermer" />
            </Button>
            {#if validationResults.overall.isValid}
              <Button
                onclick={confirmAndSaveConfiguration}
              >
                <Translate key="confirm_and_save" module="configuration" fallback="Confirmer et sauvegarder" />
              </Button>
            {/if}
          </div>
        </DialogContent>
      </Dialog>
    {/if}
  {/if}
</div>