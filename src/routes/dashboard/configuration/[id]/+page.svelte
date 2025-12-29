<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService, type ConfigurationState } from '$lib/services/ConfigurationService';
  import { stationService } from '$lib/services/StationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Progress } from '$lib/components/ui/progress';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { setConfigurationContext } from '$lib/contexts/configurationContext';
  import { configurationStore, type ConfigurationCompletion } from '$lib/stores/configurationStore';

  // Récupérer les données de la page
  let stationId = $state<string>('');
  let stationData = $state<any>(null);
  let hasLoaded = $state<boolean>(false); // Pour éviter le chargement multiple

  // Charger l'ID de la station depuis les données du layout
  $effect(() => {
    const unsubscribe = page.subscribe((data) => {
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
        stationData = data.data.station;
        hasLoaded = false; // Réinitialiser le statut de chargement
      }

      // Charger la configuration une seule fois quand les données sont disponibles
      if (stationId && stationData && !hasLoaded) {
        hasLoaded = true;
        loadConfigurationState();
      }
    });
    return unsubscribe;
  });

  // États
  let configurationState: ConfigurationState | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let progress = $state(0);

  // Données de configuration
  let configSteps = $state([
    {
      id: 'infrastructure',
      title: 'infrastructure_setup',
      description: 'fuel_tanks_pumps_setup',
      icon: '⛽',
      route: (id: string) => `/dashboard/configuration/${id}/infrastructure`,
      completed: false,
      details: {
        fuel: false,
        tanks: false,
        pumps: false,
        stock: false,
        overall: false
      }
    },
    {
      id: 'partners',
      title: 'partner_setup',
      description: 'suppliers_customers_setup',
      icon: '👥',
      route: (id: string) => `/dashboard/configuration/${id}/partners`,
      completed: false,
      details: {
        suppliers: false,
        customers: false,
        overall: false
      }
    },
    {
      id: 'employees',
      title: 'employee_setup',
      description: 'staff_salary_setup',
      icon: '👷',
      route: (id: string) => `/dashboard/configuration/${id}/employees`,
      completed: false,
      details: {
        employees: false,
        overall: false
      }
    },
    {
      id: 'finances',
      title: 'finance_setup',
      description: 'treasury_payment_setup',
      icon: '💰',
      route: (id: string) => `/dashboard/configuration/${id}/finances`,
      completed: false,
      details: {
        treasuries: false,
        payment_methods: false,
        overall: false
      }
    },
    {
      id: 'balance',
      title: 'balance_setup',
      description: 'initial_balance_setup',
      icon: '📋',
      route: (id: string) => `/dashboard/configuration/${id}/balance`,
      completed: false,
      details: {
        assets: false,
        receivables: false,
        debts: false,
        overall: false
      }
    }
  ]);

  // Fonction pour charger l'état de configuration
  function loadConfigurationState() {
    try {
      console.log('Tentative de chargement de la configuration pour la station:', stationId);
      loading = true;
      if (!stationId || !stationData) {
        throw new Error('Données de station manquantes');
      }

      // Utiliser les données du layout pour éviter le double appel API
      // Mise à jour de l'état de configuration en fonction des données du layout
      const completionData = stationData.config?.completion || {};

      // Charger les données du store pour combiner avec les données du layout
      const storeConfig = configurationStore.getStationConfig(stationId);

      // Combiner les données du layout avec celles du store (les données du store ont priorité)
      const combinedData = {
        ...completionData,
        ...(storeConfig || {})
      };

      configurationState = {
        id: `config_${stationId}`, // Utiliser un ID basé sur l'ID de la station
        station_id: stationId,
        station_name: stationData.name, // Données provenant du layout
        station_code: stationData.code, // Données provenant du layout
        station_address: stationData.address, // Données provenant du layout
        infrastructure_complete: combinedData.infrastructure?.overall || false,
        partners_complete: combinedData.partners?.overall || false,
        employees_complete: combinedData.employees?.overall || false,
        finances_complete: combinedData.finances?.overall || false,
        balance_complete: combinedData.balance?.overall || false,
        is_complete: false, // À déterminer selon les autres complétions
        created_at: stationData.created_at,
        updated_at: stationData.updated_at
      };

      // Calculer si la configuration est complètement terminée
      if (configurationState) {
        configurationState.is_complete =
          configurationState.infrastructure_complete &&
          configurationState.partners_complete &&
          configurationState.employees_complete &&
          configurationState.finances_complete &&
          configurationState.balance_complete;
      }

      // Mise à jour des statuts de complétion
      updateCompletionStatus(combinedData);

      // Calcul du progrès global
      calculateProgress();
    } catch (err) {
      console.error('Erreur lors du chargement de l\'état de configuration:', err);
      error = 'Impossible de charger l\'état de configuration: ' + (err as Error).message;

      // En cas d'erreur, utiliser des données par défaut
      configurationState = {
        id: 'default_config_id',
        station_id: stationId,
        station_name: stationData?.name || 'Station Inconnue', // Valeur du layout ou défaut
        station_code: stationData?.code || 'N/A', // Valeur du layout ou défaut
        station_address: stationData?.address || 'N/A', // Valeur du layout ou défaut
        infrastructure_complete: false,
        partners_complete: false,
        employees_complete: false,
        finances_complete: false,
        balance_complete: false,
        is_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mise à jour des statuts de complétion avec des données par défaut
      updateCompletionStatus({});
      calculateProgress();
    } finally {
      loading = false;
      console.log('Fin du chargement, loading:', loading);
    }
  }
  
  // Mise à jour des statuts de complétion
  function updateCompletionStatus(completionData: any) {
    if (!configSteps) return;

    // Mettre à jour les étapes en fonction des données de complétion
    configSteps.forEach(step => {
      switch (step.id) {
        case 'infrastructure':
          step.completed = completionData.infrastructure?.overall || false;
          step.details = {
            fuel: completionData.infrastructure?.fuel || false,
            tanks: completionData.infrastructure?.tanks || false,
            pumps: completionData.infrastructure?.pumps || false,
            stock: completionData.infrastructure?.stock || false,
            overall: completionData.infrastructure?.overall || false
          };
          break;
        case 'partners':
          step.completed = completionData.partners?.overall || false;
          step.details = {
            suppliers: completionData.partners?.suppliers || false,
            customers: completionData.partners?.customers || false,
            overall: completionData.partners?.overall || false
          };
          break;
        case 'employees':
          step.completed = completionData.employees?.overall || false;
          step.details = {
            employees: completionData.employees?.employees || false,
            overall: completionData.employees?.overall || false
          };
          break;
        case 'finances':
          step.completed = completionData.finances?.overall || false;
          step.details = {
            treasuries: completionData.finances?.treasuries || false,
            payment_methods: completionData.finances?.payment_methods || false,
            overall: completionData.finances?.overall || false
          };
          break;
        case 'balance':
          step.completed = completionData.balance?.overall || false;
          step.details = {
            assets: completionData.balance?.assets || false,
            receivables: completionData.balance?.receivables || false,
            debts: completionData.balance?.debts || false,
            overall: completionData.balance?.overall || false
          };
          break;
      }
    });
  }
  
  // Calcul du progrès global
  function calculateProgress() {
    // Calcul du progrès basé sur les étapes complètes
    const completedSteps = configSteps.filter(step => step.completed).length;
    progress = (completedSteps / configSteps.length) * 100;
  }

  // Calcul du progrès détaillé pour une étape spécifique
  function calculateStepProgress(stepId: string): { completed: number, total: number, percentage: number } {
    const step = configSteps.find(s => s.id === stepId);
    if (!step || !step.details) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    // Compter les sous-étapes complétées (excluant le champ 'overall')
    const details = { ...step.details };
    delete details.overall; // Exclure le champ 'overall' du calcul

    const entries = Object.entries(details);
    const total = entries.length;
    const completed = entries.filter(([_, value]) => value === true).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }
  
  // Détermine si une étape peut être accédée (dépend de l'étape précédente)
  function getStepDependency(stepId: string): boolean | null {
    const stepIndex = configSteps.findIndex(step => step.id === stepId);
    if (stepIndex <= 0) {
      // Première étape n'a pas de dépendance
      return null;
    }
    
    // Retourne l'état de complétion de l'étape précédente
    return configSteps[stepIndex - 1].completed;
  }
  
  // Fonction pour rediriger vers une étape de configuration
  function navigateToStep(stepId: string) {
    const step = configSteps.find(s => s.id === stepId);
    if (step && (!getStepDependency(stepId) || getStepDependency(stepId) || configSteps.find(s => s.id === stepId)?.completed)) {
      goto(step.route(stationId));
    }
  }

  // Fonction pour mettre à jour la configuration
  function updateConfiguration(newCompletionData: any) {
    // Mettre à jour les données de station
    if (stationData && stationData.config) {
      stationData.config.completion = {
        ...stationData.config.completion,
        ...newCompletionData
      };
    }

    // Mettre à jour le store de configuration
    for (const [key, value] of Object.entries(newCompletionData)) {
      const stepKey = key as keyof ConfigurationCompletion;
      configurationStore.updatePart(stationId, stepKey, value);
    }

    // Mettre à jour l'état de configuration
    updateCompletionStatus(newCompletionData);

    // Recalculer la progression
    calculateProgress();
  }

  // Fonction pour obtenir la configuration actuelle
  function getConfiguration(): ConfigurationState | null {
    return configurationState;
  }

  // Configuration du contexte
  $effect(() => {
    if (stationId && stationData) {
      setConfigurationContext({
        updateConfiguration,
        getConfiguration
      });
    }
  });

  console.log('Composant de configuration monté');
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="initial_setup" module="configuration" fallback="Configuration Initiale de la Station" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="setup_description"
        module="configuration"
        fallback="Configurez tous les aspects de votre station pour la rendre opérationnelle"
      />
    </p>
  </div>

  <!-- Carte d'identification de la station -->
  {#if configurationState && !loading}
    <Card class="border-primary/30 bg-primary/5">
      <CardHeader class="flex flex-row items-center space-x-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          ⛽
        </div>
        <div>
          <CardTitle class="text-lg">
            {get(i18nStore).resources?.configuration?.current_station
              ? get(i18nStore).resources?.configuration?.current_station.replace('{stationName}', configurationState.station_name || 'Station Inconnue')
              : `Station: ${configurationState.station_name || 'Station Inconnue'}`}
          </CardTitle>
          <p class="text-sm text-muted-foreground">
            <Translate key="code" module="common" fallback="Code" />: {configurationState.station_code || 'N/A'} | {configurationState.station_address || 'Adresse inconnue'}
          </p>
        </div>
      </CardHeader>
    </Card>
  {/if}

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <Spinner class="w-8 h-8" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      {error}
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Barre de progression -->
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium">
            <Translate key="overall_progress" module="configuration" fallback="Progression globale" />
          </span>
          <span class="text-sm font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} class="w-full" />
        <p class="text-sm text-muted-foreground">
          {Math.round(progress)}% - 
          <Translate 
            key={progress < 30 ? 'just_started' : progress < 70 ? 'half_way' : 'almost_done'} 
            module="configuration" 
            fallback={progress < 30 ? 'Début' : progress < 70 ? 'Moitié du chemin' : 'Presque terminé'} 
          />
        </p>
      </div>

      <!-- Grille des étapes de configuration -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each configSteps as step (step.id)}
          <Card class="hover:shadow-md transition-shadow">
            <CardHeader class="flex flex-row items-center space-x-4">
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-xl">
                {step.icon}
              </div>
              <div>
                <CardTitle class="text-lg">
                  <Translate key={step.title} module="configuration" />
                </CardTitle>
                <CardDescription class="text-sm mt-1">
                  <Translate key={step.description} module="configuration" />
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex justify-between items-center">
                <div class="flex flex-col">
                  <Badge variant={step.completed ? "default" : "secondary"}>
                    {#if step.completed}
                      <Translate key="completed" module="configuration" fallback="Complété" />
                    {:else}
                      <Translate key="pending" module="configuration" fallback="En attente" />
                    {/if}
                  </Badge>
                  {#if !step.completed}
                    <div class="text-xs text-muted-foreground mt-1">
                      {#if step.id !== 'employees'} <!-- employees n'a qu'une seule sous-étape -->
                        {#if step.id === 'partners'}
                          {calculateStepProgress(step.id).completed}/
                          {calculateStepProgress(step.id).total}
                          <Translate key="suppliers_customers_setup" module="configuration" fallback="Fournisseurs/Clients" />
                        {:else if step.id === 'balance'}
                          {calculateStepProgress(step.id).completed}/
                          {calculateStepProgress(step.id).total}
                          <Translate key="balance_setup" module="configuration" fallback="Bilan" />
                        {:else}
                          {calculateStepProgress(step.id).completed}/
                          {calculateStepProgress(step.id).total}
                          <Translate key="configure" module="configuration" fallback="étapes" />
                        {/if}
                      {/if}
                    </div>
                  {/if}
                </div>
                <Button
                  variant="outline"
                  disabled={false}
                  onclick={() => navigateToStep(step.id)}
                >
                  <Translate key="configure" module="configuration" fallback="Configurer" />
                </Button>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>

      <!-- Section de validation finale -->
      <Card>
        <CardHeader>
          <CardTitle>
            <Translate key="final_validation" module="configuration" fallback="Validation Finale" />
          </CardTitle>
          <CardDescription>
            <Translate 
              key="final_validation_description" 
              module="configuration" 
              fallback="Finalisez la configuration pour rendre la station opérationnelle" 
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div class="flex-1">
              <p class="text-sm text-muted-foreground">
                {#if progress === 100}
                  <Translate key="ready_to_activate" module="configuration" fallback="Prêt à activer la station" />
                {:else}
                  <Translate key="complete_all_steps" module="configuration" fallback="Complétez toutes les étapes pour activer la station" />
                {/if}
              </p>
            </div>
            <Button
              variant="default"
              disabled={progress < 100}
              onclick={() => goto(`/dashboard/configuration/${stationId}/resume`)}
            >
              <Translate key="activate_station" module="configuration" fallback="Activer la Station" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}
</div>