<script lang="ts">
  import { onMount } from 'svelte';
  import { partnerService, type Supplier, type Customer, type CreateSupplierRequest, type UpdateSupplierRequest, type CreateCustomerRequest, type UpdateCustomerRequest, extractSupplierType, extractCustomerCategory, integrateSupplierType, integrateCustomerCategory, type SupplierWithVirtualFields, type CustomerWithVirtualFields } from '$lib/services/PartnerService';
  import { configurationService } from '$lib/services/ConfigurationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
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
  let suppliers = $state<SupplierWithVirtualFields[]>([]);
  let customers = $state<CustomerWithVirtualFields[]>([]);
  let allSuppliers = $state<SupplierWithVirtualFields[]>([]);
  let allCustomers = $state<CustomerWithVirtualFields[]>([]);

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
  let selectedSupplierId = $state('');

  // États pour l'édition fournisseur
  let editingSupplier = $state<SupplierWithVirtualFields | null>(null);
  let editingSupplierType = $state('');

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
  let editingCustomer = $state<CustomerWithVirtualFields | null>(null);
  let editingCustomerCategory = $state('');

  // États pour le dialogue de validation de la configuration
  let showValidationDialog = $state(false);
  let validationResults = $state<any>(null);


  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données des partenaires pour la station:', stationId);
      console.log('Type de stationId:', typeof stationId);
      loading = true;

      // Vérifier que stationId est une chaîne de caractères valide avant de faire l'appel API
      if (typeof stationId === 'string' && stationId && stationId.trim() !== '') {
        // Charger les fournisseurs et clients associés à la station
        let fetchedSuppliers = await partnerService.getStationSuppliers(stationId);
        let fetchedCustomers = await partnerService.getStationCustomers(stationId);

        // Extraire les champs virtuels pour les affichages
        suppliers = fetchedSuppliers.map(extractSupplierType);
        customers = fetchedCustomers.map(extractCustomerCategory);

        // Charger tous les fournisseurs et clients de la compagnie pour la sélection
        allSuppliers = (await partnerService.getAllSuppliers()).map(extractSupplierType);
        allCustomers = (await partnerService.getAllCustomers()).map(extractCustomerCategory);
      } else {
        console.error('ID de station invalide:', stationId, 'type:', typeof stationId);
        suppliers = [];
        customers = [];
        allSuppliers = [];
        allCustomers = [];
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données des partenaires:', err);
      error = 'Impossible de charger les données des partenaires: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      suppliers = [];
      customers = [];
      allSuppliers = [];
      allCustomers = [];
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

  // Fonctions pour les fournisseurs
  async function addSupplier() {
    try {
      if (!supplierName || !stationId) {
        throw new Error('Le nom et l\'ID de station sont requis');
      }

      // Créer l'objet du nouveau fournisseur
      const newSupplierData: CreateSupplierRequest = {
        nom: supplierName,
        code: supplierName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4), // Générer un code unique
        contact_person: supplierContactPerson || supplierName,
        email: supplierEmail,
        telephone: supplierPhone,
        adresse: supplierAddress,
        type: supplierType || 'other',
        donnees_personnelles: {
          contact_person: supplierContactPerson || supplierName
        },  // Données personnelles contenant le contact
        metadonnees: {              // Métadonnées optionnelles
          type: supplierType || 'other'
        }
      };

      // Créer le fournisseur et l'associer à la station
      const newSupplier = await partnerService.createSupplierForStation(stationId, newSupplierData);

      // Extraire les champs virtuels et ajouter le nouveau fournisseur à la liste locale
      const extractedSupplier = extractSupplierType(newSupplier);
      suppliers = [...suppliers, extractedSupplier];

      // Réinitialiser le formulaire
      showAddSupplierDialog = false;
      supplierName = '';
      supplierEmail = '';
      supplierPhone = '';
      supplierAddress = '';
      supplierContactPerson = '';
      supplierType = '';

      console.log('Fournisseur ajouté avec succès:', newSupplier);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du fournisseur:', err);
      error = 'Impossible d\'ajouter le fournisseur: ' + (err as Error).message;
    }
  }

  async function updateSupplier() {
    try {
      if (!editingSupplier || !editingSupplier.id) {
        throw new Error('Aucun fournisseur à éditer');
      }

      // Mettre à jour le fournisseur dans la base de données
      const donnees_personnelles = {
        ...editingSupplier.donnees_personnelles,
        contact_person: editingSupplier.contact_person || 'Contact par défaut'
      };

      const metadonnees = {
        ...editingSupplier.metadonnees,
        type: editingSupplierType
      };

      const updateData: UpdateSupplierRequest = {
        nom: editingSupplier.nom,
        email: editingSupplier.email,
        telephone: editingSupplier.telephone,
        adresse: editingSupplier.adresse,
        donnees_personnelles,
        metadonnees
      };

      const updatedSupplier = await partnerService.updateSupplier(editingSupplier.id, updateData);

      // Extraire les champs virtuels et mettre à jour dans la liste
      const extractedUpdatedSupplier = extractSupplierType(updatedSupplier);
      suppliers = suppliers.map(sup =>
        sup.id === editingSupplier!.id
          ? extractedUpdatedSupplier
          : sup
      );

      // Fermer la boîte de dialogue
      showEditSupplierDialog = false;
      editingSupplier = null;

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
      suppliers = fetchedSuppliers.map(extractSupplierType);

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
      suppliers = fetchedSuppliers.map(extractSupplierType);

      console.log('Fournisseur dissocié de la station avec succès');
    } catch (err) {
      console.error('Erreur lors de la dissociation du fournisseur:', err);
      error = 'Impossible de dissocier le fournisseur: ' + (err as Error).message;
    }
  }

  function prepareEditSupplier(supplier: SupplierWithVirtualFields) {
    editingSupplier = { ...supplier };
    editingSupplierType = supplier.type || '';
    showEditSupplierDialog = true;
  }

  // Fonctions pour les clients
  async function addCustomer() {
    try {
      if (!customerName || !stationId) {
        throw new Error('Le nom et l\'ID de station sont requis');
      }

      // Créer l'objet du nouveau client
      const newCustomerData: CreateCustomerRequest = {
        nom: customerName,
        code: customerName.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4), // Générer un code unique
        contact_person: customerContactPerson || customerName,
        email: customerEmail,
        telephone: customerPhone,
        adresse: customerAddress,
        categorie: customerCategory || 'particulier',
        donnees_personnelles: {
          contact_person: customerContactPerson || customerName
        },  // Données personnelles contenant le contact
        metadonnees: {              // Métadonnées optionnelles
          categorie: customerCategory || 'particulier'
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
      customerCategory = '';

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

      // Mettre à jour le client dans la base de données
      const donnees_personnelles = {
        ...editingCustomer.donnees_personnelles,
        contact_person: editingCustomer.contact_person || 'Contact par défaut'
      };

      const metadonnees = {
        ...editingCustomer.metadonnees,
        categorie: editingCustomerCategory
      };

      const updateData: UpdateCustomerRequest = {
        nom: editingCustomer.nom,
        email: editingCustomer.email,
        telephone: editingCustomer.telephone,
        adresse: editingCustomer.adresse,
        donnees_personnelles,
        metadonnees
      };

      const updatedCustomer = await partnerService.updateCustomer(editingCustomer.id, updateData);

      // Extraire les champs virtuels et mettre à jour dans la liste
      const extractedUpdatedCustomer = extractCustomerCategory(updatedCustomer);
      customers = customers.map(cust =>
        cust.id === editingCustomer!.id
          ? extractedUpdatedCustomer
          : cust
      );

      // Fermer la boîte de dialogue
      showEditCustomerDialog = false;
      editingCustomer = null;

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
      customers = fetchedCustomers.map(extractCustomerCategory);

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
      customers = fetchedCustomers.map(extractCustomerCategory);

      console.log('Client dissocié de la station avec succès');
    } catch (err) {
      console.error('Erreur lors de la dissociation du client:', err);
      error = 'Impossible de dissocier le client: ' + (err as Error).message;
    }
  }

  function prepareEditCustomer(customer: CustomerWithVirtualFields) {
    editingCustomer = { ...customer };
    editingCustomerCategory = customer.categorie || '';
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
        `${supplier.nom} (${supplier.type || 'Type non spécifié'})`
      );
    }

    // Validation des clients (non obligatoire)
    if (customers.length === 0) {
      validation.customers.message = 'Aucun client configuré (facultatif)';
    } else {
      validation.customers.message = `${customers.length} client(s) configuré(s)`;
      validation.customers.details = customers.map(customer =>
        `${customer.nom} (${customer.categorie || 'Catégorie non spécifiée'})`
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

                            <div class="space-y-2 sm:col-span-2">
                              <Label for="supplierType">
                                <Translate key="type" module="configuration" fallback="Type" />
                              </Label>
                              <Input
                                id="supplierType"
                                bind:value={supplierType}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.supplier_type || 'Type de fournisseur'}
                              />
                            </div>
                          </div>

                          <Button
                            onclick={addSupplier}
                            disabled={!supplierName}
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
                                    {supplier.nom} ({supplier.type || get(i18nStore).resources?.configuration?.no_type || 'Type non spécifié'})
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
                            supplierName = '';
                            supplierEmail = '';
                            supplierPhone = '';
                            supplierAddress = '';
                            supplierType = '';
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
                            <p class="font-medium">{supplier.type || get(i18nStore).resources?.configuration?.no_type || 'Type non spécifié'}</p>
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
                              <Label for="customerCategory">
                                <Translate key="category" module="configuration" fallback="Catégorie" />
                              </Label>
                              <Input
                                id="customerCategory"
                                bind:value={customerCategory}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.customer_category || 'Catégorie du client'}
                              />
                            </div>
                          </div>

                          <Button
                            onclick={addCustomer}
                            disabled={!customerName}
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
                                    {customer.nom} ({customer.categorie || get(i18nStore).resources?.configuration?.no_category || 'Catégorie non spécifiée'})
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
                            customerCategory = '';
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
                            <p class="font-medium">{customer.categorie || get(i18nStore).resources?.configuration?.no_category || 'Catégorie non spécifiée'}</p>
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

              <div class="space-y-2 sm:col-span-2">
                <Label for="editSupplierType">
                  <Translate key="type" module="configuration" fallback="Type" />
                </Label>
                <Input
                  id="editSupplierType"
                  bind:value={editingSupplierType}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.supplier_type || 'Type de fournisseur'}
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onclick={() => {
                showEditSupplierDialog = false;
                editingSupplier = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updateSupplier}
              disabled={!editingSupplier?.nom}
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
                <Label for="editCustomerCategory">
                  <Translate key="category" module="configuration" fallback="Catégorie" />
                </Label>
                <Input
                  id="editCustomerCategory"
                  bind:value={editingCustomerCategory}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.customer_category || 'Catégorie du client'}
                />
              </div>
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
              disabled={!editingCustomer?.nom}
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