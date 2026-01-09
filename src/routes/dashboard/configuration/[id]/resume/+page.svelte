<script lang="ts">
  import { onMount } from 'svelte';
  import { stationService } from '$lib/services/StationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import { AlertCircle, CheckCircle2, Fuel, Users, Briefcase, PiggyBank, FileText } from 'lucide-svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Spinner } from '$lib/components/ui/spinner';

  // Récupérer les données de la page
  let stationId = $state<string>('');
  let stationData = $state<any>(null);

  // Charger l'ID de la station depuis les données du layout
  $effect(() => {
    const unsubscribe = page.subscribe((data) => {
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
        stationData = data.data.station;
      }
    });
    return unsubscribe;
  });

  // États
  let loading = $state(false);
  let error = $state<string | null>(null);
  let activationLoading = $state(false);

  // Fonction pour activer la station
  async function activateStation() {
    if (!stationId) return;

    try {
      activationLoading = true;

      // Appeler l'API pour activer la station
      await stationService.activateStation(stationId);

      // Afficher un message de succès
      toast.success(
        get(i18nStore).resources?.configuration?.activation_success_title || 'Activation réussie',
        {
          description: get(i18nStore).resources?.configuration?.activation_success_description || 'La station a été activée avec succès et est maintenant opérationnelle'
        }
      );

      // Rediriger vers le tableau de bord
      goto('/dashboard');
    } catch (err) {
      console.error('Erreur lors de l\'activation de la station:', err);

      // Afficher un message d'erreur
      toast.error(
        get(i18nStore).resources?.configuration?.activation_error_title || 'Erreur d\'activation',
        {
          description: get(i18nStore).resources?.configuration?.activation_error_description || 'Une erreur est survenue lors de l\'activation de la station'
        }
      );
    } finally {
      activationLoading = false;
    }
  }

  // Fonction pour revenir à la page de configuration
  function goBackToConfiguration() {
    goto(`/dashboard/configuration/${stationId}`);
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="activation_summary" module="configuration" fallback="Résumé d'Activation" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="activation_summary_description"
        module="configuration"
        fallback="Vérifiez toutes les configurations avant d'activer la station"
      />
    </p>
  </div>

  {#if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4" />
        <span class="font-medium">
          <Translate key="error" module="common" fallback="Erreur" />
        </span>
      </div>
      <p class="mt-2">{error}</p>
    </div>
  {:else if stationData}
    <!-- Carte d'identification de la station -->
    <Card>
      <CardHeader class="flex flex-row items-center space-x-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
          ⛽
        </div>
        <div>
          <CardTitle class="text-xl">
            {get(i18nStore).resources?.configuration?.current_station
              ? get(i18nStore).resources?.configuration?.current_station.replace('{stationName}', stationData.name || 'Station Inconnue')
              : `Station: ${stationData.name || 'Station Inconnue'}`}
          </CardTitle>
          <p class="text-sm text-muted-foreground">
            <Translate key="code" module="common" fallback="Code" />: {stationData.code || 'N/A'} | {stationData.address || 'Adresse inconnue'}
          </p>
        </div>
      </CardHeader>
    </Card>

    <!-- Section de résumé des configurations -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Infrastructure -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Fuel class="w-5 h-5" />
            <Translate key="infrastructure_setup" module="configuration" fallback="Infrastructure" />
          </CardTitle>
          <CardDescription>
            <Translate key="fuel_tanks_pumps_setup" module="configuration" fallback="Configuration des carburants, réservoirs et pompes" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>
                <Translate key="fuel" module="configuration" fallback="Carburants" />
              </span>
              <Badge variant={stationData.config?.completion?.infrastructure?.overall ? "default" : "secondary"}>
                {stationData.config?.completion?.infrastructure?.overall
                  ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
                  : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Partenaires -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Users class="w-5 h-5" />
            <Translate key="partner_setup" module="configuration" fallback="Partenaires" />
          </CardTitle>
          <CardDescription>
            <Translate key="suppliers_customers_setup" module="configuration" fallback="Configuration des fournisseurs et clients" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>
                <Translate key="partners" module="configuration" fallback="Partenaires" />
              </span>
              <Badge variant={stationData.config?.completion?.partners?.overall ? "default" : "secondary"}>
                {stationData.config?.completion?.partners?.overall
                  ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
                  : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Employés -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Briefcase class="w-5 h-5" />
            <Translate key="employee_setup" module="configuration" fallback="Employés" />
          </CardTitle>
          <CardDescription>
            <Translate key="staff_salary_setup" module="configuration" fallback="Configuration du personnel et des salaires" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>
                <Translate key="employees" module="configuration" fallback="Employés" />
              </span>
              <Badge variant={stationData.config?.completion?.employees?.overall ? "default" : "secondary"}>
                {stationData.config?.completion?.employees?.overall
                  ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
                  : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Finances -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <PiggyBank class="w-5 h-5" />
            <Translate key="finance_setup" module="configuration" fallback="Finances" />
          </CardTitle>
          <CardDescription>
            <Translate key="treasury_payment_setup" module="configuration" fallback="Configuration des trésoreries et méthodes de paiement" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>
                <Translate key="finances" module="configuration" fallback="Finances" />
              </span>
              <Badge variant={stationData.config?.completion?.finances?.overall ? "default" : "secondary"}>
                {stationData.config?.completion?.finances?.overall
                  ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
                  : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Bilan -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="w-5 h-5" />
            <Translate key="balance_setup" module="configuration" fallback="Bilan" />
          </CardTitle>
          <CardDescription>
            <Translate key="initial_balance_setup" module="configuration" fallback="Configuration des soldes initiaux et évaluations" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>
                <Translate key="balance" module="configuration" fallback="Bilan" />
              </span>
              <Badge variant={stationData.config?.completion?.balance?.overall ? "default" : "secondary"}>
                {stationData.config?.completion?.balance?.overall
                  ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
                  : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Section de confirmation -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <CheckCircle2 class="w-5 h-5" />
          <Translate key="final_confirmation" module="configuration" fallback="Confirmation Finale" />
        </CardTitle>
        <CardDescription>
          <Translate
            key="final_confirmation_description"
            module="configuration"
            fallback="Toutes les configurations sont terminées. Confirmez pour activer la station."
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex-1">
            <p class="text-sm text-muted-foreground">
              <Translate
                key="ready_to_activate_description"
                module="configuration"
                fallback="La station est prête à être activée. Toutes les configurations nécessaires sont terminées."
              />
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              onclick={goBackToConfiguration}
            >
              <Translate key="back" module="common" fallback="Retour" />
            </Button>
            <Dialog>
              <DialogTrigger>
                <Button
                  variant="default"
                  disabled={activationLoading}
                >
                  <Translate key="activate_station" module="configuration" fallback="Activer la Station" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    <Translate key="confirm_activation" module="configuration" fallback="Confirmer l'activation" />
                  </DialogTitle>
                  <DialogDescription>
                    <Translate
                      key="confirm_activation_description"
                      module="configuration"
                      fallback="Êtes-vous sûr de vouloir activer cette station ? Cette action rendra la station opérationnelle."
                    />
                  </DialogDescription>
                </DialogHeader>
                <div class="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onclick={() => {}}
                  >
                    <Translate key="cancel" module="common" fallback="Annuler" />
                  </Button>
                  <Button
                    variant="default"
                    onclick={activateStation}
                    disabled={activationLoading}
                  >
                    {#if activationLoading}
                      <span>{get(i18nStore).resources?.common?.activating || 'Activation...'}</span>
                      <Spinner class="ml-2 h-4 w-4" />
                    {:else}
                      <span>{get(i18nStore).resources?.configuration?.activate_station || 'Activer la Station'}</span>
                    {/if}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>