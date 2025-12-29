<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService, type FinanceConfig, type TreasuryConfig, type PaymentMethodConfig, type TreasuryInitialBalanceConfig, type PaymentMethodAPI } from '$lib/services/ConfigurationService';
  import { treasuryService } from '$lib/services/TreasuryService';
  import { paymentMethodService } from '$lib/services/PaymentMethodService';
  import { treasuryInitialStateService } from '$lib/services/TreasuryInitialStateService';
  import { formatCurrency } from '$lib/utils/numbers';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
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
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
        // Charger les données dès que stationId est disponible
        loadData();
      }
      if (data.data?.station) {
        stationInfo = data.data.station;
      }
    });
    return unsubscribe;
  });

  // Données de configuration financière
  let activeTab = $state('treasuries');
  let allTreasuries = $state<TreasuryConfig[]>([]); // Toutes les trésoreries de la base de données
  let treasuries = $state<TreasuryConfig[]>([]); // Trésoreries liées à la station
  let paymentMethods = $state<PaymentMethodConfig[]>([]);

  // États pour les formulaires
  let showAddTreasuryDialog = $state(false);
  let showEditTreasuryDialog = $state(false);
  let showAddPaymentMethodDialog = $state(false);
  let showEditPaymentMethodDialog = $state(false);

  // États du formulaire trésorerie
  let treasuryName = $state('');
  let treasuryType = $state<'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres'>('caisse');
  let treasuryInitialBalance = $state(0);
  let treasuryBankDetails = $state<Record<string, any> | null>(null);
  let treasuryTypeValue = $state<string>('caisse');
  let selectedUnlinkedTreasuryId = $state<string>('');

  // États du formulaire méthode de paiement
  let paymentMethodName = $state('');
  let paymentMethodType = $state('');
  let paymentMethodTreasuryId = $state('');
  let paymentMethodTreasuryIdValue = $state<string>('');
  let paymentMethodActive = $state(true);
  let paymentMethodStatus = $state<string>('active');

  // États pour l'association d'une méthode de paiement existante
  let selectedTreasuryForAssociation = $state<string>('');
  let selectedPaymentMethodForAssociation = $state<string>('');
  let allPaymentMethods = $state<PaymentMethodConfig[]>([]); // Toutes les méthodes de paiement de la base de données

  // États pour l'édition
  let editingTreasury = $state<TreasuryConfig | null>(null);
  let editingTreasuryTypeValue = $state<string>('cash');
  let editingPaymentMethod = $state<PaymentMethodConfig | null>(null);
  let editingPaymentMethodTreasuryIdValue = $state<string>('');
  let editingPaymentMethodStatus = $state<string>('active');

  // État pour suivre les trésoreries partagées
  let sharedTreasuries = $state<Set<string>>(new Set());

  // Fonction pour déterminer les trésoreries partagées
  async function loadSharedTreasuries() {
    try {
      // Pour déterminer les trésoreries partagées, nous devons charger les associations trésorerie-station
      // pour toutes les stations et identifier celles qui apparaissent dans plusieurs stations
      const allStations = await stationService.getStations();

      // Créer un mapping trésorerie -> [stations]
      const treasuryStationsMap = new Map<string, string[]>();

      // Pour chaque station, charger ses associations trésorerie-station
      for (const station of allStations) {
        try {
          const associations = await treasuryService.getTreasuryStationAssociations(station.id);

          for (const association of associations) {
            const treasuryId = association.tresorerie_id;
            const stationId = association.station_id;

            if (!treasuryStationsMap.has(treasuryId)) {
              treasuryStationsMap.set(treasuryId, []);
            }

            treasuryStationsMap.get(treasuryId)!.push(stationId);
          }
        } catch (err) {
          console.error(`Erreur lors du chargement des associations pour la station ${station.id}:`, err);
          // Continuer avec les autres stations
        }
      }

      // Identifier les trésoreries partagées (utilisées par plus d'une station)
      const sharedIds = new Set<string>();
      for (const [treasuryId, stations] of treasuryStationsMap) {
        if (stations.length > 1) {
          sharedIds.add(treasuryId);
        }
      }

      sharedTreasuries = sharedIds;
    } catch (err) {
      console.error('Erreur lors du chargement des stations ou des associations trésorerie-station:', err);
      // On continue avec un ensemble vide en cas d'erreur
      sharedTreasuries = new Set();
    }
  }

  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données financières pour la station:', stationId);
      loading = true;

      if (stationId) {
        // Charger toutes les trésoreries de la base de données
        const allTreasuryData = await treasuryService.getAllTreasuries();

        // Mapper les données pour le format interne
        const allTreasuryConfigs = allTreasuryData.map(t => {
          let bankDetails = undefined;
          if (t.informations_bancaires) {
            try {
              bankDetails = JSON.parse(t.informations_bancaires);
            } catch (e) {
              console.error('Erreur de parsing JSON pour les détails bancaires:', e);
              // Si le parsing échoue, on garde la valeur telle quelle
              bankDetails = t.informations_bancaires;
            }
          }
          return {
            id: t.id,
            name: t.nom,
            type: t.type,
            initial_balance: t.solde_initial,
            solde_tresorerie: t.solde_tresorerie,
            currency: t.devise || undefined,
            bank_details: bankDetails
          };
        });

        // Charger les trésoreries de la station (y compris les soldes initiaux)
        const treasuryData = await treasuryService.getTreasuriesByStation(stationId);

        // Mapper les données pour le format interne
        treasuries = treasuryData.map(t => {
          let bankDetails = undefined;
          if (t.informations_bancaires) {
            try {
              bankDetails = JSON.parse(t.informations_bancaires);
            } catch (e) {
              console.error('Erreur de parsing JSON pour les détails bancaires:', e);
              // Si le parsing échoue, on garde la valeur telle quelle
              bankDetails = t.informations_bancaires;
            }
          }
          return {
            id: t.tresorerie_id,
            name: t.nom_tresorerie,
            type: t.type_tresorerie,
            initial_balance: t.solde_initial_tresorerie || t.solde_initial_station || 0,
            solde_tresorerie: t.solde_tresorerie || 0,
            currency: t.devise || undefined,
            bank_details: bankDetails
          };
        });

        // Mettre à jour l'état avec toutes les trésoreries
        allTreasuries = allTreasuryConfigs;

        // Charger les trésoreries partagées
        await loadSharedTreasuries();

        // Charger toutes les méthodes de paiement de la base de données
        const allPaymentMethodsFromApi = await paymentMethodService.getAllPaymentMethods();
        allPaymentMethods = allPaymentMethodsFromApi.map(pm => ({
          id: pm.id,
          name: pm.nom,
          treasury_id: pm.tresorerie_id || undefined,
          actif: pm.tresorerie_id ? true : false
        }));

        // Pour chaque trésorerie, charger les méthodes de paiement associées
        const allPaymentMethodsForTreasuries = [];
        for (const treasury of treasuries) {
          if (treasury.id) {
            // Charger les méthodes de paiement associées à cette trésorerie
            const treasuryPaymentMethods = await paymentMethodService.getPaymentMethodsByTreasury(treasury.id);

            // Pour chaque méthode de paiement, on suppose qu'elle est active si elle est associée
            // (à moins que le backend ne fournisse l'information d'activation dans la réponse)
            for (const pm of treasuryPaymentMethods) {
              allPaymentMethodsForTreasuries.push({
                id: pm.id,
                name: pm.nom,
                treasury_id: treasury.id!,
                actif: true // On suppose qu'elle est active si elle est associée à une trésorerie
              });
            }
          }
        }
        paymentMethods = allPaymentMethodsForTreasuries;

      } else {
        // Charger les données financières de la station - simulation avec données mockées
        treasuries = generateMockTreasuries();
        paymentMethods = generateMockPaymentMethods();
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données financières:', err);
      error = 'Impossible de charger les données financières: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      treasuries = [];
      paymentMethods = [];
      treasuryBalances = [];
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

      // Vérifier à nouveau la validation avant de sauvegarder
      const validation = validateConfiguration();
      if (!validation.overall.isValid) {
        throw new Error('La configuration ne satisfait pas aux conditions requises');
      }

      // Préparer les données de configuration à sauvegarder
      const configToSave = {
        completion: {
          finances: {
            treasuries: validation.treasuries.isValid,
            payment_methods: validation.payment_methods.isValid,
            overall: validation.overall.isValid
          }
        }
      };

      // Sauvegarder la configuration via le service
      const response = await configurationService.saveStationConfiguration(stationId, configToSave);

      console.log('Configuration financière sauvegardée avec succès pour la station:', stationId);
      console.log(configToSave);

      // Mettre à jour la configuration dans le store global
      configurationStore.updatePart(stationId, 'finances', configToSave.completion.finances);

      // Fermer le dialogue de validation
      showValidationDialog = false;

      // Afficher un message de succès
      toast.success(get(i18nStore).resources?.configuration?.finances_config_saved || 'Configuration financière sauvegardée avec succès');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);
      error = 'Erreur lors de la sauvegarde de la configuration: ' + (err as Error).message;
    }
  }

  // Charger les données au montage
  onMount(() => {
    console.log('Composant finances monté avec stationId:', stationId);

    // Charger les données maintenant que l'ID est disponible via les props
    // ou charger si stationId est disponible plus tard via l'effet
    if (stationId) {
      loadData();
    } else {
      console.log('Aucun ID de station trouvé dans les props, en attente du chargement via l\'effet');
    }
  });

  // Fonction pour ajouter une trésorerie
  async function addTreasury() {
    try {
      if (!treasuryName) {
        throw new Error('Le nom de la trésorerie est requis');
      }

      // Mettre à jour treasuryType avec la valeur sélectionnée
      treasuryType = treasuryTypeValue as 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres';

      // Récupérer la devise depuis localStorage
      const currency = localStorage.getItem('currency') || 'XOF';

      // Convertir la chaîne JSON en objet si c'est une chaîne
      let parsedBankDetails = null;
      if (treasuryBankDetails && typeof treasuryBankDetails === 'string') {
        try {
          parsedBankDetails = JSON.parse(treasuryBankDetails);
        } catch (e) {
          console.error('Erreur de parsing JSON pour les détails bancaires:', e);
          // Si le parsing échoue, on garde la valeur telle quelle
          parsedBankDetails = treasuryBankDetails;
        }
      } else if (treasuryBankDetails && typeof treasuryBankDetails === 'object') {
        // Si c'est déjà un objet, on l'utilise directement
        parsedBankDetails = treasuryBankDetails;
      }

      // Créer l'objet pour l'appel API
      const createData = {
        nom: treasuryName,
        type: treasuryType,
        solde_initial: treasuryInitialBalance, // Utiliser le solde initial saisi dans le formulaire
        devise: currency,
        informations_bancaires: parsedBankDetails ? JSON.stringify(parsedBankDetails) : null
      };

      // Créer la trésorerie via l'API
      const newTreasuryFromApi = await treasuryService.createTreasury(createData);

      // Associer la trésorerie à la station
      if (stationId) {
        await treasuryService.associateTreasuryToStation(newTreasuryFromApi.id, stationId);
      }

      // Crée la configuration de la nouvelle trésorerie
      let newTreasuryBankDetails = undefined;
      if (newTreasuryFromApi.informations_bancaires) {
        try {
          newTreasuryBankDetails = JSON.parse(newTreasuryFromApi.informations_bancaires);
        } catch (e) {
          console.error('Erreur de parsing JSON pour les détails bancaires:', e);
          // Si le parsing échoue, on garde la valeur telle quelle
          newTreasuryBankDetails = newTreasuryFromApi.informations_bancaires;
        }
      }

      const newTreasuryConfig = {
        id: newTreasuryFromApi.id,
        name: newTreasuryFromApi.nom,
        type: newTreasuryFromApi.type,
        initial_balance: newTreasuryFromApi.solde_initial,
        solde_tresorerie: newTreasuryFromApi.solde_tresorerie,
        currency: newTreasuryFromApi.devise || undefined,
        bank_details: newTreasuryBankDetails
      };

      // Mettre à jour les listes
      allTreasuries = [...allTreasuries, newTreasuryConfig];
      treasuries = [...treasuries, newTreasuryConfig];

      // Réinitialiser le formulaire
      showAddTreasuryDialog = false;
      treasuryName = '';
      treasuryType = 'caisse';
      treasuryTypeValue = 'caisse';
      treasuryInitialBalance = 0;
      treasuryBankDetails = '';

      console.log('Trésorerie ajoutée avec succès:', newTreasuryFromApi);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la trésorerie:', err);
      error = 'Impossible d\'ajouter la trésorerie: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier une trésorerie
  async function updateTreasury() {
    try {
      if (!editingTreasury || !editingTreasury.id) {
        throw new Error('Aucune trésorerie à éditer');
      }

      // Récupérer la devise depuis localStorage
      const currency = localStorage.getItem('currency') || 'XOF';

      // Convertir la chaîne JSON en objet si c'est une chaîne
      let parsedBankDetails = null;
      if (treasuryBankDetails && typeof treasuryBankDetails === 'string') {
        try {
          parsedBankDetails = JSON.parse(treasuryBankDetails);
        } catch (e) {
          console.error('Erreur de parsing JSON pour les détails bancaires:', e);
          // Si le parsing échoue, on garde la valeur telle quelle
          parsedBankDetails = treasuryBankDetails;
        }
      } else if (treasuryBankDetails && typeof treasuryBankDetails === 'object') {
        // Si c'est déjà un objet, on l'utilise directement
        parsedBankDetails = treasuryBankDetails;
      }

      // Mettre à jour la trésorerie via l'API
      const updateData = {
        nom: editingTreasury.name,
        type: editingTreasuryTypeValue as 'caisse' | 'banque' | 'mobile_money' | 'note_credit' | 'fonds_divers' | 'autres',
        solde_initial: editingTreasury.initial_balance, // Laisser la valeur existante pour ne pas la perdre
        devise: currency,
        informations_bancaires: parsedBankDetails ? JSON.stringify(parsedBankDetails) : null
      };

      const updatedTreasuryFromApi = await treasuryService.updateTreasury(editingTreasury.id, updateData);

      // Mettre à jour dans les listes
      let updatedTreasuryBankDetails = undefined;
      if (updatedTreasuryFromApi.informations_bancaires) {
        try {
          updatedTreasuryBankDetails = JSON.parse(updatedTreasuryFromApi.informations_bancaires);
        } catch (e) {
          console.error('Erreur de parsing JSON pour les détails bancaires:', e);
          // Si le parsing échoue, on garde la valeur telle quelle
          updatedTreasuryBankDetails = updatedTreasuryFromApi.informations_bancaires;
        }
      }

      const updatedTreasuryConfig = {
        id: updatedTreasuryFromApi.id,
        name: updatedTreasuryFromApi.nom,
        type: updatedTreasuryFromApi.type,
        initial_balance: updatedTreasuryFromApi.solde_initial,
        solde_tresorerie: updatedTreasuryFromApi.solde_tresorerie,
        currency: updatedTreasuryFromApi.devise || undefined,
        bank_details: updatedTreasuryBankDetails
      };

      allTreasuries = allTreasuries.map(t =>
        t.id === editingTreasury!.id ? updatedTreasuryConfig : t
      );

      treasuries = treasuries.map(t =>
        t.id === editingTreasury!.id ? updatedTreasuryConfig : t
      );

      // Fermer la boîte de dialogue
      showEditTreasuryDialog = false;
      editingTreasury = null;

      console.log('Trésorerie mise à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la trésorerie:', err);
      error = 'Impossible de mettre à jour la trésorerie: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer une trésorerie
  async function removeTreasury(treasuryId: string) {
    try {
      // Vérifier si la trésorerie est utilisée par une méthode de paiement
      const usedByPaymentMethod = paymentMethods.some(pm => pm.treasury_id === treasuryId);
      if (usedByPaymentMethod) {
        throw new Error('Impossible de supprimer cette trésorerie car elle est utilisée par une méthode de paiement');
      }

      // Supprimer la trésorerie via l'API
      await treasuryService.deleteTreasury(treasuryId);

      // Retirer des listes
      allTreasuries = allTreasuries.filter(t => t.id !== treasuryId);
      treasuries = treasuries.filter(t => t.id !== treasuryId);

      console.log('Trésorerie supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la trésorerie:', err);
      error = 'Impossible de supprimer la trésorerie: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'une trésorerie
  function prepareEditTreasury(treasury: TreasuryConfig) {
    editingTreasury = { ...treasury };
    editingTreasuryTypeValue = treasury.type;
    treasuryTypeValue = treasury.type;
    // Convertir les détails bancaires en chaîne JSON pour l'affichage dans la textarea
    if (treasury.bank_details) {
      treasuryBankDetails = JSON.stringify(treasury.bank_details, null, 2); // Formatage avec indentation
    } else {
      treasuryBankDetails = null;
    }
    showEditTreasuryDialog = true;
  }

  // Fonction pour ajouter une méthode de paiement
  async function addPaymentMethod() {
    try {
      if (!paymentMethodName || !paymentMethodTreasuryIdValue) {
        throw new Error('Le nom et la trésorerie de la méthode de paiement sont requis');
      }

      // Mettre à jour les propriétés avec les valeurs des selects
      paymentMethodTreasuryId = paymentMethodTreasuryIdValue;
      paymentMethodActive = paymentMethodStatus === 'active';

      // Créer l'objet pour l'appel API
      const createData = {
        nom: paymentMethodName,
        type_paiement: paymentMethodType,
        trésorerie_id: paymentMethodTreasuryIdValue
      };

      // Créer la méthode de paiement via l'API
      const newPaymentMethodFromApi = await paymentMethodService.createPaymentMethod(createData);

      // Associer la méthode de paiement à la trésorerie via l'API d'association
      if (newPaymentMethodFromApi.id && paymentMethodTreasuryIdValue) {
        await paymentMethodService.associatePaymentMethodToTreasury({
          tresorerie_id: paymentMethodTreasuryIdValue,
          methode_paiement_id: newPaymentMethodFromApi.id,
          actif: true
        });
      }

      // Créer l'objet de la nouvelle méthode de paiement pour l'interface
      const newPaymentMethod: PaymentMethodConfig = {
        id: newPaymentMethodFromApi.id,
        name: newPaymentMethodFromApi.nom,
        treasury_id: paymentMethodTreasuryIdValue,
        actif: true
      };

      // Ajouter à la liste
      paymentMethods = [...paymentMethods, newPaymentMethod];

      // Réinitialiser le formulaire
      showAddPaymentMethodDialog = false;
      paymentMethodName = '';
      paymentMethodTreasuryId = '';
      paymentMethodTreasuryIdValue = '';
      paymentMethodActive = true;
      paymentMethodStatus = 'active';

      console.log('Méthode de paiement ajoutée avec succès:', newPaymentMethod);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la méthode de paiement:', err);
      error = 'Impossible d\'ajouter la méthode de paiement: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier une méthode de paiement
  async function updatePaymentMethod() {
    try {
      if (!editingPaymentMethod || !editingPaymentMethod.id) {
        throw new Error('Aucune méthode de paiement à éditer');
      }

      // Mettre à jour la méthode de paiement via l'API
      const updateData = {
        nom: editingPaymentMethod.name || '',
        type_paiement: paymentMethodType || 'autre', // Utiliser le type du formulaire ou 'autre' par défaut
        trésorerie_id: editingPaymentMethodTreasuryIdValue
      };

      const updatedPaymentMethodFromApi = await paymentMethodService.updatePaymentMethod(editingPaymentMethod.id, updateData);

      // Mettre à jour la méthode de paiement dans la liste
      const updatedId = editingPaymentMethod.id;
      const updatedTreasuryId = editingPaymentMethodTreasuryIdValue;
      const updatedIsActive = editingPaymentMethodStatus === 'active';
      const updatedPaymentMethod = {
        id: updatedPaymentMethodFromApi.id,
        name: updatedPaymentMethodFromApi.nom,
        treasury_id: updatedTreasuryId,
        actif: updatedIsActive
      };

      paymentMethods = paymentMethods.map(pm =>
        pm.id === updatedId
          ? updatedPaymentMethod
          : pm
      );

      // Fermer la boîte de dialogue
      showEditPaymentMethodDialog = false;
      editingPaymentMethod = null;

      console.log('Méthode de paiement mise à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la méthode de paiement:', err);
      error = 'Impossible de mettre à jour la méthode de paiement: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer une méthode de paiement
  async function removePaymentMethod(paymentMethodId: string) {
    try {
      // Supprimer la méthode de paiement via l'API
      await paymentMethodService.deletePaymentMethod(paymentMethodId);

      // Retirer la méthode de paiement de la liste
      paymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethodId);

      console.log('Méthode de paiement supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la méthode de paiement:', err);
      error = 'Impossible de supprimer la méthode de paiement: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'une méthode de paiement
  function prepareEditPaymentMethod(paymentMethod: PaymentMethodConfig) {
    editingPaymentMethod = { ...paymentMethod };
    editingPaymentMethodTreasuryIdValue = paymentMethod.treasury_id;
    editingPaymentMethodStatus = paymentMethod.actif ? 'active' : 'inactive';
    // Initialiser paymentMethodType avec une valeur par défaut ou vide
    // Pour l'instant, on suppose que le type n'est pas disponible dans l'objet initial
    // On pourrait enrichir l'objet PaymentMethodConfig pour inclure le type
    paymentMethodType = '';
    showEditPaymentMethodDialog = true;
  }

  // Fonction pour associer une trésorerie existante à la station
  async function addExistingTreasury() {
    try {
      if (!selectedUnlinkedTreasuryId || !stationId) {
        throw new Error('Aucune trésorerie sélectionnée ou ID de station manquant');
      }

      // Associer la trésorerie existante à la station via l'API
      await treasuryService.associateTreasuryToStation(selectedUnlinkedTreasuryId, stationId);

      // Récupérer la trésorerie associée pour la mettre à jour dans la liste
      const associatedTreasury = allTreasuries.find(t => t.id === selectedUnlinkedTreasuryId);

      if (associatedTreasury) {
        // Ajouter la trésorerie à la liste des trésoreries de la station
        treasuries = [...treasuries, associatedTreasury];
      }

      // Réinitialiser la sélection
      selectedUnlinkedTreasuryId = '';

      console.log('Trésorerie existante ajoutée à la station avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la trésorerie existante:', err);
      error = 'Impossible d\'ajouter la trésorerie existante: ' + (err as Error).message;
    }
  }

  // Fonction pour filtrer les trésoreries non liées à la station
  function getUnlinkedTreasuries(): TreasuryConfig[] {
    const linkedTreasuryIds = new Set(treasuries.map(t => t.id).filter(Boolean));
    return allTreasuries.filter(t => !linkedTreasuryIds.has(t.id || ''));
  }

  // Fonction pour filtrer les méthodes de paiement non liées à une trésorerie spécifique
  function getUnlinkedPaymentMethodsForTreasury(treasuryId: string): PaymentMethodConfig[] {
    // Récupérer les méthodes de paiement déjà liées à cette trésorerie
    const linkedPaymentMethodIds = new Set(
      paymentMethods
        .filter(pm => pm.treasury_id === treasuryId)
        .map(pm => pm.id)
        .filter(Boolean) // Filtrer les IDs nuls ou undefined
    );

    // Retourner les méthodes de paiement non liées à cette trésorerie
    return allPaymentMethods.filter(pm => !linkedPaymentMethodIds.has(pm.id || ''));
  }

  // Fonction pour associer une méthode de paiement existante à une trésorerie
  async function addExistingPaymentMethodToTreasury() {
    try {
      if (!selectedTreasuryForAssociation || !selectedPaymentMethodForAssociation) {
        throw new Error('Trésorerie et méthode de paiement sont requis pour l\'association');
      }

      // Vérifier que la méthode de paiement n'est pas déjà liée à cette trésorerie
      const existingAssociation = paymentMethods.find(
        pm => pm.id === selectedPaymentMethodForAssociation && pm.treasury_id === selectedTreasuryForAssociation
      );

      if (existingAssociation) {
        throw new Error('Cette méthode de paiement est déjà liée à cette trésorerie');
      }

      // Effectuer l'association via l'API
      const associationData = {
        tresorerie_id: selectedTreasuryForAssociation,
        methode_paiement_id: selectedPaymentMethodForAssociation,
        actif: true
      };

      const response = await paymentMethodService.associatePaymentMethodToTreasury(associationData);

      // Mettre à jour la liste des méthodes de paiement
      const newPaymentMethod: PaymentMethodConfig = {
        id: selectedPaymentMethodForAssociation,
        name: allPaymentMethods.find(pm => pm.id === selectedPaymentMethodForAssociation)?.name || 'Méthode inconnue',
        treasury_id: selectedTreasuryForAssociation,
        actif: true
      };

      paymentMethods = [...paymentMethods, newPaymentMethod];

      // Réinitialiser les sélections
      selectedTreasuryForAssociation = '';
      selectedPaymentMethodForAssociation = '';

      console.log('Méthode de paiement associée à la trésorerie avec succès');
      toast.success(get(i18nStore).resources?.configuration?.payment_method_associated || 'Méthode de paiement associée avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'association de la méthode de paiement:', err);
      error = 'Impossible d\'associer la méthode de paiement: ' + (err as Error).message;
      toast.error(get(i18nStore).resources?.configuration?.payment_method_association_error || 'Erreur lors de l\'association de la méthode de paiement');
    }
  }

  // Fonction pour grouper les méthodes de paiement par trésorerie
  function groupPaymentMethodsByTreasury(): Record<string, PaymentMethodConfig[]> {
    const grouped: Record<string, PaymentMethodConfig[]> = {};

    for (const treasury of treasuries) {
      if (treasury.id) {
        grouped[treasury.id] = [];
      }
    }

    for (const method of paymentMethods) {
      if (method.treasury_id && grouped[method.treasury_id]) {
        grouped[method.treasury_id].push(method);
      }
    }

    return grouped;
  }


  // Fonction pour modifier un solde initial
  async function updateTreasuryBalance() {
    try {
      if (!editingBalance || !editingBalance.id) {
        throw new Error('Aucun solde à éditer');
      }

      // Pour la mise à jour, nous devons d'abord récupérer l'association trésorerie-station
      const treasuryStationAssociations = await treasuryService.getTreasuryStationAssociations(stationId);
      const treasuryAssociation = treasuryStationAssociations.find(assoc => assoc.trésorerie_id === editingBalanceTreasuryIdValue);

      if (!treasuryAssociation) {
        throw new Error('Impossible de trouver l\'association trésorerie-station correspondante');
      }

      // Mettre à jour l'état initial via l'API
      const updateData = {
        date_enregistrement: new Date().toISOString(),
        montant: editingBalance.initial_balance || 0,
        commentaire: null, // Optionnel
        enregistre_par: '00000000-0000-0000-0000-000000000000' // Remplacer par le vrai ID utilisateur
      };

      const updatedInitialStateFromApi = await treasuryInitialStateService.updateInitialState(editingBalance.id, updateData);

      // Mettre à jour le solde dans la liste
      const updatedId = editingBalance.id;
      const updatedTreasuryId = editingBalanceTreasuryIdValue;
      const updatedBalance = {
        id: updatedInitialStateFromApi.id,
        treasury_id: updatedTreasuryId,
        initial_balance: editingBalance.initial_balance || 0
      };

      treasuryBalances = treasuryBalances.map(b =>
        b.id === updatedId
          ? updatedBalance
          : b
      );

      // Mettre à jour aussi l'objet trésorerie dans la liste des trésoreries pour refléter le nouveau solde initial
      treasuries = treasuries.map(t =>
        t.id === updatedTreasuryId
          ? { ...t, initial_balance: editingBalance.initial_balance || 0 }
          : t
      );

      // Fermer la boîte de dialogue
      showEditBalanceDialog = false;
      editingBalance = null;

      console.log('Solde initial mis à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour du solde initial:', err);
      error = 'Impossible de mettre à jour le solde initial: ' + (err as Error).message;
    }
  }



  // Fonction pour obtenir une trésorerie par ID
  function getTreasuryById(id: string) {
    return treasuries.find(t => t.id === id);
  }

  // États pour le dialogue de validation de la configuration
  let showValidationDialog = $state(false);
  let validationResults = $state<any>(null);

  // Fonction de validation globale de la configuration financière
  function validateConfiguration() {
    const validation = {
      treasuries: { isValid: false, message: '', details: [] as string[] },
      payment_methods: { isValid: false, message: '', details: [] as string[] },
      overall: { isValid: false, message: '' }
    };

    // Validation des trésoreries
    if (treasuries.length === 0) {
      validation.treasuries.isValid = false;
      validation.treasuries.message = 'Aucune trésorerie configurée';
      validation.treasuries.details = ['Veuillez ajouter au moins une trésorerie'];
    } else {
      validation.treasuries.isValid = true;
      validation.treasuries.message = `${treasuries.length} trésorerie(s) configurée(s)`;
      validation.treasuries.details = treasuries.map(treasury =>
        `${treasury.name} (${get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type})`
      );
    }

    // Validation des méthodes de paiement par trésorerie
    const groupedPaymentMethods = groupPaymentMethodsByTreasury();
    const treasuriesWithoutPaymentMethods = treasuries.filter(treasury => {
      if (!treasury.id) return true;
      const treasuryPaymentMethods = groupedPaymentMethods[treasury.id];
      return !treasuryPaymentMethods || treasuryPaymentMethods.length === 0;
    });

    if (treasuriesWithoutPaymentMethods.length === 0) {
      validation.payment_methods.isValid = true;
      validation.payment_methods.message = 'Toutes les trésoreries ont au moins une méthode de paiement';
      validation.payment_methods.details = treasuries.map(treasury => {
        if (treasury.id) {
          const treasuryPaymentMethods = groupedPaymentMethods[treasury.id];
          return `${treasury.name}: ${treasuryPaymentMethods?.length || 0} méthode(s) de paiement`;
        }
        return `${treasury.name}: 0 méthode de paiement`;
      });
    } else {
      validation.payment_methods.isValid = false;
      validation.payment_methods.message = `${treasuriesWithoutPaymentMethods.length} trésorerie(s) sans méthode de paiement`;
      validation.payment_methods.details = treasuriesWithoutPaymentMethods.map(treasury =>
        `${treasury.name} (${get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type}): aucune méthode de paiement`
      );
    }

    // Validation globale
    validation.overall.isValid = validation.treasuries.isValid && validation.payment_methods.isValid;

    if (validation.overall.isValid) {
      validation.overall.message = 'Configuration complète';
    } else {
      const issues = [];
      if (!validation.treasuries.isValid) issues.push('trésoreries requises');
      if (!validation.payment_methods.isValid) issues.push('méthodes de paiement manquantes');
      validation.overall.message = `Configuration incomplète: ${issues.join(' et ')}`;
    }

    return validation;
  }

  console.log('Composant finances monté');
</script>

<div class="space-y-6">
  <!-- Carte d'identification de la station -->
  {#if stationInfo}
    <Card class="border-primary/30 bg-primary/5">
      <CardHeader class="flex flex-row items-center justify-between space-x-4">
        <div class="flex flex-row items-center space-x-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
            💰
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
      <Translate key="finance_setup" module="configuration" fallback="Configuration Financière" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="treasury_payment_setup"
        module="configuration"
        fallback="Configurez les trésoreries, méthodes de paiement et soldes initiaux"
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
              <Translate key="financial_config" module="configuration" fallback="Configuration Financière" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="manage_finances"
                module="configuration"
                fallback="Gérez les trésoreries, méthodes de paiement et soldes initiaux de votre station"
              />
            </CardDescription>
          </div>
          <Button onclick={() => saveConfiguration()}>
            <Translate key="save_configuration" module="configuration" fallback="Sauvegarder" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs bind:value={activeTab} class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="treasuries">
              <Translate key="treasuries" module="configuration" fallback="Trésoreries" />
            </TabsTrigger>
            <TabsTrigger value="payment_methods">
              <Translate key="payment_methods" module="configuration" fallback="Méthodes de Paiement" />
            </TabsTrigger>
            <TabsTrigger value="associate-payment-method">
              <Translate key="associate_payment_method" module="configuration" fallback="Associer une Méthode" />
            </TabsTrigger>
          </TabsList>

          <!-- Onglet Trésoreries -->
          <TabsContent value="treasuries" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="treasuries" module="configuration" fallback="Trésoreries" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_treasuries"
                        module="configuration"
                        fallback="Gérez les différentes trésoreries de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddTreasuryDialog}>
                    <DialogTrigger>
                      <Button>
                        <Translate key="add_treasury" module="configuration" fallback="Ajouter une Trésorerie" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_treasury" module="configuration" fallback="Ajouter une Trésorerie" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_treasury_description"
                            module="configuration"
                            fallback="Entrez les informations de la nouvelle trésorerie"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-4 py-4">
                        <!-- Option pour créer une nouvelle trésorerie -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="create_new_treasury" module="configuration" fallback="Créer une nouvelle trésorerie" />
                          </h3>

                          <div class="space-y-2">
                            <Label for="treasuryName">
                              <Translate key="name" module="common" fallback="Nom" />
                            </Label>
                            <Input
                              id="treasuryName"
                              bind:value={treasuryName}
                              autocomplete="one-time-code"
                              placeholder={get(i18nStore).resources?.configuration?.treasury_name || 'Nom de la trésorerie'}
                            />
                          </div>

                          <div class="space-y-2">
                            <Label for="treasuryType">
                              <Translate key="type" module="common" fallback="Type" />
                            </Label>
                            <Select.Root type="single" bind:value={treasuryTypeValue}>
                              <Select.Trigger id="treasuryType">
                                <span data-slot="select-value">
                                  {treasuryTypeValue
                                    ? (get(i18nStore).resources?.configuration?.[`treasury_type_${treasuryTypeValue}`] ||
                                       (treasuryTypeValue === 'caisse' ? (get(i18nStore).resources?.configuration?.caisse || 'Caisse') :
                                        treasuryTypeValue === 'banque' ? (get(i18nStore).resources?.configuration?.banque || 'Banque') :
                                        treasuryTypeValue === 'mobile_money' ? (get(i18nStore).resources?.configuration?.mobile_money || 'Mobile Money') :
                                        treasuryTypeValue === 'note_credit' ? (get(i18nStore).resources?.configuration?.note_credit || 'Note de crédit') :
                                        treasuryTypeValue === 'fonds_divers' ? (get(i18nStore).resources?.configuration?.fonds_divers || 'Fonds divers') :
                                        (get(i18nStore).resources?.configuration?.autres || 'Autres')))
                                    : get(i18nStore).resources?.configuration?.select_treasury_type || 'Sélectionnez un type'}
                                </span>
                              </Select.Trigger>
                              <Select.Content>
                                <Select.Item value="caisse">
                                  <Translate key="caisse" module="configuration" fallback="Caisse" />
                                </Select.Item>
                                <Select.Item value="banque">
                                  <Translate key="banque" module="configuration" fallback="Banque" />
                                </Select.Item>
                                <Select.Item value="mobile_money">
                                  <Translate key="mobile_money" module="configuration" fallback="Mobile Money" />
                                </Select.Item>
                                <Select.Item value="note_credit">
                                  <Translate key="note_credit" module="configuration" fallback="Note de crédit" />
                                </Select.Item>
                                <Select.Item value="fonds_divers">
                                  <Translate key="fonds_divers" module="configuration" fallback="Fonds divers" />
                                </Select.Item>
                                <Select.Item value="autres">
                                  <Translate key="autres" module="configuration" fallback="Autres" />
                                </Select.Item>
                              </Select.Content>
                            </Select.Root>
                          </div>

                          <div class="space-y-2">
                            <Label for="treasuryInitialBalance">
                              <Translate key="initial_balance" module="configuration" fallback="Solde initial" />
                            </Label>
                            <Input
                              id="treasuryInitialBalance"
                              type="number"
                              bind:value={treasuryInitialBalance}
                              placeholder={get(i18nStore).resources?.configuration?.initial_balance_placeholder || 'Solde initial de la trésorerie'}
                            />
                          </div>

                          <div class="space-y-2">
                            <Label for="treasuryBankDetails">
                              <Translate key="bank_details" module="configuration" fallback="Détails bancaires" />
                            </Label>
                            <Input
                              id="treasuryBankDetails"
                              class="w-full p-2 border rounded-md"
                              bind:value={treasuryBankDetails}
                              autocomplete="one-time-code"
                              placeholder={get(i18nStore).resources?.configuration?.bank_details_placeholder || 'IBAN, nom de la banque, etc.'}
                            />
                          </div>

                          <Button
                            onclick={addTreasury}
                            disabled={!treasuryName}
                            class="w-full"
                          >
                            <Translate key="add_new_treasury" module="configuration" fallback="Ajouter une nouvelle" />
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

                        <!-- Option pour ajouter une trésorerie existante -->
                        <div class="space-y-4">
                          <h3 class="text-lg font-medium">
                            <Translate key="add_existing_treasury" module="configuration" fallback="Ajouter une trésorerie existante" />
                          </h3>

                          <div class="space-y-2">
                            <Select.Root type="single" bind:value={selectedUnlinkedTreasuryId}>
                              <Select.Trigger>
                                <span data-slot="select-value">
                                  {selectedUnlinkedTreasuryId
                                    ? getUnlinkedTreasuries().find(t => t.id === selectedUnlinkedTreasuryId)?.name
                                    : get(i18nStore).resources?.configuration?.select_unlinked_treasury || 'Sélectionner une trésorerie non liée'}
                                </span>
                              </Select.Trigger>
                              <Select.Content>
                                {#each getUnlinkedTreasuries() as treasury}
                                  <Select.Item value={treasury.id}>
                                    {treasury.name} ({treasury.type})
                                  </Select.Item>
                                {/each}
                              </Select.Content>
                            </Select.Root>
                            <Button
                              onclick={addExistingTreasury}
                              disabled={!selectedUnlinkedTreasuryId}
                              class="w-full"
                            >
                              <Translate key="add_existing_treasury_to_station" module="configuration" fallback="Ajouter à la station" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddTreasuryDialog = false;
                            treasuryName = '';
                            treasuryType = 'caisse';
                            treasuryTypeValue = 'caisse';
                            treasuryBankDetails = '';
                            selectedUnlinkedTreasuryId = '';
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
                  {#each treasuries as treasury (treasury.id)}
                    <Card class="p-4">
                      <div class="grid grid-cols-5 gap-4 items-center">
                        <div>
                          <Label>
                            <Translate key="name" module="common" fallback="Nom" />
                          </Label>
                          <p class="font-medium">{treasury.name}</p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="type" module="common" fallback="Type" />
                          </Label>
                          <p>{get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type}</p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="current_balance" module="configuration" fallback="Solde de la trésorerie" />
                          </Label>
                          <p class="font-medium">{formatCurrency(treasury.solde_tresorerie) ?? 'N/A'}</p>
                        </div>
                        <div>
                          <Label>
                            <Translate key="bank_details" module="configuration" fallback="Détails bancaires" />
                          </Label>
                          <p class="font-medium">{treasury.bank_details ?
                            typeof treasury.bank_details === 'object' ?
                              JSON.stringify(treasury.bank_details) :
                              treasury.bank_details
                            : (get(i18nStore).resources?.configuration?.no_bank_details || 'Aucun détail')}</p>
                        </div>
                        <div class="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onclick={() => prepareEditTreasury(treasury)}
                          >
                            <Translate key="edit" module="common" fallback="Éditer" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            class="text-destructive border-destructive"
                            onclick={() => removeTreasury(treasury.id!)}
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
          <!-- Onglet Méthodes de Paiement -->
          <TabsContent value="payment_methods" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      <Translate key="payment_methods" module="configuration" fallback="Méthodes de Paiement" />
                    </CardTitle>
                    <CardDescription>
                      <Translate
                        key="manage_payment_methods"
                        module="configuration"
                        fallback="Gérez les différentes méthodes de paiement de votre station"
                      />
                    </CardDescription>
                  </div>
                  <Dialog bind:open={showAddPaymentMethodDialog}>
                    <DialogTrigger>
                      <Button>
                        <Translate key="add_payment_method" module="configuration" fallback="Ajouter une Méthode" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          <Translate key="add_payment_method" module="configuration" fallback="Ajouter une Méthode" />
                        </DialogTitle>
                        <DialogDescription>
                          <Translate
                            key="add_payment_method_description"
                            module="configuration"
                            fallback="Entrez les informations de la nouvelle méthode de paiement"
                          />
                        </DialogDescription>
                      </DialogHeader>
                      <div class="space-y-4 py-4">
                        <div class="space-y-2">
                          <Label for="paymentMethodName">
                            <Translate key="name" module="common" fallback="Nom" />
                          </Label>
                          <Input
                            id="paymentMethodName"
                            bind:value={paymentMethodName}
                            autocomplete="one-time-code"
                            placeholder={get(i18nStore).resources?.configuration?.payment_method_name || 'Nom de la méthode de paiement'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="paymentMethodType">
                            <Translate key="payment_method_type" module="configuration" fallback="Type de méthode de paiement" />
                          </Label>
                          <Input
                            id="paymentMethodType"
                            bind:value={paymentMethodType}
                            autocomplete="one-time-code"
                            placeholder={get(i18nStore).resources?.configuration?.payment_method_type_placeholder || 'Type de paiement (ex: Carte Carburant, Carte Bancaire)'}
                          />
                        </div>

                        <div class="space-y-2">
                          <Label for="paymentMethodTreasuryId">
                            <Translate key="treasury" module="configuration" fallback="Trésorerie" />
                          </Label>
                          <Select.Root type="single" bind:value={paymentMethodTreasuryIdValue}>
                            <Select.Trigger id="paymentMethodTreasuryId">
                              <span data-slot="select-value">
                                {treasuries.length > 0
                                  ? (paymentMethodTreasuryIdValue && paymentMethodTreasuryIdValue !== ''
                                    ? treasuries.find(t => t.id && t.id === paymentMethodTreasuryIdValue)?.name || 'Trésorerie inconnue'
                                    : get(i18nStore).resources?.configuration?.select_treasury || 'Sélectionnez une trésorerie')
                                  : get(i18nStore).resources?.configuration?.loading_treasuries || 'Chargement...'}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              {#if treasuries.length > 0}
                                {#each treasuries as treasury (treasury.id)}
                                  {#if treasury.id && treasury.id !== ''}
                                    <Select.Item value={treasury.id}>
                                      {treasury.name} ({get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type})
                                    </Select.Item>
                                  {/if}
                                {/each}
                              {:else}
                                <Select.Item value="" disabled={true}>
                                  {get(i18nStore).resources?.configuration?.no_treasuries_available || 'Aucune trésorerie disponible'}
                                </Select.Item>
                              {/if}
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <div class="space-y-2">
                          <Label for="paymentMethodActive">
                            <Translate key="status" module="common" fallback="Statut" />
                          </Label>
                          <Select.Root type="single" bind:value={paymentMethodStatus}>
                            <Select.Trigger>
                              <span data-slot="select-value">
                                {paymentMethodStatus === 'active'
                                  ? get(i18nStore).resources?.configuration?.active || 'Actif'
                                  : get(i18nStore).resources?.configuration?.inactive || 'Inactif'}
                              </span>
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="active">
                                <Translate key="active" module="configuration" fallback="Actif" />
                              </Select.Item>
                              <Select.Item value="inactive">
                                <Translate key="inactive" module="configuration" fallback="Inactif" />
                              </Select.Item>
                            </Select.Content>
                          </Select.Root>
                        </div>
                      </div>

                      <div class="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onclick={() => {
                            showAddPaymentMethodDialog = false;
                            paymentMethodName = '';
                            paymentMethodType = '';
                            paymentMethodTreasuryId = '';
                            paymentMethodActive = true;
                            paymentMethodStatus = 'active';
                          }}
                        >
                          <Translate key="cancel" module="common" fallback="Annuler" />
                        </Button>
                        <Button
                          onclick={addPaymentMethod}
                          disabled={!paymentMethodName || !paymentMethodTreasuryIdValue}
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
                  {#each treasuries as treasury (treasury.id)}
                    {#if treasury.id}
                      <div>
                        <h3 class="text-lg font-semibold mb-3">{treasury.name} ({get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type})</h3>
                        <div class="space-y-3">
                          {#each groupPaymentMethodsByTreasury()[treasury.id] as method (method.id)}
                            <Card class="p-4">
                              <div class="grid grid-cols-4 gap-4 items-center">
                                <div>
                                  <Label>
                                    <Translate key="name" module="common" fallback="Nom" />
                                  </Label>
                                  <p class="font-medium">{method.name}</p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="treasury" module="configuration" fallback="Trésorerie" />
                                  </Label>
                                  <p>{getTreasuryById(method.treasury_id)?.name || 'Trésorerie inconnue'}</p>
                                </div>
                                <div>
                                  <Label>
                                    <Translate key="status" module="common" fallback="Statut" />
                                  </Label>
                                  <Badge variant={method.actif ? "default" : "secondary"}>
                                    {method.actif
                                      ? get(i18nStore).resources?.configuration?.active || 'Actif'
                                      : get(i18nStore).resources?.configuration?.inactive || 'Inactif'}
                                  </Badge>
                                </div>
                                <div class="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => prepareEditPaymentMethod(method)}
                                  >
                                    <Translate key="edit" module="common" fallback="Éditer" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    class="text-destructive border-destructive"
                                    onclick={() => removePaymentMethod(method.id!)}
                                  >
                                    <Translate key="delete" module="common" fallback="Supprimer" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          {/each}
                          {#if groupPaymentMethodsByTreasury()[treasury.id].length === 0}
                            <p class="text-sm text-muted-foreground italic">
                              <Translate key="no_payment_methods" module="configuration" fallback="Aucune méthode de paiement configurée pour cette trésorerie" />
                            </p>
                          {/if}
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <!-- Onglet Associer une Méthode de Paiement -->
          <TabsContent value="associate-payment-method" class="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Translate key="associate_payment_method" module="configuration" fallback="Associer une Méthode de Paiement" />
                </CardTitle>
                <CardDescription>
                  <Translate
                    key="associate_payment_method_description"
                    module="configuration"
                    fallback="Associez une méthode de paiement existante à une trésorerie"
                  />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Sélection de la trésorerie -->
                    <div class="space-y-2">
                      <Label for="treasury-select">
                        <Translate key="treasury" module="configuration" fallback="Trésorerie" />
                      </Label>
                      <Select.Root type="single" bind:value={selectedTreasuryForAssociation}>
                        <Select.Trigger id="treasury-select">
                          <span data-slot="select-value">
                            {selectedTreasuryForAssociation
                              ? treasuries.find(t => t.id === selectedTreasuryForAssociation)?.name || 'Trésorerie inconnue'
                              : (get(i18nStore).resources?.configuration?.select_treasury || 'Sélectionnez une trésorerie')}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          {#each treasuries as treasury (treasury.id)}
                            <Select.Item value={treasury.id || ''}>
                              {treasury.name}
                            </Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <!-- Sélection de la méthode de paiement -->
                    <div class="space-y-2">
                      <Label for="payment-method-select">
                        <Translate key="payment_method" module="configuration" fallback="Méthode de Paiement" />
                      </Label>
                      <Select.Root
                        type="single"
                        bind:value={selectedPaymentMethodForAssociation}
                        disabled={!selectedTreasuryForAssociation}
                      >
                        <Select.Trigger id="payment-method-select">
                          <span data-slot="select-value">
                            {selectedPaymentMethodForAssociation
                              ? allPaymentMethods.find(pm => pm.id === selectedPaymentMethodForAssociation)?.name || 'Méthode inconnue'
                              : (get(i18nStore).resources?.configuration?.select_payment_method || 'Sélectionnez une méthode')}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          {#if selectedTreasuryForAssociation}
                            {#each getUnlinkedPaymentMethodsForTreasury(selectedTreasuryForAssociation) as paymentMethod (paymentMethod.id)}
                              <Select.Item value={paymentMethod.id || ''}>
                                {paymentMethod.name}
                              </Select.Item>
                            {/each}
                          {/if}
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </div>

                  <div class="flex justify-end">
                    <Button
                      onclick={addExistingPaymentMethodToTreasury}
                      disabled={!selectedTreasuryForAssociation || !selectedPaymentMethodForAssociation}
                    >
                      <Translate key="associate" module="configuration" fallback="Associer" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <!-- Dialogue d'édition de trésorerie -->
    {#if editingTreasury}
      <Dialog bind:open={showEditTreasuryDialog}>
        <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_treasury" module="configuration" fallback="Éditer la Trésorerie" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_treasury_description"
                module="configuration"
                fallback="Modifiez les informations de la trésorerie"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="editTreasuryName">
                <Translate key="name" module="common" fallback="Nom" />
              </Label>
              <Input
                id="editTreasuryName"
                bind:value={editingTreasury.name}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.treasury_name || 'Nom de la trésorerie'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editTreasuryType">
                <Translate key="type" module="common" fallback="Type" />
              </Label>
              <Select.Root type="single" bind:value={editingTreasuryTypeValue}>
                <Select.Trigger id="editTreasuryType">
                  <span data-slot="select-value">
                    {editingTreasuryTypeValue
                      ? (get(i18nStore).resources?.configuration?.[`treasury_type_${editingTreasuryTypeValue}`] ||
                         editingTreasuryTypeValue === 'caisse' ? (get(i18nStore).resources?.configuration?.caisse || 'Caisse') :
                         editingTreasuryTypeValue === 'banque' ? (get(i18nStore).resources?.configuration?.banque || 'Banque') :
                         editingTreasuryTypeValue === 'mobile_money' ? (get(i18nStore).resources?.configuration?.mobile_money || 'Mobile Money') :
                         editingTreasuryTypeValue === 'note_credit' ? (get(i18nStore).resources?.configuration?.note_credit || 'Note de crédit') :
                         editingTreasuryTypeValue === 'fonds_divers' ? (get(i18nStore).resources?.configuration?.fonds_divers || 'Fonds divers') :
                         (get(i18nStore).resources?.configuration?.autres || 'Autres'))
                      : 'Sélectionnez un type'}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="caisse">
                    <Translate key="caisse" module="configuration" fallback="Caisse" />
                  </Select.Item>
                  <Select.Item value="banque">
                    <Translate key="banque" module="configuration" fallback="Banque" />
                  </Select.Item>
                  <Select.Item value="mobile_money">
                    <Translate key="mobile_money" module="configuration" fallback="Mobile Money" />
                  </Select.Item>
                  <Select.Item value="note_credit">
                    <Translate key="note_credit" module="configuration" fallback="Note de crédit" />
                  </Select.Item>
                  <Select.Item value="fonds_divers">
                    <Translate key="fonds_divers" module="configuration" fallback="Fonds divers" />
                  </Select.Item>
                  <Select.Item value="autres">
                    <Translate key="autres" module="configuration" fallback="Autres" />
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>



            {#if editingTreasury && !sharedTreasuries.has(editingTreasury.id)}
            <div class="space-y-2">
              <Label for="editTreasuryInitialBalance">
                <Translate key="initial_balance" module="configuration" fallback="Solde initial" />
              </Label>
              <Input
                id="editTreasuryInitialBalance"
                type="number"
                bind:value={editingTreasury.initial_balance}
                placeholder={get(i18nStore).resources?.configuration?.initial_balance_placeholder || 'Solde initial de la trésorerie'}
              />
            </div>
            {/if}

            <div class="space-y-2">
              <Label for="editTreasuryBankDetails">
                <Translate key="bank_details" module="configuration" fallback="Détails bancaires" />
              </Label>
              <Input
                id="editTreasuryBankDetails"
                class="w-full p-2 border rounded-md"
                bind:value={treasuryBankDetails}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.bank_details_placeholder || 'IBAN, nom de la banque, etc.'}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => {
                showEditTreasuryDialog = false;
                editingTreasury = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updateTreasury}
              disabled={!editingTreasury.name}
            >
              <Translate key="save" module="common" fallback="Sauvegarder" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/if}

    <!-- Dialogue d'édition de méthode de paiement -->
    {#if editingPaymentMethod}
      <Dialog bind:open={showEditPaymentMethodDialog}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_payment_method" module="configuration" fallback="Éditer la Méthode" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_payment_method_description"
                module="configuration"
                fallback="Modifiez les informations de la méthode de paiement"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="editPaymentMethodName">
                <Translate key="name" module="common" fallback="Nom" />
              </Label>
              <Input
                id="editPaymentMethodName"
                bind:value={editingPaymentMethod.name}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.payment_method_name || 'Nom de la méthode de paiement'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editPaymentMethodType">
                <Translate key="payment_method_type" module="configuration" fallback="Type de méthode de paiement" />
              </Label>
              <Input
                id="editPaymentMethodType"
                bind:value={paymentMethodType}
                autocomplete="one-time-code"
                placeholder={get(i18nStore).resources?.configuration?.payment_method_type_placeholder || 'Type de paiement (ex: Carte Carburant, Carte Bancaire)'}
              />
            </div>

            <div class="space-y-2">
              <Label for="editPaymentMethodTreasuryId">
                <Translate key="treasury" module="configuration" fallback="Trésorerie" />
              </Label>
              <Select.Root type="single" bind:value={editingPaymentMethodTreasuryIdValue}>
                <Select.Trigger id="editPaymentMethodTreasuryId">
                  <span data-slot="select-value">
                    {treasuries.length > 0
                      ? (editingPaymentMethodTreasuryIdValue
                        ? getTreasuryById(editingPaymentMethodTreasuryIdValue)?.name || 'Trésorerie inconnue'
                        : get(i18nStore).resources?.configuration?.select_treasury || 'Sélectionnez une trésorerie')
                      : get(i18nStore).resources?.configuration?.loading_treasuries || 'Chargement...'}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  {#if treasuries.length > 0}
                    {#each treasuries as treasury}
                      <Select.Item value={treasury.id || ''}>
                        {treasury.name} ({get(i18nStore).resources?.configuration?.[`treasury_type_${treasury.type}`] || treasury.type})
                      </Select.Item>
                    {/each}
                  {:else}
                    <Select.Item value="" disabled={true}>
                      {get(i18nStore).resources?.configuration?.no_treasuries_available || 'Aucune trésorerie disponible'}
                    </Select.Item>
                  {/if}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-2">
              <Label for="editPaymentMethodActive">
                <Translate key="status" module="common" fallback="Statut" />
              </Label>
              <Select.Root type="single" bind:value={editingPaymentMethodStatus}>
                <Select.Trigger>
                  <span data-slot="select-value">
                    {editingPaymentMethodStatus === 'active'
                      ? get(i18nStore).resources?.configuration?.active || 'Actif'
                      : get(i18nStore).resources?.configuration?.inactive || 'Inactif'}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="active">
                    <Translate key="active" module="configuration" fallback="Actif" />
                  </Select.Item>
                  <Select.Item value="inactive">
                    <Translate key="inactive" module="configuration" fallback="Inactif" />
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <Button
              variant="outline"
              onclick={() => {
                showEditPaymentMethodDialog = false;
                editingPaymentMethod = null;
                editingPaymentMethodStatus = 'active';
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updatePaymentMethod}
              disabled={!editingPaymentMethod?.name || !editingPaymentMethod?.treasury_id}
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
            <!-- Section des trésoreries -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="treasuries" module="configuration" fallback="Trésoreries" />
                </h3>
                <Badge variant={validationResults.treasuries.isValid ? "default" : "destructive"}>
                  {validationResults.treasuries.isValid ? 'OK' : 'KO'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.treasuries.message}</p>
              {#if validationResults.treasuries.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.treasuries.details as detail}
                    <div class="py-1">{detail}</div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Section des méthodes de paiement -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="payment_methods" module="configuration" fallback="Méthodes de Paiement" />
                </h3>
                <Badge variant={validationResults.payment_methods.isValid ? "default" : "destructive"}>
                  {validationResults.payment_methods.isValid ? 'OK' : 'KO'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.payment_methods.message}</p>
              {#if validationResults.payment_methods.details && validationResults.payment_methods.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.payment_methods.details as detail}
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