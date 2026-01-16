<script lang="ts">
  import { onMount } from 'svelte';
  import { employeeService, type Employee, type CreateEmployeeData, type UpdateEmployeeData } from '$lib/services';
  import { configurationService } from '$lib/services/ConfigurationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { configurationStore } from '$lib/stores/configurationStore';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { formatCurrency } from '$lib/utils/numbers';
  import { planComptableService } from '$lib/services/PlanComptableService';
  import { authStore } from '$lib/services/authStore';
  import type { PlanComptable, PlanComptableCreate, PlanComptableHierarchy } from '$lib/services/PlanComptableService';

  // Type étendu pour les employés avec le libellé du compte comptable
  type EmployeeWithAccountLabel = Employee & { compte_comptable_libelle?: string };

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

  // Données de configuration des employés
  let employees = $state<EmployeeWithAccountLabel[]>([]);
  let companyEmployees = $state<Employee[]>([]);

  // Données pour les comptes comptables des employés
  let employeeAccounts = $state<PlanComptableHierarchy[]>([]);

  // États pour les formulaires
  let showAddEmployeeDialog = $state(false);
  let showEditEmployeeDialog = $state(false);

  // États du formulaire employé
  let employeeName = $state('');
  let employeeEmail = $state('');
  let employeePhone = $state('');
  let employeeAddress = $state('');
  let employeeSalary = $state(0);
  let employeeAccount = $state<string | undefined>(undefined);
  let createNewEmployeeAccount = $state(false);
  let newEmployeeAccountName = $state('');
  let selectedEmployeeId = $state('');

  // États pour l'édition
  let editingEmployee = $state<Employee | null>(null);
  let editingEmployeeSalary = $state(0);
  let editingEmployeeAccount = $state<string | undefined>(undefined);
  let editingCreateNewEmployeeAccount = $state(false);
  let editingNewEmployeeAccountName = $state('');

  // États pour le dialogue de validation de la configuration
  let showValidationDialog = $state(false);
  let validationResults = $state<any>(null);

  // Fonction pour trouver un compte par son numéro
  function findAccountByNumber(accounts: PlanComptableHierarchy[], number: string): PlanComptableHierarchy | undefined {
    for (const account of accounts) {
      if (account.numero_compte === number) {
        return account;
      }
      if (account.enfants && account.enfants.length > 0) {
        const found = findAccountByNumber(account.enfants, number);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Fonction récursive pour trouver les comptes enfants de "Employés"
  function findEmployeeAccounts(accounts: PlanComptableHierarchy[], parentIsEmployee = false): PlanComptableHierarchy[] {
    let result: PlanComptableHierarchy[] = [];

    for (const account of accounts) {
      // Vérifier si c'est un compte "Employés" ou un de ses enfants
      const isEmployeeAccount = parentIsEmployee ||
                               account.numero_compte?.startsWith('421') ||
                               account.libelle_compte.toLowerCase().includes('employé') ||
                               account.libelle_compte.toLowerCase().includes('employee');

      if (isEmployeeAccount && account.numero_compte !== '421') { // Exclure le compte parent 421 lui-même
        result.push(account);
      }

      // Explorer récursivement les enfants
      if (account.enfants && account.enfants.length > 0) {
        const childAccounts = findEmployeeAccounts(account.enfants, isEmployeeAccount);
        result = result.concat(childAccounts);
      }
    }

    return result;
  }

  // Fonction pour charger les comptes comptables des employés
  async function loadEmployeeAccounts() {
    try {
      const allAccounts = await planComptableService.getFullPlanHierarchy();
      const employeeAccs = findEmployeeAccounts(allAccounts);
      employeeAccounts = employeeAccs;
    } catch (err) {
      console.error('Erreur lors du chargement des comptes employés:', err);
      employeeAccounts = [];
    }
  }

  // Fonction pour enrichir un employé avec le libellé du compte comptable
  function enrichEmployeeWithAccountLabel(employee: Employee): EmployeeWithAccountLabel {
    // Vérifier si le poste est un UUID (36 caractères avec tirets)
    const isUUID = employee.metadonnees?.poste && typeof employee.metadonnees.poste === 'string' && employee.metadonnees.poste.length === 36 && employee.metadonnees.poste.includes('-');

    if (isUUID && employeeAccounts.length > 0) {
      const compte = employeeAccounts.find(c => c.id === employee.metadonnees?.poste);
      if (compte) {
        // Ajouter un champ virtuel pour le libellé du compte
        return {
          ...employee,
          compte_comptable_libelle: compte.libelle_compte
        };
      }
    }

    // Si ce n'est pas un UUID ou que le compte n'est pas trouvé, retourner l'employé tel quel
    // On cast en EmployeeWithAccountLabel même s'il n'a pas le libellé du compte
    return employee as EmployeeWithAccountLabel;
  }

  // Fonction pour garantir que les objets de données sont correctement initialisés
  function ensureEmployeeData(employee: Employee): Employee {
    return {
      ...employee,
      donnees_personnelles: employee.donnees_personnelles || {},
      metadonnees: employee.metadonnees || {}
    };
  }

  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données des employés pour la station:', stationId);
      console.log('Type de stationId:', typeof stationId);
      loading = true;

      // Charger les comptes comptables des employés
      await loadEmployeeAccounts();

      // Vérifier que stationId est une chaîne de caractères valide avant de faire l'appel API
      if (typeof stationId === 'string' && stationId && stationId.trim() !== '') {
        let fetchedEmployees = await employeeService.getEmployeesByStation(stationId);
        // S'assurer que les objets de données sont correctement initialisés
        // Enrichir les employés avec les libellés des comptes comptables
        employees = fetchedEmployees.map(ensureEmployeeData).map(enrichEmployeeWithAccountLabel);

        // Charger tous les employés de la compagnie pour la sélection
        let fetchedCompanyEmployees = await employeeService.getAllEmployees();
        // S'assurer que les objets de données sont correctement initialisés
        companyEmployees = fetchedCompanyEmployees.map(ensureEmployeeData);
      } else {
        console.error('ID de station invalide:', stationId, 'type:', typeof stationId);
        employees = [];
        companyEmployees = [];
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données des employés:', err);
      error = 'Impossible de charger les données des employés: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      employees = [];
      companyEmployees = [];
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
          employees: {
            employees: validation.employees.isValid,
            overall: validation.overall.isValid
          }
        }
      };

      // Sauvegarder la configuration via le service
      const response = await configurationService.saveStationConfiguration(stationId, configToSave);

      console.log('Configuration des employés sauvegardée avec succès pour la station:', stationId);
      console.log(configToSave);

      // Mettre à jour la configuration dans le store global
      configurationStore.updatePart(stationId, 'employees', configToSave.completion.employees);

      // Fermer le dialogue de validation
      showValidationDialog = false;

      // Afficher un message de succès
      toast.success(get(i18nStore).resources?.configuration?.employees_config_saved || 'Configuration des employés sauvegardée avec succès');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);
      error = 'Erreur lors de la sauvegarde de la configuration: ' + (err as Error).message;
    }
  }

  // Charger les données au montage
  onMount(() => {
    console.log('Composant employees monté avec stationId:', stationId);
    console.log('Station info:', stationInfo);
  });

  // Fonction pour ajouter un employé
  async function addEmployee() {
    try {
      if (!employeeName || !stationId) {
        throw new Error('Le nom et l\'ID de station sont requis');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (createNewEmployeeAccount) {
        // Vérifier que le nom du nouveau compte n'est pas vide
        if (!newEmployeeAccountName || newEmployeeAccountName.trim() === '') {
          throw new Error('Le nom du nouveau type de poste est requis');
        }

        // Trouver le compte parent "Employés" (421)
        const allAccounts = await planComptableService.getFullPlanHierarchy();
        const parentAccount = findAccountByNumber(allAccounts, '421');

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);

        // Créer un nouveau compte comptable pour ce poste
        const newAccount: PlanComptableCreate = {
          libelle_compte: newEmployeeAccountName,
          compagnie_id: authState.user?.compagnie_id || undefined,
          parent_id: parentAccount?.id || undefined
        };

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;

        // Rafraîchir les comptes employés pour inclure le nouveau compte
        await loadEmployeeAccounts();
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (employeeAccount) {
        compteComptableId = employeeAccount;
      }

      // Déterminer le poste final - si un compte comptable est sélectionné, utiliser son UUID
      const finalPoste = compteComptableId;

      // Vérifier que le poste est défini
      if (!finalPoste) {
        throw new Error('Un poste (compte comptable) doit être sélectionné ou créé');
      }

      // Créer l'objet du nouvel employé
      const newEmployeeData: CreateEmployeeData = {
        nom: employeeName,
        email: employeeEmail,
        telephone: employeePhone,
        adresse: employeeAddress,
        statut: 'actif',
        donnees_personnelles: {
          salaire: employeeSalary
        },
        metadonnees: {
          poste: finalPoste,
          salaire: employeeSalary
        }
      };

      // Créer l'employé dans la base de données
      const newEmployee = await employeeService.createEmployee(newEmployeeData);

      // Associer l'employé à la station
      await employeeService.associateEmployeeToStation(newEmployee.id, stationId);

      // Initialiser correctement l'employé et l'ajouter à la liste
      const initializedNewEmployee = enrichEmployeeWithAccountLabel(ensureEmployeeData(newEmployee));
      employees = [...employees, initializedNewEmployee];

      // Réinitialiser le formulaire
      showAddEmployeeDialog = false;
      employeeName = '';
      employeeEmail = '';
      employeePhone = '';
      employeeAddress = '';
      employeeSalary = 0;
      employeeAccount = undefined;
      newEmployeeAccountName = '';
      createNewEmployeeAccount = false;

      console.log('Employé ajouté avec succès:', newEmployee);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'employé:', err);
      error = 'Impossible d\'ajouter l\'employé: ' + (err as Error).message;
    }
  }

  // Fonction pour modifier un employé
  async function updateEmployee() {
    try {
      if (!editingEmployee || !editingEmployee.id) {
        throw new Error('Aucun employé à éditer');
      }

      let compteComptableId: string | null = null;

      // Si l'utilisateur veut créer un nouveau compte
      if (editingCreateNewEmployeeAccount) {
        // Vérifier que le nom du nouveau compte n'est pas vide
        if (!editingNewEmployeeAccountName || editingNewEmployeeAccountName.trim() === '') {
          throw new Error('Le nom du nouveau type de poste est requis');
        }

        // Trouver le compte parent "Employés" (421)
        const allAccounts = await planComptableService.getFullPlanHierarchy();
        const parentAccount = findAccountByNumber(allAccounts, '421');

        // Récupérer l'ID de la compagnie depuis le store d'authentification
        const authState = get(authStore);

        // Créer un nouveau compte comptable pour ce poste
        const newAccount: PlanComptableCreate = {
          libelle_compte: editingNewEmployeeAccountName,
          compagnie_id: authState.user?.compagnie_id || undefined,
          parent_id: parentAccount?.id || undefined
        };

        const createdAccount = await planComptableService.createPlanComptable(newAccount);
        compteComptableId = createdAccount.id;

        // Rafraîchir les comptes employés pour inclure le nouveau compte
        await loadEmployeeAccounts();
      }
      // Sinon, utiliser le compte sélectionné s'il existe
      else if (editingEmployeeAccount) {
        compteComptableId = editingEmployeeAccount;
      }

      // Déterminer le poste final - si un compte comptable est sélectionné, utiliser son UUID
      const finalPoste = compteComptableId;

      // Vérifier que le poste est défini
      if (!finalPoste) {
        throw new Error('Un poste (compte comptable) doit être sélectionné ou créé');
      }

      // Mettre à jour l'employé dans la base de données
      const updateData: UpdateEmployeeData = {
        nom: editingEmployee.nom,
        email: editingEmployee.email,
        telephone: editingEmployee.telephone,
        adresse: editingEmployee.adresse,
        donnees_personnelles: {
          ...editingEmployee.donnees_personnelles,
          salaire: editingEmployeeSalary
        },
        metadonnees: {
          ...editingEmployee.metadonnees,
          poste: finalPoste,
          salaire: editingEmployeeSalary
        }
      };

      const updatedEmployee = await employeeService.updateEmployee(editingEmployee.id, updateData);

      // Mettre à jour dans la liste
      employees = employees.map(emp =>
        emp.id === editingEmployee!.id
          ? enrichEmployeeWithAccountLabel(ensureEmployeeData(updatedEmployee))
          : emp
      );

      // Fermer la boîte de dialogue
      showEditEmployeeDialog = false;
      editingEmployee = null;
      editingEmployeeAccount = undefined;
      editingNewEmployeeAccountName = '';
      editingCreateNewEmployeeAccount = false;

      console.log('Employé mis à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'employé:', err);
      error = 'Impossible de mettre à jour l\'employé: ' + (err as Error).message;
    }
  }

  // Fonction pour ajouter un employé existant à la station
  async function addExistingEmployee() {
    try {
      if (!selectedEmployeeId || !stationId) {
        throw new Error('Aucun employé sélectionné ou ID de station manquant');
      }

      // Associer l'employé existant à la station
      await employeeService.associateEmployeeToStation(selectedEmployeeId, stationId);

      // Charger les données mises à jour
      let fetchedEmployees = await employeeService.getEmployeesByStation(stationId);
      // S'assurer que les objets de données sont correctement initialisés
      employees = fetchedEmployees.map(ensureEmployeeData);

      // Réinitialiser le formulaire
      selectedEmployeeId = '';

      console.log('Employé existant ajouté à la station avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'employé existant:', err);
      error = 'Impossible d\'ajouter l\'employé existant: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer un employé
  async function removeEmployee(employeeId: string) {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Dissocier l'employé de la station
      await employeeService.dissociateEmployeeFromStation(employeeId, stationId);

      // Supprimer l'employé de la base de données
      await employeeService.deleteEmployee(employeeId);

      // Retirer l'employé de la liste
      employees = employees.filter(emp => emp.id !== employeeId);

      console.log('Employé supprimé avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'employé:', err);
      error = 'Impossible de supprimer l\'employé: ' + (err as Error).message;
    }
  }

  // Fonction pour dissocier un employé de la station
  async function dissociateEmployee(employeeId: string) {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Dissocier l'employé de la station
      await employeeService.dissociateEmployeeFromStation(employeeId, stationId);

      // Recharger les données mises à jour
      employees = await employeeService.getEmployeesByStation(stationId);

      console.log('Employé dissocié de la station avec succès');
    } catch (err) {
      console.error('Erreur lors de la dissociation de l\'employé:', err);
      error = 'Impossible de dissocier l\'employé: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'un employé
  function prepareEditEmployee(employee: Employee) {
    editingEmployee = { ...employee };
    editingEmployeeSalary = employee.donnees_personnelles.salaire || employee.metadonnees.salaire || 0;

    // Vérifier si le poste est un UUID (36 caractères avec tirets)
    const isUUID = employee.metadonnees?.poste && typeof employee.metadonnees.poste === 'string' && employee.metadonnees.poste.length === 36 && employee.metadonnees.poste.includes('-');

    if (isUUID) {
      editingEmployeeAccount = employee.metadonnees?.poste as string;
      editingCreateNewEmployeeAccount = false;
      editingNewEmployeeAccountName = '';
    } else {
      editingEmployeeAccount = undefined;
      editingCreateNewEmployeeAccount = false;
      editingNewEmployeeAccountName = '';
    }

    showEditEmployeeDialog = true;
  }

  // Fonction de validation globale de la configuration des employés
  function validateConfiguration() {
    const validation = {
      employees: { isValid: false, message: '', details: [] as string[] },
      overall: { isValid: false, message: '' }
    };

    // Validation des employés
    if (employees.length === 0) {
      validation.employees.isValid = false;
      validation.employees.message = 'Aucun employé configuré';
      validation.employees.details = ['Veuillez ajouter au moins un employé'];
    } else {
      validation.employees.isValid = true;
      validation.employees.message = `${employees.length} employé(s) configuré(s)`;
      validation.employees.details = employees.map(employee =>
        `${employee.nom} (${employee.compte_comptable_libelle || employee.metadonnees?.poste || 'Poste non spécifié'})`
      );
    }

    // Validation globale
    validation.overall.isValid = validation.employees.isValid;

    if (validation.overall.isValid) {
      validation.overall.message = 'Configuration complète';
    } else {
      validation.overall.message = 'Configuration incomplète: employés requis';
    }

    return validation;
  }

  console.log('Composant employees monté');
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
      <Translate key="human_resources_setup" module="configuration" fallback="Configuration des Ressources Humaines" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="staff_management_setup"
        module="configuration"
        fallback="Gérez les employés et leurs salaires pour votre station"
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
              <Translate key="employees" module="configuration" fallback="Employés" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="manage_employees"
                module="configuration"
                fallback="Gérez les employés de votre station et leurs salaires"
              />
            </CardDescription>
          </div>
          <Button onclick={() => saveConfiguration()}>
            <Translate key="save_configuration" module="configuration" fallback="Sauvegarder" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each employees as employee (employee.id)}
            <Card class="p-4">
              <div class="grid grid-cols-5 gap-4 items-center">
                <div>
                  <Label>
                    <Translate key="name" module="common" fallback="Nom" />
                  </Label>
                  <p class="font-medium">{employee.nom}</p>
                </div>
                <div>
                  <Label>
                    <Translate key="position" module="configuration" fallback="Poste" />
                  </Label>
                  <p class="text-sm">{employee.compte_comptable_libelle || employee.metadonnees?.poste || get(i18nStore).resources?.configuration?.no_position || 'Aucun poste'}</p>
                </div>
                <div>
                  <Label>
                    <Translate key="salary" module="configuration" fallback="Salaire" />
                  </Label>
                  <p class="font-medium">{formatCurrency(employee.donnees_personnelles?.salaire || employee.metadonnees?.salaire || 0)}</p>
                </div>
                <div>
                  <Label>
                    <Translate key="phone" module="common" fallback="Téléphone" />
                  </Label>
                  <p>{employee.telephone || 'Non renseigné'}</p>
                </div>
                <div class="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => prepareEditEmployee(employee)}
                  >
                    <Translate key="edit" module="common" fallback="Éditer" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-destructive border-destructive"
                    onclick={() => dissociateEmployee(employee.id!)}
                  >
                    <Translate key="dissociate" module="common" fallback="Dissocier" />
                  </Button>
                </div>
              </div>
            </Card>
          {/each}

          <Dialog bind:open={showAddEmployeeDialog}>
            <DialogTrigger>
              <Button class="w-full">
                <Translate key="add_employee" module="configuration" fallback="Ajouter un employé" />
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  <Translate key="add_employee" module="configuration" fallback="Ajouter un employé" />
                </DialogTitle>
                <DialogDescription>
                  <Translate
                    key="add_employee_description"
                    module="configuration"
                    fallback="Entrez les informations du nouvel employé"
                  />
                </DialogDescription>
              </DialogHeader>
              <div class="space-y-6 py-4">
                <!-- Option pour ajouter un nouvel employé -->
                <div class="space-y-4">
                  <h3 class="text-lg font-medium">
                    <Translate key="create_new_employee" module="configuration" fallback="Créer un nouvel employé" />
                  </h3>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-2 sm:col-span-2">
                      <Label for="employeeName">
                        <Translate key="full_name" module="configuration" fallback="Nom complet" />
                      </Label>
                      <Input
                        id="employeeName"
                        bind:value={employeeName}
                        autocomplete="one-time-code"
                        placeholder={get(i18nStore).resources?.configuration?.employee_name || 'Nom complet de l\'employé'}
                      />
                    </div>

                    <div class="space-y-2">
                      <Label for="employeeEmail">
                        <Translate key="email" module="common" fallback="Email" />
                      </Label>
                      <Input
                        id="employeeEmail"
                        type="email"
                        bind:value={employeeEmail}
                        autocomplete="one-time-code"
                        placeholder="email@exemple.com"
                      />
                    </div>

                    <div class="space-y-2">
                      <Label for="employeePhone">
                        <Translate key="phone" module="common" fallback="Téléphone" />
                      </Label>
                      <Input
                        id="employeePhone"
                        bind:value={employeePhone}
                        autocomplete="one-time-code"
                        placeholder="+221 77 123 45 67"
                      />
                    </div>

                    <div class="space-y-2 sm:col-span-2">
                      <Label for="employeeAddress">
                        <Translate key="address" module="common" fallback="Adresse" />
                      </Label>
                      <Input
                        id="employeeAddress"
                        bind:value={employeeAddress}
                        autocomplete="one-time-code"
                        placeholder="Adresse de l'employé"
                      />
                    </div>

                    <!-- Sélection du poste comptable -->
                    <div class="space-y-2 sm:col-span-2">
                      <Label for="employeeAccount">
                        <Translate key="position" module="configuration" fallback="Poste" />
                      </Label>
                      <Select.Root bind:value={employeeAccount} type="single">
                        <Select.Trigger class="w-full">
                          <span data-slot="select-value">
                            {#if employeeAccount}
                              {@const selectedAccount = employeeAccounts.find(acc => acc.id === employeeAccount)}
                              {#if selectedAccount}
                                {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                              {:else}
                                {get(i18nStore).resources?.configuration?.select_employee_position || 'Sélectionnez le poste'}
                              {/if}
                            {:else}
                              {get(i18nStore).resources?.configuration?.select_employee_position || 'Sélectionnez le poste'}
                            {/if}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Group>
                            <Select.Label>
                              <Translate key="employee_positions" module="configuration" fallback="Postes" />
                            </Select.Label>
                            {#each employeeAccounts as account (account.id)}
                              <Select.Item value={account.id}>
                                {account.libelle_compte} ({account.numero_compte})
                              </Select.Item>
                            {/each}
                          </Select.Group>
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <!-- Case à cocher pour créer un nouveau poste -->
                    <div class="flex items-center space-x-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="createNewEmployeeAccount"
                        bind:checked={createNewEmployeeAccount}
                        class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <Label for="createNewEmployeeAccount" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <Translate key="create_new_position" module="configuration" fallback="Créer un nouveau poste" />
                      </Label>
                    </div>

                    <!-- Champ pour le nouveau poste -->
                    {#if createNewEmployeeAccount}
                      <div class="space-y-2 sm:col-span-2">
                        <Label for="newEmployeeAccountName">
                          <Translate key="new_position_name" module="configuration" fallback="Nom du nouveau poste" />
                        </Label>
                        <Input
                          id="newEmployeeAccountName"
                          bind:value={newEmployeeAccountName}
                          placeholder={get(i18nStore).resources?.configuration?.enter_employee_position_name || 'Entrez le nom du nouveau poste'}
                        />
                      </div>
                    {/if}

                    <div class="space-y-2">
                      <Label for="employeeSalary">
                        <Translate key="salary" module="configuration" fallback="Salaire" />
                      </Label>
                      <Input
                        id="employeeSalary"
                        type="number"
                        bind:value={employeeSalary}
                        placeholder={get(i18nStore).resources?.configuration?.salary_placeholder || 'Salaire mensuel'}
                      />
                    </div>
                  </div>

                  <Button
                    onclick={addEmployee}
                    disabled={!employeeName || employeeSalary <= 0 || (!employeeAccount && !createNewEmployeeAccount) || (createNewEmployeeAccount && !newEmployeeAccountName)}
                    class="w-full"
                  >
                    <Translate key="add_new_employee" module="configuration" fallback="Ajouter nouvel employé" />
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

                <!-- Option pour ajouter un employé existant -->
                <div class="space-y-4">
                  <h3 class="text-lg font-medium">
                    <Translate key="add_existing_employee" module="configuration" fallback="Ajouter un employé existant" />
                  </h3>

                  <div class="space-y-2">
                    <Select.Root
                      type="single"
                      bind:value={selectedEmployeeId}
                    >
                      <Select.Trigger class="w-full">
                        <span data-slot="select-value">
                          {selectedEmployeeId
                            ? companyEmployees.find(e => e.id === selectedEmployeeId)?.nom
                            : get(i18nStore).resources?.configuration?.select_employee || 'Sélectionner un employé'}
                        </span>
                      </Select.Trigger>
                      <Select.Content>
                        {#each companyEmployees.filter(e => !employees.some(emp => emp.id === e.id)) as emp}
                          <Select.Item value={emp.id}>
                            {emp.nom} ({emp.donnees_personnelles?.poste || emp.metadonnees?.poste || 'Poste non spécifié'})
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                    <Button
                      onclick={addExistingEmployee}
                      disabled={!selectedEmployeeId}
                      class="w-full"
                    >
                      <Translate key="add_employee_to_station" module="configuration" fallback="Ajouter à la station" />
                    </Button>
                  </div>
                </div>
              </div>

              <div class="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onclick={() => {
                    showAddEmployeeDialog = false;
                    employeeName = '';
                    employeeEmail = '';
                    employeePhone = '';
                    employeeAddress = '';
                    employeeSalary = 0;
                    selectedEmployeeId = '';
                  }}
                >
                  <Translate key="cancel" module="common" fallback="Annuler" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>

    <!-- Dialogue d'édition d'employé -->
    {#if editingEmployee}
      <Dialog bind:open={showEditEmployeeDialog}>
        <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Translate key="edit_employee" module="configuration" fallback="Éditer l'employé" />
            </DialogTitle>
            <DialogDescription>
              <Translate
                key="edit_employee_description"
                module="configuration"
                fallback="Modifiez les informations de l'employé"
              />
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2 sm:col-span-2">
                <Label for="editEmployeeName">
                  <Translate key="full_name" module="configuration" fallback="Nom complet" />
                </Label>
                <Input
                  id="editEmployeeName"
                  bind:value={editingEmployee.nom}
                  autocomplete="one-time-code"
                  placeholder={get(i18nStore).resources?.configuration?.employee_name || 'Nom complet de l\'employé'}
                />
              </div>

              <div class="space-y-2">
                <Label for="editEmployeeEmail">
                  <Translate key="email" module="common" fallback="Email" />
                </Label>
                <Input
                  id="editEmployeeEmail"
                  type="email"
                  bind:value={editingEmployee.email}
                  autocomplete="one-time-code"
                  placeholder="email@exemple.com"
                />
              </div>

              <div class="space-y-2">
                <Label for="editEmployeePhone">
                  <Translate key="phone" module="common" fallback="Téléphone" />
                </Label>
                <Input
                  id="editEmployeePhone"
                  bind:value={editingEmployee.telephone}
                  autocomplete="one-time-code"
                  placeholder="+221 77 123 45 67"
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editEmployeeAddress">
                  <Translate key="address" module="common" fallback="Adresse" />
                </Label>
                <Input
                  id="editEmployeeAddress"
                  bind:value={editingEmployee.adresse}
                  autocomplete="one-time-code"
                  placeholder="Adresse de l'employé"
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for="editEmployeeAccount">
                  <Translate key="position" module="configuration" fallback="Poste" />
                </Label>
                <Select.Root bind:value={editingEmployeeAccount} type="single">
                  <Select.Trigger class="w-full">
                    <span data-slot="select-value">
                      {#if editingEmployeeAccount}
                        {@const selectedAccount = employeeAccounts.find(acc => acc.id === editingEmployeeAccount)}
                        {#if selectedAccount}
                          {selectedAccount.libelle_compte} ({selectedAccount.numero_compte})
                        {:else}
                          {get(i18nStore).resources?.configuration?.select_employee_position || 'Sélectionnez le poste'}
                        {/if}
                      {:else}
                        {get(i18nStore).resources?.configuration?.select_employee_position || 'Sélectionnez le poste'}
                      {/if}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>
                        <Translate key="employee_positions" module="configuration" fallback="Postes" />
                      </Select.Label>
                      {#each employeeAccounts as account (account.id)}
                        <Select.Item value={account.id}>
                          {account.libelle_compte} ({account.numero_compte})
                        </Select.Item>
                      {/each}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Case à cocher pour créer un nouveau poste -->
              <div class="flex items-center space-x-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="editCreateNewEmployeeAccount"
                  bind:checked={editingCreateNewEmployeeAccount}
                  class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                />
                <Label for="editCreateNewEmployeeAccount" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <Translate key="create_new_position" module="configuration" fallback="Créer un nouveau poste" />
                </Label>
              </div>

              <!-- Champ pour le nouveau poste -->
              {#if editingCreateNewEmployeeAccount}
                <div class="space-y-2 sm:col-span-2">
                  <Label for="editNewEmployeeAccountName">
                    <Translate key="new_position_name" module="configuration" fallback="Nom du nouveau poste" />
                  </Label>
                  <Input
                    id="editNewEmployeeAccountName"
                    bind:value={editingNewEmployeeAccountName}
                    placeholder={get(i18nStore).resources?.configuration?.enter_employee_position_name || 'Entrez le nom du nouveau poste'}
                  />
                </div>
              {/if}

              <div class="space-y-2">
                <Label for="editEmployeeSalary">
                  <Translate key="salary" module="configuration" fallback="Salaire" />
                </Label>
                <Input
                  id="editEmployeeSalary"
                  type="number"
                  bind:value={editingEmployeeSalary}
                  placeholder={get(i18nStore).resources?.configuration?.salary_placeholder || 'Salaire mensuel'}
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onclick={() => {
                showEditEmployeeDialog = false;
                editingEmployee = null;
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button
              onclick={updateEmployee}
              disabled={!editingEmployee?.nom || editingEmployeeSalary <= 0 || (!editingEmployeeAccount && !editingCreateNewEmployeeAccount) || (editingCreateNewEmployeeAccount && !editingNewEmployeeAccountName)}
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
            <!-- Section des employés -->
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  <Translate key="employees" module="configuration" fallback="Employés" />
                </h3>
                <Badge variant={validationResults.employees.isValid ? "default" : "destructive"}>
                  {validationResults.employees.isValid ? 'OK' : 'KO'}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground mt-1">{validationResults.employees.message}</p>
              {#if validationResults.employees.details.length > 0}
                <div class="mt-2 text-sm">
                  {#each validationResults.employees.details as detail}
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