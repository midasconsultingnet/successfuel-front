<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService } from '$lib/services/ConfigurationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Progress } from '$lib/components/ui/progress';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { get } from 'svelte/store';
  
  // États
  let configurationState: any = $state(null);
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
      route: '/dashboard/configuration/infrastructure',
      completed: false
    },
    {
      id: 'partners',
      title: 'partner_setup',
      description: 'suppliers_customers_setup',
      icon: '👥',
      route: '/dashboard/configuration/partners',
      completed: false
    },
    {
      id: 'employees',
      title: 'employee_setup',
      description: 'staff_salary_setup',
      icon: '👷',
      route: '/dashboard/configuration/employees',
      completed: false
    },
    {
      id: 'finances',
      title: 'finance_setup',
      description: 'treasury_payment_setup',
      icon: '💰',
      route: '/dashboard/configuration/finances',
      completed: false
    },
    {
      id: 'balance',
      title: 'balance_setup',
      description: 'initial_balance_setup',
      icon: '📋',
      route: '/dashboard/configuration/balance',
      completed: false
    }
  ]);
  
  // Fonction pour charger l'état de configuration
  async function loadConfigurationState() {
    try {
      loading = true;
      // Dans une application réelle, vous devriez obtenir l'ID de la station via le contexte de l'utilisateur
      // ou d'autres mécanismes de votre application
      // Pour l'instant, simulons une station avec un ID factice
      const mockStationId = 'mock_station_id';
      configurationState = await configurationService.getConfigurationState(mockStationId);

      // Mise à jour des statuts de complétion
      updateCompletionStatus();

      // Calcul du progrès global
      calculateProgress();
    } catch (err) {
      console.error('Erreur lors du chargement de l\'état de configuration:', err);
      error = 'Impossible de charger l\'état de configuration';

      // Pour le développement, on peut afficher une configuration vide
      configurationState = {
        id: 'mock_config_id',
        station_id: 'mock_station_id',
        infrastructure_complete: false,
        partners_complete: false,
        employees_complete: false,
        finances_complete: false,
        balance_complete: false,
        is_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      updateCompletionStatus();
      calculateProgress();
    } finally {
      loading = false;
    }
  }
  
  // Mise à jour des statuts de complétion
  function updateCompletionStatus() {
    if (!configurationState) return;
    
    configSteps[0].completed = configurationState.infrastructure_complete;
    configSteps[1].completed = configurationState.partners_complete;
    configSteps[2].completed = configurationState.employees_complete;
    configSteps[3].completed = configurationState.finances_complete;
    configSteps[4].completed = configurationState.balance_complete;
  }
  
  // Calcul du progrès global
  function calculateProgress() {
    const completedSteps = configSteps.filter(step => step.completed).length;
    progress = (completedSteps / configSteps.length) * 100;
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

  // Charge l'état au montage
  onMount(() => {
    loadConfigurationState();
  });
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
                <Badge variant={step.completed ? "default" : "secondary"}>
                  {#if step.completed}
                    <Translate key="completed" module="configuration" fallback="Complété" />
                  {:else}
                    <Translate key="pending" module="configuration" fallback="En attente" />
                  {/if}
                </Badge>
                <Button
                  variant="outline"
                  disabled={getStepDependency(step.id) !== null && !getStepDependency(step.id) && !step.completed}
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
            >
              <Translate key="activate_station" module="configuration" fallback="Activer la Station" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}
</div>