<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService, type BalanceConfig, type AssetValuationConfig, type InitialBalanceConfig } from '$lib/services/ConfigurationService';
  import { immobilisationService, type Immobilisation, type ImmobilisationCreateData, type ImmobilisationUpdateData } from '$lib/services/ImmobilisationService';
  import { tiersService, type SoldeTiersResponse, type SoldeTiersCreate } from '$lib/services/TiersService';
  import { partnerService } from '$lib/services/PartnerService';
  import { employeeService } from '$lib/services/EmployeeService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';

  // Types pour les options de sélection des entités
  type EntityOption = {
    id: string;
    name: string;
    type: 'client' | 'fournisseur' | 'employe';
  };
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import DatePicker from '$lib/components/ui/date-picker/DatePicker.svelte';
  import { immobilisationTypes } from '$lib/config/immobilisationTypes';
  import { toast } from 'svelte-sonner';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { formatCurrency } from '$lib/utils/numbers';
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
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
      }
      if (data.data?.station) {
        stationInfo = data.data.station;
      }
    });
    return unsubscribe;
  });

  // États pour les entités (clients, fournisseurs, employés)
  let customers = $state<any[]>([]);
  let suppliers = $state<any[]>([]);
  let employees = $state<any[]>([]);

  // Charger les données quand stationId change
  $effect(() => {
    if (stationId) {
      loadData();
    }
  });

  // Données de configuration des balances
  let activeTab = $state('assets');
  let assets = $state<Immobilisation[]>([]);
  let receivables = $state<SoldeTiersResponse[]>([]);
  let debts = $state<SoldeTiersResponse[]>([]);

  // États pour les formulaires
  let showAddAssetDialog = $state(false);
  let showEditAssetDialog = $state(false);
  let showAddReceivableDialog = $state(false);
  let showEditReceivableDialog = $state(false);
  let showAddDebtDialog = $state(false);
  let showEditDebtDialog = $state(false);

  // États du formulaire immobilisations
  let assetName = $state('');
  let assetDescription = $state('');
  let assetValuation = $state(0);
  let assetCode = $state('');
  let assetType = $state('equipment'); // Initialiser avec une valeur par défaut
  let assetAcquisitionDate = $state('');

  // États du formulaire créances
  let receivableEntityId = $state('');
  let receivableEntityType = $state<'supplier' | 'customer' | 'employee'>('customer');
  let receivableBalance = $state(0);
  let receivableEntityTypeValue = $state<string>('customer');

  // États du formulaire dettes
  let debtEntityId = $state('');
  let debtEntityType = $state<'supplier' | 'customer' | 'employee'>('supplier');
  let debtBalance = $state(0);
  let debtEntityTypeValue = $state<string>('supplier');

  // États pour l'édition des créances
  let editingReceivableEntityTypeValue = $state<string>('customer');

  // États pour l'édition des dettes
  let editingDebtEntityTypeValue = $state<string>('supplier');

  // États pour l'édition
  let editingAsset = $state<Immobilisation | null>(null);
  let editingReceivable = $state<SoldeTiersResponse | null>(null);
  let editingDebt = $state<SoldeTiersResponse | null>(null);

  // Effets réactifs pour réinitialiser la sélection d'entité quand le type change
  let previousReceivableType = $state('');
  let previousDebtType = $state('');

  // Initialiser les valeurs précédentes avec les valeurs actuelles
  $effect(() => {
    if (!previousReceivableType) {
      previousReceivableType = receivableEntityTypeValue;
    }
    if (!previousDebtType) {
      previousDebtType = debtEntityTypeValue;
    }
  });

  $effect(() => {
    if (receivableEntityTypeValue !== previousReceivableType) {
      receivableEntityId = '';
      previousReceivableType = receivableEntityTypeValue;
    }
  });

  $effect(() => {
    if (debtEntityTypeValue !== previousDebtType) {
      debtEntityId = '';
      previousDebtType = debtEntityTypeValue;
    }
  });

  // États pour le dialogue de validation de la configuration
  let showValidationDialog = $state(false);
  let validationResults = $state<any>(null);

  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données de balance pour la station:', stationId);
      loading = true;

      // Charger les immobilisations de la station
      const assetsData = await immobilisationService.getImmobilisationsByStation(stationId);
      assets = assetsData;
      console.log('Immobilisations chargées:', assetsData.length);

      // Charger les créances et dettes de la station via le service tiers
      const soldes = await tiersService.getSoldesByStation(stationId);
      // Filtrer les soldes en créances et dettes en utilisant notre logique basée sur le type de tiers et le montant
      receivables = soldes.filter(solde => determineSoldeType(solde.tiers_id, solde.montant_initial) === 'creance');
      debts = soldes.filter(solde => determineSoldeType(solde.tiers_id, solde.montant_initial) === 'dette');
      console.log('Créances chargées:', receivables.length, 'Dettes chargées:', debts.length);

      // Charger les entités (clients, fournisseurs, employés) pour les sélections
      // Charger chaque type d'entité séparément pour éviter que l'échec d'un endpoint n'affecte les autres
      try {
        const customerPromise = partnerService.getStationCustomers(stationId);
        const supplierPromise = partnerService.getStationSuppliers(stationId);
        const employeePromise = employeeService.getEmployeesByStation(stationId);

        // Attendre chaque promesse individuellement pour gérer les erreurs séparément
        const customerResult = await customerPromise.catch(err => {
          console.error('Erreur lors du chargement des clients:', err);
          return [];
        });

        const supplierResult = await supplierPromise.catch(err => {
          console.error('Erreur lors du chargement des fournisseurs:', err);
          return [];
        });

        const employeeResult = await employeePromise.catch(err => {
          console.error('Erreur lors du chargement des employés:', err);
          return [];
        });

        // Assigner directement les réponses (l'API retourne directement des tableaux)
        customers = customerResult;
        suppliers = supplierResult;
        employees = employeeResult;

        console.log('Entités chargées - Clients:', customers.length,
                   'Fournisseurs:', suppliers.length,
                   'Employés:', employees.length);
      } catch (entitiesErr) {
        console.error('Erreur lors du chargement des entités:', entitiesErr);
        // On continue avec les créances/dettes même si le chargement des entités échoue
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données de balance:', err);
      error = 'Impossible de charger les données de balance: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      assets = [];
      receivables = [];
      debts = [];
    } finally {
      loading = false;
      console.log('Chargement terminé, loading:', loading);
    }
  }

  // Fonction pour convertir les entités en options de sélection
  function getEntityOptions(): EntityOption[] {
    const options: EntityOption[] = [];

    // Ajouter les clients
    customers.forEach(customer => {
      options.push({
        id: customer.id,
        name: customer.nom || `${customer.contact_person || customer.code || 'Client'}`,
        type: 'client'
      });
    });

    // Ajouter les fournisseurs
    suppliers.forEach(supplier => {
      options.push({
        id: supplier.id,
        name: supplier.nom || `${supplier.contact_person || supplier.code || 'Fournisseur'}`,
        type: 'fournisseur'
      });
    });

    // Ajouter les employés
    employees.forEach(employee => {
      options.push({
        id: employee.id,
        name: employee.nom || `${employee.contact_person || employee.email || 'Employé'}`,
        type: 'employe'
      });
    });

    return options;
  }

  // Fonction pour convertir les entités en options de sélection, en excluant celles ayant déjà un solde
  function getEntityOptionsWithoutExistingSolde(): EntityOption[] {
    return getEntityOptions().filter(option => !hasExistingSolde(option.id));
  }

  // Fonction utilitaire pour gérer les deux formats de réponse API : tableau direct ou objet avec propriété 'data'
  function handleApiResponse<T>(response: T | { data: T }): T {
    if (response && typeof response === 'object' && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return response as T;
  }

  // Fonction pour déterminer le type d'entité à partir de l'ID
  function getEntityTypeById(entityId: string): 'client' | 'fournisseur' | 'employe' | null {
    if (customers.some(customer => customer.id === entityId)) {
      return 'client';
    }
    if (suppliers.some(supplier => supplier.id === entityId)) {
      return 'fournisseur';
    }
    if (employees.some(employee => employee.id === entityId)) {
      return 'employe';
    }
    return null;
  }

  // Fonction pour déterminer si un solde est une créance ou une dette en fonction du type de tiers
  function determineSoldeType(entityId: string, montant: number): 'creance' | 'dette' {
    const entityType = getEntityTypeById(entityId);

    if (!entityType) {
      // Si on ne peut pas déterminer le type d'entité, on suppose qu'il s'agit d'une créance par défaut
      return montant >= 0 ? 'creance' : 'dette';
    }

    if (entityType === 'fournisseur') {
      // Pour les fournisseurs: solde < 0 = créance, solde > 0 = dette
      return montant < 0 ? 'creance' : 'dette';
    } else {
      // Pour les clients et employés: solde > 0 = créance, solde < 0 = dette
      return montant > 0 ? 'creance' : 'dette';
    }
  }

  // Fonction pour convertir une immobilisation pour l'affichage
  function transformImmobilisationForDisplay(immobilisation: Immobilisation): AssetValuationConfig {
    return {
      id: immobilisation.id,
      asset_name: immobilisation.nom,
      description: immobilisation.description || '',
      valuation: immobilisation.valeur_origine, // Utiliser la valeur d'origine pour le moment
      currency: 'XOF' // Valeur par défaut, peut-être à adapter
    };
  }

  // Fonction pour générer des immobilisations de démonstration - à supprimer après intégration complète
  function generateMockAssets() {
    return [
      {
        id: 'asset-001',
        asset_name: 'Pompe à essence',
        description: 'Pompe principale pour le carburant',
        valuation: 1500000,
        currency: 'XOF'
      },
      {
        id: 'asset-002',
        asset_name: 'Cuve à carburant',
        description: 'Cuve de stockage de 10 000L',
        valuation: 2000000,
        currency: 'XOF'
      },
      {
        id: 'asset-003',
        asset_name: 'Bâtiment',
        description: 'Bâtiment de la station-service',
        valuation: 10000000,
        currency: 'XOF'
      }
    ];
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
          balance: {
            assets: validation.assets.isValid,
            receivables: validation.receivables.isValid,
            debts: validation.debts.isValid,
            overall: validation.overall.isValid
          }
        }
      };

      // Sauvegarder la configuration via le service
      const response = await configurationService.saveStationConfiguration(stationId, configToSave);

      console.log('Configuration de balance sauvegardée avec succès pour la station:', stationId);
      console.log(configToSave);

      // Mettre à jour la configuration dans le store global
      configurationStore.updatePart(stationId, 'balance', configToSave.completion.balance);

      // Fermer le dialogue de validation
      showValidationDialog = false;

      // Afficher un message de succès
      toast.success(get(i18nStore).resources?.configuration?.balance_config_saved || 'Configuration de balance sauvegardée avec succès');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);
      error = 'Erreur lors de la sauvegarde de la configuration: ' + (err as Error).message;
    }
  }

  // Charger les données au montage
  onMount(() => {
    console.log('Composant balance monté avec stationId:', stationId);
  });

  // Fonction pour ajouter une immobilisation
  async function addAsset() {
    try {
      if (!assetName || !assetCode || !assetType || !assetAcquisitionDate || assetValuation <= 0) {
        throw new Error('Tous les champs requis pour l\'immobilisation doivent être remplis');
      }

      // Créer l'objet de la nouvelle immobilisation selon le format API
      const newAssetData: ImmobilisationCreateData = {
        nom: assetName,
        description: assetDescription || undefined,
        code: assetCode,
        type: assetType,
        date_acquisition: assetAcquisitionDate,
        valeur_origine: assetValuation,
        station_id: stationId
      };

      // Créer la nouvelle immobilisation via l'API
      const newAsset = await immobilisationService.createImmobilisation(newAssetData);

      // Ajouter la nouvelle immobilisation à la liste locale
      assets = [...assets, newAsset];

      assetName = '';
      assetDescription = '';
      assetCode = '';
      assetType = '';
      assetAcquisitionDate = '';
      assetValuation = 0;

      // Fermer la dialog
      showAddAssetDialog = false;

      console.log('Immobilisation ajoutée avec succès:', newAsset);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'immobilisation:', err);
      error = 'Impossible d\'ajouter l\'immobilisation: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier une immobilisation
  async function updateAsset() {
    try {
      if (!editingAsset || !editingAsset.id) {
        throw new Error('Aucune immobilisation à éditer');
      }

      // Créer les données de mise à jour selon le format API
      const updateData: ImmobilisationUpdateData = {
        description: assetDescription,
        type: assetType,
        valeur_origine: assetValuation,
        // Les champs nom, code et date_acquisition ne sont pas modifiables via l'API de mise à jour
        // mais pourraient l'être via une mise à jour séparée si nécessaire
      };

      // Mettre à jour l'immobilisation via l'API
      const updatedAsset = await immobilisationService.updateImmobilisation(editingAsset.id!, updateData);

      // Mettre à jour l'immobilisation dans la liste locale
      assets = assets.map(a =>
        a.id === updatedAsset.id ? updatedAsset : a
      );

      // Fermer la boîte de dialogue
      showEditAssetDialog = false;
      editingAsset = null;

      console.log('Immobilisation mise à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'immobilisation:', err);
      error = 'Impossible de mettre à jour l\'immobilisation: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer une immobilisation
  async function removeAsset(assetId: string) {
    try {
      // Supprimer l'immobilisation via l'API
      await immobilisationService.deleteImmobilisation(assetId);

      // Retirer l'immobilisation de la liste locale
      assets = assets.filter(a => a.id !== assetId);

      console.log('Immobilisation supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'immobilisation:', err);
      error = 'Impossible de supprimer l\'immobilisation: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'une immobilisation
  function prepareEditAsset(asset: Immobilisation) {
    editingAsset = { ...asset };
    assetName = asset.nom;
    assetDescription = asset.description || '';
    assetCode = asset.code;
    assetType = asset.type || 'equipment'; // S'assurer que le type est initialisé
    assetAcquisitionDate = asset.date_acquisition.substring(0, 10); // format date YYYY-MM-DD
    assetValuation = asset.valeur_origine;
    showEditAssetDialog = true;
  }

  // Fonction pour ajouter une créance
  async function addReceivable() {
    try {
      if (!receivableEntityId || receivableBalance <= 0) {
        throw new Error('L\'entité et le montant de la créance sont requis');
      }

      // Mettre à jour receivableEntityType avec la valeur sélectionnée
      receivableEntityType = receivableEntityTypeValue as 'supplier' | 'customer' | 'employee';

      // Déterminer le montant réel selon le type de tiers
      // Pour les fournisseurs, une créance est un solde négatif
      // Pour les clients et employés, une créance est un solde positif
      let actualAmount = receivableBalance;
      const entityType = getEntityTypeById(receivableEntityId);
      if (entityType === 'fournisseur') {
        actualAmount = -Math.abs(actualAmount); // Forcer le montant à être négatif pour les fournisseurs
      } else {
        actualAmount = Math.abs(actualAmount); // S'assurer que le montant est positif pour les clients et employés
      }

      // Créer le solde via le service tiers (utiliser une fonction générique pour traiter tous les types de soldes)
      const newReceivable = await tiersService.createCreance(
        receivableEntityId,
        stationId,
        actualAmount,
        'XOF' // Utiliser la devise par défaut ou récupérer de l'utilisateur
      );

      // Ajouter la nouvelle créance à la liste locale
      receivables = [...receivables, newReceivable];

      // Réinitialiser le formulaire
      showAddReceivableDialog = false;
      receivableEntityId = '';
      receivableEntityType = 'customer';
      receivableEntityTypeValue = 'customer';
      receivableBalance = 0;

      console.log('Créance ajoutée avec succès:', newReceivable);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la créance:', err);
      error = 'Impossible d\'ajouter la créance: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier une créance
  async function updateReceivable() {
    try {
      if (!editingReceivable || !editingReceivable.id) {
        throw new Error('Aucune créance à éditer');
      }

      // Déterminer le montant réel selon le type de tiers
      // Pour les fournisseurs, une créance est un solde négatif
      // Pour les clients et employés, une créance est un solde positif
      let actualAmount = editingReceivable.montant_actuel || 0;
      const entityType = getEntityTypeById(editingReceivable.tiers_id);
      if (entityType === 'fournisseur') {
        actualAmount = -Math.abs(actualAmount); // Forcer le montant à être négatif pour les fournisseurs
      } else {
        actualAmount = Math.abs(actualAmount); // S'assurer que le montant est positif pour les clients et employés
      }

      // Mettre à jour la créance via le service tiers
      const updatedReceivable = await tiersService.updateSoldeTiers(
        editingReceivable.tiers_id,
        stationId,
        {
          montant_initial: actualAmount,
          montant_actuel: actualAmount
        }
      );

      // Mettre à jour la créance dans la liste locale
      receivables = receivables.map(r =>
        r.id === updatedReceivable.id ? updatedReceivable : r
      );

      // Fermer la boîte de dialogue
      showEditReceivableDialog = false;
      editingReceivable = null;

      console.log('Créance mise à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la créance:', err);
      error = 'Impossible de mettre à jour la créance: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer une créance
  async function removeReceivable(receivable: SoldeTiersResponse) {
    try {
      // Supprimer la créance via le service tiers
      await tiersService.deleteSoldeTiers(
        receivable.tiers_id,
        receivable.station_id
      );

      // Retirer la créance de la liste locale
      receivables = receivables.filter(r => r.id !== receivable.id);

      console.log('Créance supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la créance:', err);
      error = 'Impossible de supprimer la créance: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'une créance
  function prepareEditReceivable(receivable: SoldeTiersResponse) {
    editingReceivable = { ...receivable };
    // Déterminer le type d'entité à partir de l'ID
    const entityType = getEntityTypeById(receivable.tiers_id);
    if (entityType) {
      // Convertir le type d'entité en format correspondant à la sélection
      if (entityType === 'client') {
        editingReceivableEntityTypeValue = 'customer';
      } else if (entityType === 'fournisseur') {
        editingReceivableEntityTypeValue = 'supplier';
      } else if (entityType === 'employe') {
        editingReceivableEntityTypeValue = 'employee';
      }
    }
    receivableEntityId = receivable.tiers_id;
    receivableBalance = receivable.montant_initial;
    showEditReceivableDialog = true;
  }

  // Fonction pour ajouter une dette
  async function addDebt() {
    try {
      if (!debtEntityId || debtBalance <= 0) {
        throw new Error('L\'entité et le montant de la dette sont requis');
      }

      // Mettre à jour debtEntityType avec la valeur sélectionnée
      debtEntityType = debtEntityTypeValue as 'supplier' | 'customer' | 'employee';

      // Déterminer le montant réel selon le type de tiers
      // Pour les fournisseurs, une dette est un solde positif
      // Pour les clients et employés, une dette est un solde négatif
      let actualAmount = debtBalance;
      const entityType = getEntityTypeById(debtEntityId);
      if (entityType === 'fournisseur') {
        actualAmount = Math.abs(actualAmount); // S'assurer que le montant est positif pour les fournisseurs
      } else {
        actualAmount = -Math.abs(actualAmount); // Forcer le montant à être négatif pour les clients et employés
      }

      // Créer le solde via le service tiers (utiliser une fonction générique pour traiter tous les types de soldes)
      const newDebt = await tiersService.createDette(
        debtEntityId,
        stationId,
        actualAmount,
        'XOF' // Utiliser la devise par défaut ou récupérer de l'utilisateur
      );

      // Ajouter la nouvelle dette à la liste locale
      debts = [...debts, newDebt];

      // Réinitialiser le formulaire
      showAddDebtDialog = false;
      debtEntityId = '';
      debtEntityType = 'supplier';
      debtEntityTypeValue = 'supplier';
      debtBalance = 0;

      console.log('Dette ajoutée avec succès:', newDebt);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la dette:', err);
      error = 'Impossible d\'ajouter la dette: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier une dette
  async function updateDebt() {
    try {
      if (!editingDebt || !editingDebt.id) {
        throw new Error('Aucune dette à éditer');
      }

      // Déterminer le montant réel selon le type de tiers
      // Pour les fournisseurs, une dette est un solde positif
      // Pour les clients et employés, une dette est un solde négatif
      let actualAmount = editingDebt.montant_actuel || 0;
      const entityType = getEntityTypeById(editingDebt.tiers_id);
      if (entityType === 'fournisseur') {
        actualAmount = Math.abs(actualAmount); // S'assurer que le montant est positif pour les fournisseurs
      } else {
        actualAmount = -Math.abs(actualAmount); // Forcer le montant à être négatif pour les clients et employés
      }

      // Mettre à jour la dette via le service tiers
      const updatedDebt = await tiersService.updateSoldeTiers(
        editingDebt.tiers_id,
        stationId,
        {
          montant_initial: actualAmount,
          montant_actuel: actualAmount
        }
      );

      // Mettre à jour la dette dans la liste locale
      debts = debts.map(d =>
        d.id === updatedDebt.id ? updatedDebt : d
      );

      // Fermer la boîte de dialogue
      showEditDebtDialog = false;
      editingDebt = null;

      console.log('Dette mise à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la dette:', err);
      error = 'Impossible de mettre à jour la dette: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer une dette
  async function removeDebt(debt: SoldeTiersResponse) {
    try {
      // Supprimer la dette via le service tiers
      await tiersService.deleteSoldeTiers(
        debt.tiers_id,
        debt.station_id
      );

      // Retirer la dette de la liste locale
      debts = debts.filter(d => d.id !== debt.id);

      console.log('Dette supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la dette:', err);
      error = 'Impossible de supprimer la dette: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'une dette
  function prepareEditDebt(debt: SoldeTiersResponse) {
    editingDebt = { ...debt };
    // Déterminer le type d'entité à partir de l'ID
    const entityType = getEntityTypeById(debt.tiers_id);
    if (entityType) {
      // Convertir le type d'entité en format correspondant à la sélection
      if (entityType === 'client') {
        editingDebtEntityTypeValue = 'customer';
      } else if (entityType === 'fournisseur') {
        editingDebtEntityTypeValue = 'supplier';
      } else if (entityType === 'employe') {
        editingDebtEntityTypeValue = 'employee';
      }
    }
    debtEntityId = debt.tiers_id;
    debtBalance = debt.montant_initial;
    showEditDebtDialog = true;
  }

  // Fonction pour vérifier si une entité a déjà un solde (soit une créance, soit une dette)
  function hasExistingSolde(entityId: string): boolean {
    // Vérifier dans les créances
    if (receivables.some(solde => solde.tiers_id === entityId)) {
      return true;
    }

    // Vérifier dans les dettes
    if (debts.some(solde => solde.tiers_id === entityId)) {
      return true;
    }

    return false;
  }

  // Fonction pour regrouper les soldes par type d'entité
  function groupByEntityType(soldes: SoldeTiersResponse[]) {
    const grouped = {
      clients: [] as SoldeTiersResponse[],
      fournisseurs: [] as SoldeTiersResponse[],
      employes: [] as SoldeTiersResponse[],
      autres: [] as SoldeTiersResponse[]
    };

    soldes.forEach(solde => {
      const entityType = getEntityTypeById(solde.tiers_id);
      switch (entityType) {
        case 'client':
          grouped.clients.push(solde);
          break;
        case 'fournisseur':
          grouped.fournisseurs.push(solde);
          break;
        case 'employe':
          grouped.employes.push(solde);
          break;
        default:
          grouped.autres.push(solde);
          break;
      }
    });

    return grouped;
  }

  // Fonction pour obtenir le libellé de l'entité
  function getEntityLabel(tiersId: string, typeSolde: 'creance' | 'dette') {
    // Trouver le nom de l'entité (client, fournisseur ou employé) à partir de son ID
    let entityName: string | undefined;

    // Rechercher dans les clients
    const customer = customers.find(c => c.id === tiersId);
    if (customer) {
      entityName = customer.nom || customer.contact_person || customer.code || `Client ${tiersId.substring(0, 8)}`;
    }

    // Rechercher dans les fournisseurs
    if (!entityName) {
      const supplier = suppliers.find(s => s.id === tiersId);
      if (supplier) {
        entityName = supplier.nom || supplier.contact_person || supplier.code || `Fournisseur ${tiersId.substring(0, 8)}`;
      }
    }

    // Rechercher dans les employés
    if (!entityName) {
      const employee = employees.find(e => e.id === tiersId);
      if (employee) {
        entityName = employee.nom || employee.contact_person || employee.email || `Employé ${tiersId.substring(0, 8)}`;
      }
    }

    // Si on n'a pas trouvé l'entité, utiliser un libellé basique
    if (!entityName) {
      entityName = `Entité inconnue #${tiersId.substring(0, 8)}`;
    }

    // Déterminer le type de solde pour l'affichage
    const soldeTypes: Record<string, string> = {
      creance: get(i18nStore).resources?.common?.['receivable'] || 'Créance',
      dette: get(i18nStore).resources?.common?.['debt'] || 'Dette'
    };

    return `${soldeTypes[typeSolde] || typeSolde}: ${entityName}`;
  }

  // Fonction de validation globale de la configuration de balance
  function validateConfiguration() {
    const validation = {
      assets: { isValid: true, message: '', details: [] as string[] },
      receivables: { isValid: true, message: '', details: [] as string[] },
      debts: { isValid: true, message: '', details: [] as string[] },
      overall: { isValid: true, message: '' }
    };

    // Validation des immobilisations (optionnelles)
    if (assets.length === 0) {
      validation.assets.message = 'Aucune immobilisation configurée (facultatif)';
    } else {
      validation.assets.message = `${assets.length} immobilisation(s) configurée(s)`;
      validation.assets.details = assets.map(asset =>
        `${asset.nom} (${formatCurrency(asset.valeur_origine)})`
      );
    }

    // Validation des créances (optionelles)
    if (receivables.length === 0) {
      validation.receivables.message = 'Aucune créance configurée (facultatif)';
    } else {
      validation.receivables.message = `${receivables.length} créance(s) configurée(s)`;
      validation.receivables.details = receivables.map(receivable =>
        `${getEntityLabel(receivable.tiers_id, 'creance')} (${formatCurrency(receivable.montant_initial)})`
      );
    }

    // Validation des dettes (optionelles)
    if (debts.length === 0) {
      validation.debts.message = 'Aucune dette configurée (facultatif)';
    } else {
      validation.debts.message = `${debts.length} dette(s) configurée(s)`;
      validation.debts.details = debts.map(debt =>
        `${getEntityLabel(debt.tiers_id, 'dette')} (${formatCurrency(debt.montant_initial)})`
      );
    }

    // Validation globale
    // Puisque tout est optionnel, la validation globale est toujours valide
    validation.overall.isValid = true;
    validation.overall.message = 'Configuration complète (tous les éléments sont facultatifs)';

    return validation;
  }

  console.log('Composant balance monté');
</script>

<div class="space-y-6">
  <!-- Carte d'identification de la station -->
  {#if stationInfo}
    <Card class="border-primary/30 bg-primary/5">
      <CardHeader class="flex flex-row items-center justify-between space-x-4">
        <div class="flex flex-row items-center space-x-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
            📋
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
      <Translate key="balance_setup" module="configuration" fallback="Configuration du Bilan" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="initial_balance_setup"
        module="configuration"
        fallback="Configurez les soldes initiaux et les valorisations de votre station"
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
              <Translate key="balance_config" module="configuration" fallback="Configuration du Bilan" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="manage_balances"
                module="configuration"
                fallback="Gérez les immobilisations, créances et dettes de votre station"
              />
            </CardDescription>
          </div>
          <Button type="button" onclick={() => saveConfiguration()}>
            <Translate key="save_configuration" module="configuration" fallback="Sauvegarder" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs bind:value={activeTab} class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="assets">
              <Translate key="assets" module="configuration" fallback="Immobilisations" />
            </TabsTrigger>
            <TabsTrigger value="receivables">
              <Translate key="receivables" module="configuration" fallback="Créances" />
            </TabsTrigger>
            <TabsTrigger value="debts">
              <Translate key="debts" module="configuration" fallback="Dettes" />
            </TabsTrigger>
          </TabsList>

          <!-- Onglet Immobilisations -->
          <TabsContent value="assets" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="assets" module="configuration" fallback="Immobilisations" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_assets"
                        module="configuration"
                        fallback="Gérez les immobilisations de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddAssetDialog}>
                    <DialogTrigger>
                      <Button>
                        <Translate key="add_asset" module="configuration" fallback="Ajouter une Immobilisation" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_asset" module="configuration" fallback="Ajouter une Immobilisation" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_asset_description"
                            module="configuration"
                            fallback="Entrez les informations de la nouvelle immobilisation"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-4 py-4">
                        <div class="space-y-2">
                          <Label for="assetName">
                            <Translate key="name" module="common" fallback="Nom" />
                          </Label>
                          <Input
                            id="assetName"
                            bind:value={assetName}
                            autocomplete="one-time-code"
                            placeholder={get(i18nStore).resources?.configuration?.asset_name || 'Nom de l\'immobilisation'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="assetDescription">
                            <Translate key="description" module="common" fallback="Description" />
                          </Label>
                          <Input
                            id="assetDescription"
                            bind:value={assetDescription}
                            autocomplete="one-time-code"
                            placeholder={get(i18nStore).resources?.configuration?.asset_description || 'Description de l\'immobilisation'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="assetCode">
                            <Translate key="code" module="common" fallback="Code" />
                          </Label>
                          <Input
                            id="assetCode"
                            bind:value={assetCode}
                            autocomplete="one-time-code"
                            placeholder={get(i18nStore).resources?.configuration?.asset_code_placeholder || 'Code de l\'immobilisation (ex: IMMO-001)'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="assetType">
                            <Translate key="type" module="common" fallback="Type" />
                          </Label>
                          <Select.Root bind:value={assetType} type="single">
                            <Select.Trigger id="assetType">
                              <span data-slot="select-value">
                                {assetType
                                  ? (immobilisationTypes.find(t => t.key === assetType)?.i18nKey
                                    ? get(i18nStore).resources?.configuration?.[immobilisationTypes.find(t => t.key === assetType)!.i18nKey!] || immobilisationTypes.find(t => t.key === assetType)?.label
                                    : immobilisationTypes.find(t => t.key === assetType)?.label)
                                  : get(i18nStore).resources?.configuration?.asset_type_placeholder || 'Sélectionnez le type d\'immobilisation'}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              {#each immobilisationTypes as type}
                                <Select.Item value={type.key}>
                                  {type.i18nKey
                                    ? get(i18nStore).resources?.configuration?.[type.i18nKey] || type.label
                                    : type.label}
                                </Select.Item>
                              {/each}
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="assetAcquisitionDate">
                            <Translate key="acquisition_date" module="configuration" fallback="Date d'acquisition" />
                          </Label>
                          <DatePicker
                            id="assetAcquisitionDate"
                            date={assetAcquisitionDate ? new Date(assetAcquisitionDate) : undefined}
                            onDateChange={(date) => assetAcquisitionDate = date ? date.toISOString().split('T')[0] : ''}
                            placeholder={get(i18nStore).resources?.configuration?.acquisition_date_placeholder || 'Sélectionnez la date d\'acquisition'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="assetValuation">
                            <Translate key="valuation" module="configuration" fallback="Valorisation" />
                          </Label>
                          <Input
                            id="assetValuation"
                            type="number"
                            bind:value={assetValuation}
                            placeholder={get(i18nStore).resources?.configuration?.asset_valuation_placeholder || 'Valeur de l\'immobilisation'}
                          />
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddAssetDialog = false;
                            assetName = '';
                            assetDescription = '';
                            assetCode = '';
                            assetType = '';
                            assetAcquisitionDate = '';
                            assetValuation = 0;
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                        <Button
                          type="button"
                          onclick={addAsset}
                          disabled={!assetName || !assetCode || !assetType || !assetAcquisitionDate || assetValuation <= 0}
                        >
                          <Translate key="add" module="common" fallback="Ajouter" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  {#each assets as asset (asset.id)}
                    <Card class="p-4">
                      <div class="grid grid-cols-5 gap-4 items-center">
                        <div>
                          <Label>
                            <Translate key="name" module="common" fallback="Nom" />
                          </Label>
                          <p class="font-medium">{asset.nom}</p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="type" module="common" fallback="Type" />
                          </Label>
                          <p class="font-medium">
                            {(immobilisationTypes.find(t => t.key === asset.type)?.i18nKey
                              ? get(i18nStore).resources?.configuration?.[immobilisationTypes.find(t => t.key === asset.type)!.i18nKey!] || immobilisationTypes.find(t => t.key === asset.type)?.label
                              : immobilisationTypes.find(t => t.key === asset.type)?.label) || asset.type}
                          </p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="description" module="common" fallback="Description" />
                          </Label>
                          <p class="text-sm">{asset.description || get(i18nStore).resources?.configuration?.no_description || 'Aucune description'}</p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="valuation" module="configuration" fallback="Valorisation" />
                          </Label>
                          <p class="font-medium">{formatCurrency(asset.valeur_origine)}</p>
                        </div>
                        <div class="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onclick={() => prepareEditAsset(asset)}
                          >
                            <Translate key="edit" module="common" fallback="Éditer" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            class="text-destructive border-destructive"
                            onclick={() => removeAsset(asset.id)}
                          >
                            <Translate key="delete" module="common" fallback="Supprimer" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  {/each}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Onglet Créances -->
          <TabsContent value="receivables" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="receivables" module="configuration" fallback="Créances" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_receivables"
                        module="configuration"
                        fallback="Gérez les créances de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddReceivableDialog}>
                    <DialogTrigger>
                      <Button>
                        <Translate key="add_receivable" module="configuration" fallback="Ajouter une Créance" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_receivable" module="configuration" fallback="Ajouter une Créance" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_receivable_description"
                            module="configuration"
                            fallback="Entrez les informations de la nouvelle créance"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-4 py-4">
                        <div class="space-y-2">
                          <Label for="receivableEntityType">
                            <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
                          </Label>
                          <Select.Root type="single" bind:value={receivableEntityTypeValue}>
                            <Select.Trigger id="receivableEntityType">
                              <span data-slot="select-value">
                                {get(i18nStore).resources?.configuration?.[`entity_type_${receivableEntityTypeValue}`] || receivableEntityTypeValue}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="supplier">
                                <Translate key="supplier" module="configuration" fallback="Fournisseur" />
                              </Select.Item>
                              <Select.Item value="customer">
                                <Translate key="customer" module="configuration" fallback="Client" />
                              </Select.Item>
                              <Select.Item value="employee">
                                <Translate key="employee" module="configuration" fallback="Employé" />
                              </Select.Item>
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="receivableEntityId">
                            <Translate key="entity" module="configuration" fallback="Entité" />
                          </Label>
                          <Select.Root type="single" bind:value={receivableEntityId}>
                            <Select.Trigger id="receivableEntityId">
                              <span data-slot="select-value">
                                {getEntityOptions().find(option => option.id === receivableEntityId)?.name ||
                                (get(i18nStore).resources?.configuration?.select_entity_placeholder || 'Sélectionnez une entité')}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              {#each getEntityOptionsWithoutExistingSolde().filter(option =>
                                (receivableEntityTypeValue === 'customer' && option.type === 'client') ||
                                (receivableEntityTypeValue === 'supplier' && option.type === 'fournisseur') ||
                                (receivableEntityTypeValue === 'employee' && option.type === 'employe')
                              ) as option}
                                <Select.Item value={option.id}>
                                  {option.name} ({get(i18nStore).resources?.configuration?.[`entity_type_${option.type}`] || option.type})
                                </Select.Item>
                              {/each}
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="receivableBalance">
                            <Translate key="balance" module="configuration" fallback="Solde" />
                          </Label>
                          <Input
                            id="receivableBalance"
                            type="number"
                            bind:value={receivableBalance}
                            placeholder={get(i18nStore).resources?.configuration?.receivable_balance_placeholder || 'Montant de la créance'}
                          />
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddReceivableDialog = false;
                            receivableEntityId = '';
                            receivableEntityType = 'customer';
                            receivableBalance = 0;
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                        <Button
                          type="button"
                          onclick={addReceivable}
                          disabled={!receivableEntityId || receivableBalance < 0}
                        >
                          <Translate key="add" module="common" fallback="Ajouter" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-6">
                  <!-- Regroupement par type d'entité -->
                  {#each Object.entries(groupByEntityType(receivables)) as [entityTypeKey, groupedReceivables]}
                    {#if groupedReceivables.length > 0}
                      <div class="space-y-4">
                        <h3 class="text-lg font-semibold">
                          {#if entityTypeKey === 'clients'}
                            {get(i18nStore).resources?.configuration?.['entity_type_customer'] || 'Clients'}
                          {:else if entityTypeKey === 'fournisseurs'}
                            {get(i18nStore).resources?.configuration?.['entity_type_supplier'] || 'Fournisseurs'}
                          {:else if entityTypeKey === 'employes'}
                            {get(i18nStore).resources?.configuration?.['entity_type_employee'] || 'Employés'}
                          {:else if entityTypeKey === 'autres'}
                            {get(i18nStore).resources?.configuration?.['entity_type_unknown'] || 'Autres'}
                          {/if}
                        </h3>
                        <div class="space-y-3">
                          {#each groupedReceivables as receivable (receivable.id)}
                            <Card class="p-4">
                              <div class="grid grid-cols-4 gap-4 items-center">
                                <div>
                                  <Label>
                                    <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
                                  </Label>
                                  <p class="font-medium">
                                    {(() => {
                                      const entityType = getEntityTypeById(receivable.tiers_id);
                                      if (entityType === 'client') return get(i18nStore).resources?.configuration?.['entity_type_customer'] || 'Client';
                                      if (entityType === 'fournisseur') return get(i18nStore).resources?.configuration?.['entity_type_supplier'] || 'Fournisseur';
                                      if (entityType === 'employe') return get(i18nStore).resources?.configuration?.['entity_type_employee'] || 'Employé';
                                      return get(i18nStore).resources?.configuration?.['entity_type_unknown'] || 'Inconnu';
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="entity_name" module="configuration" fallback="Nom de l'entité" />
                                  </Label>
                                  <p>{getEntityLabel(receivable.tiers_id, determineSoldeType(receivable.tiers_id, receivable.montant_initial))}</p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="balance" module="configuration" fallback="Solde" />
                                  </Label>
                                  <p class="font-medium">{formatCurrency(receivable.montant_initial)}</p>
                                </div>
                                <div class="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => prepareEditReceivable(receivable)}
                                  >
                                    <Translate key="edit" module="common" fallback="Éditer" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    class="text-destructive border-destructive"
                                    onclick={() => removeReceivable(receivable)}
                                  >
                                    <Translate key="delete" module="common" fallback="Supprimer" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Onglet Dettes -->
          <TabsContent value="debts" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="debts" module="configuration" fallback="Dettes" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_debts"
                        module="configuration"
                        fallback="Gérez les dettes de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddDebtDialog}>
                    <DialogTrigger>
                      <Button>
                        <Translate key="add_debt" module="configuration" fallback="Ajouter une Dette" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_debt" module="configuration" fallback="Ajouter une Dette" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_debt_description"
                            module="configuration"
                            fallback="Entrez les informations de la nouvelle dette"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-4 py-4">
                        <div class="space-y-2">
                          <Label for="debtEntityType">
                            <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
                          </Label>
                          <Select.Root type="single" bind:value={debtEntityTypeValue}>
                            <Select.Trigger id="debtEntityType">
                              <span data-slot="select-value">
                                {get(i18nStore).resources?.configuration?.[`entity_type_${debtEntityTypeValue}`] || debtEntityTypeValue}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="supplier">
                                <Translate key="supplier" module="configuration" fallback="Fournisseur" />
                              </Select.Item>
                              <Select.Item value="customer">
                                <Translate key="customer" module="configuration" fallback="Client" />
                              </Select.Item>
                              <Select.Item value="employee">
                                <Translate key="employee" module="configuration" fallback="Employé" />
                              </Select.Item>
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="debtEntityId">
                            <Translate key="entity" module="configuration" fallback="Entité" />
                          </Label>
                          <Select.Root type="single" bind:value={debtEntityId}>
                            <Select.Trigger id="debtEntityId">
                              <span data-slot="select-value">
                                {getEntityOptions().find(option => option.id === debtEntityId)?.name ||
                                (get(i18nStore).resources?.configuration?.select_entity_placeholder || 'Sélectionnez une entité')}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              {#each getEntityOptionsWithoutExistingSolde().filter(option =>
                                (debtEntityTypeValue === 'customer' && option.type === 'client') ||
                                (debtEntityTypeValue === 'supplier' && option.type === 'fournisseur') ||
                                (debtEntityTypeValue === 'employee' && option.type === 'employe')
                              ) as option}
                                <Select.Item value={option.id}>
                                  {option.name} ({get(i18nStore).resources?.configuration?.[`entity_type_${option.type}`] || option.type})
                                </Select.Item>
                              {/each}
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="debtBalance">
                            <Translate key="balance" module="configuration" fallback="Solde" />
                          </Label>
                          <Input
                            id="debtBalance"
                            type="number"
                            bind:value={debtBalance}
                            placeholder={get(i18nStore).resources?.configuration?.debt_balance_placeholder || 'Montant de la dette'}
                          />
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddDebtDialog = false;
                            debtEntityId = '';
                            debtEntityType = 'supplier';
                            debtBalance = 0;
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                        <Button
                          type="button"
                          onclick={addDebt}
                          disabled={!debtEntityId || debtBalance < 0}
                        >
                          <Translate key="add" module="common" fallback="Ajouter" />
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-6">
                  <!-- Regroupement par type d'entité -->
                  {#each Object.entries(groupByEntityType(debts)) as [entityTypeKey, groupedDebts]}
                    {#if groupedDebts.length > 0}
                      <div class="space-y-4">
                        <h3 class="text-lg font-semibold">
                          {#if entityTypeKey === 'clients'}
                            {get(i18nStore).resources?.configuration?.['entity_type_customer'] || 'Clients'}
                          {:else if entityTypeKey === 'fournisseurs'}
                            {get(i18nStore).resources?.configuration?.['entity_type_supplier'] || 'Fournisseurs'}
                          {:else if entityTypeKey === 'employes'}
                            {get(i18nStore).resources?.configuration?.['entity_type_employee'] || 'Employés'}
                          {:else if entityTypeKey === 'autres'}
                            {get(i18nStore).resources?.configuration?.['entity_type_unknown'] || 'Autres'}
                          {/if}
                        </h3>
                        <div class="space-y-3">
                          {#each groupedDebts as debt (debt.id)}
                            <Card class="p-4">
                              <div class="grid grid-cols-4 gap-4 items-center">
                                <div>
                                  <Label>
                                    <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
                                  </Label>
                                  <p class="font-medium">
                                    {(() => {
                                      const entityType = getEntityTypeById(debt.tiers_id);
                                      if (entityType === 'client') return get(i18nStore).resources?.configuration?.['entity_type_customer'] || 'Client';
                                      if (entityType === 'fournisseur') return get(i18nStore).resources?.configuration?.['entity_type_supplier'] || 'Fournisseur';
                                      if (entityType === 'employe') return get(i18nStore).resources?.configuration?.['entity_type_employee'] || 'Employé';
                                      return get(i18nStore).resources?.configuration?.['entity_type_unknown'] || 'Inconnu';
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="entity_name" module="configuration" fallback="Nom de l'entité" />
                                  </Label>
                                  <p>{getEntityLabel(debt.tiers_id, determineSoldeType(debt.tiers_id, debt.montant_initial))}</p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="balance" module="configuration" fallback="Solde" />
                                  </Label>
                                  <p class="font-medium">{formatCurrency(debt.montant_initial)}</p>
                                </div>
                                <div class="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => prepareEditDebt(debt)}
                                  >
                                    <Translate key="edit" module="common" fallback="Éditer" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    class="text-destructive border-destructive"
                                    onclick={() => removeDebt(debt)}
                                  >
                                    <Translate key="delete" module="common" fallback="Supprimer" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <!-- Dialogue d'édition d'immobilisation -->
    {#if editingAsset}
      <Dialog bind:open={showEditAssetDialog}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_asset" module="configuration" fallback="Éditer l'immobilisation" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_asset_description"
                module="configuration"
                fallback="Modifiez les informations de l'immobilisation"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="editAssetName">
                <Translate key="name" module="common" fallback="Nom" />
              </Label>
              <Input
                id="editAssetName"
                bind:value={assetName}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.asset_name || 'Nom de l\'immobilisation'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editAssetDescription">
                <Translate key="description" module="common" fallback="Description" />
              </Label>
              <Input
                id="editAssetDescription"
                bind:value={assetDescription}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.asset_description || 'Description de l\'immobilisation'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editAssetCode">
                <Translate key="code" module="common" fallback="Code" />
              </Label>
              <Input
                id="editAssetCode"
                bind:value={assetCode}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.asset_code_placeholder || 'Code de l\'immobilisation (ex: IMMO-001)'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editAssetType">
                <Translate key="type" module="common" fallback="Type" />
              </Label>
              <Select.Root bind:value={assetType} type="single">
                <Select.Trigger id="editAssetType">
                  <span data-slot="select-value">
                    {assetType
                      ? (immobilisationTypes.find(t => t.key === assetType)?.i18nKey
                        ? get(i18nStore).resources?.configuration?.[immobilisationTypes.find(t => t.key === assetType)!.i18nKey!] || immobilisationTypes.find(t => t.key === assetType)?.label
                        : immobilisationTypes.find(t => t.key === assetType)?.label)
                      : get(i18nStore).resources?.configuration?.asset_type_placeholder || 'Sélectionnez le type d\'immobilisation'}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  {#each immobilisationTypes as type}
                    <Select.Item value={type.key}>
                      {type.i18nKey
                        ? get(i18nStore).resources?.configuration?.[type.i18nKey] || type.label
                        : type.label}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-2">
              <Label for="editAssetAcquisitionDate">
                <Translate key="acquisition_date" module="configuration" fallback="Date d'acquisition" />
              </Label>
              <DatePicker
                id="editAssetAcquisitionDate"
                date={assetAcquisitionDate ? new Date(assetAcquisitionDate) : undefined}
                onDateChange={(date) => assetAcquisitionDate = date ? date.toISOString().split('T')[0] : ''}
                placeholder={get(i18nStore).resources?.configuration?.acquisition_date_placeholder || 'Sélectionnez la date d\'acquisition'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editAssetValuation">
                <Translate key="valuation" module="configuration" fallback="Valorisation" />
              </Label>
              <Input
                id="editAssetValuation"
                type="number"
                bind:value={assetValuation}
                placeholder={get(i18nStore).resources?.configuration?.asset_valuation_placeholder || 'Valeur de l\'immobilisation'}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => {
                showEditAssetDialog = false;
                editingAsset = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              type="button"
              onclick={updateAsset}
              disabled={!assetName || !assetCode || !assetType || !assetAcquisitionDate || assetValuation <= 0}
            >
              <Translate key="save" module="common" fallback="Sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}

    <!-- Dialogue d'édition de créance -->
    {#if editingReceivable}
      <Dialog bind:open={showEditReceivableDialog}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_receivable" module="configuration" fallback="Éditer la créance" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_receivable_description"
                module="configuration"
                fallback="Modifiez les informations de la créance"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="editReceivableEntityType">
                <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
              </Label>
              <Select.Root type="single" bind:value={editingReceivableEntityTypeValue}>
                <Select.Trigger id="editReceivableEntityType">
                  <span data-slot="select-value">
                    {get(i18nStore).resources?.configuration?.[`entity_type_${editingReceivableEntityTypeValue}`] || editingReceivableEntityTypeValue}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="supplier">
                    <Translate key="supplier" module="configuration" fallback="Fournisseur" />
                  </Select.Item>
                  <Select.Item value="customer">
                    <Translate key="customer" module="configuration" fallback="Client" />
                  </Select.Item>
                  <Select.Item value="employee">
                    <Translate key="employee" module="configuration" fallback="Employé" />
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-2">
              <Label for="editReceivableEntityDisplay">
                <Translate key="entity" module="configuration" fallback="Entité" />
              </Label>
              <div id="editReceivableEntityDisplay" class="px-3 py-2 border rounded-md bg-muted">
                {editingReceivable?.tiers_id && getEntityOptions().find(option => option.id === (editingReceivable as any).tiers_id)?.name ||
                (get(i18nStore).resources?.configuration?.select_entity_placeholder || 'Entité non trouvée')}
              </div>
            </div>

            <div class="space-y-2">
              <Label for="editReceivableBalance">
                <Translate key="balance" module="configuration" fallback="Solde" />
              </Label>
              <Input
                id="editReceivableBalance"
                type="number"
                bind:value={editingReceivable.montant_actuel}
                placeholder={get(i18nStore).resources?.configuration?.receivable_balance_placeholder || 'Montant de la créance'}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => {
                showEditReceivableDialog = false;
                editingReceivable = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              type="button"
              onclick={updateReceivable}
              disabled={!editingReceivable.tiers_id || editingReceivable.montant_actuel < 0}
            >
              <Translate key="save" module="common" fallback="Sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}

    <!-- Dialogue d'édition de dette -->
    {#if editingDebt}
      <Dialog bind:open={showEditDebtDialog}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_debt" module="configuration" fallback="Éditer la dette" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_debt_description"
                module="configuration"
                fallback="Modifiez les informations de la dette"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="editDebtEntityType">
                <Translate key="entity_type" module="configuration" fallback="Type d'entité" />
              </Label>
              <Select.Root type="single" bind:value={editingDebtEntityTypeValue}>
                <Select.Trigger id="editDebtEntityType">
                  <span data-slot="select-value">
                    {get(i18nStore).resources?.configuration?.[`entity_type_${editingDebtEntityTypeValue}`] || editingDebtEntityTypeValue}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="supplier">
                    <Translate key="supplier" module="configuration" fallback="Fournisseur" />
                  </Select.Item>
                  <Select.Item value="customer">
                    <Translate key="customer" module="configuration" fallback="Client" />
                  </Select.Item>
                  <Select.Item value="employee">
                    <Translate key="employee" module="configuration" fallback="Employé" />
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-2">
              <Label for="editDebtEntityDisplay">
                <Translate key="entity" module="configuration" fallback="Entité" />
              </Label>
              <div id="editDebtEntityDisplay" class="px-3 py-2 border rounded-md bg-muted">
                {editingDebt?.tiers_id && getEntityOptions().find(option => option.id === (editingDebt as any).tiers_id)?.name ||
                (get(i18nStore).resources?.configuration?.select_entity_placeholder || 'Entité non trouvée')}
              </div>
            </div>

            <div class="space-y-2">
              <Label for="editDebtBalance">
                <Translate key="balance" module="configuration" fallback="Solde" />
              </Label>
              <Input
                id="editDebtBalance"
                type="number"
                bind:value={editingDebt.montant_actuel}
                placeholder={get(i18nStore).resources?.configuration?.debt_balance_placeholder || 'Montant de la dette'}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => {
                showEditDebtDialog = false;
                editingDebt = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              type="button"
              onclick={updateDebt}
              disabled={!editingDebt.tiers_id || editingDebt.montant_actuel < 0}
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
            <!-- Section des immobilisations -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="assets" module="configuration" fallback="Immobilisations" />
                </h3>
                <Badge variant="secondary">
                  OK
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.assets.message}</p>
              {#if validationResults.assets.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.assets.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Section des créances -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="receivables" module="configuration" fallback="Créances" />
                </h3>
                <Badge variant="secondary">
                  OK
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.receivables.message}</p>
              {#if validationResults.receivables.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.receivables.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Section des dettes -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="debts" module="configuration" fallback="Dettes" />
                </h3>
                <Badge variant="secondary">
                  OK
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.debts.message}</p>
              {#if validationResults.debts.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.debts.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Message global -->
            <div class="mt-4 p-3 rounded-lg bg-green-100 text-green-800">
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
            <Button
              onclick={confirmAndSaveConfiguration}
            >
              <Translate key="confirm_and_save" module="configuration" fallback="Confirmer et sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}
  {/if}
</div>