<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/services/authStore';
  import { authManager } from '$lib/services/AuthManager';
  import { goto } from '$app/navigation';
  import Translate from '$lib/i18n/Translate.svelte';
  import { i18nStore } from '$lib/i18n';
  import BuildingIcon from '@lucide/svelte/icons/building-2';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import { Button } from '$lib/components/ui/button';
  import { get } from 'svelte/store';

  // États
  let user = $state<any>(null);
  let stations = $state<any[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // État réactif pour le store i18n
  let i18nState = $state(get(i18nStore));

  // Mettre à jour l'état i18n quand le store change
  $effect(() => {
    const unsubscribe = i18nStore.subscribe(value => {
      i18nState = value;
    });

    // Nettoyer l'abonnement quand le composant est détruit
    return () => {
      unsubscribe();
    };
  });

  // Charger les données au montage
  onMount(async () => {
    try {
      // Attendre que l'authentification soit initialisée
      // Utiliser get() pour accéder à l'état du store
      const authState = get(authStore);
      if (!authState.isInitializing && authState.isAuthenticated) {
        user = authState.user;
        stations = authState.user?.stations_accessibles || [];
      } else {
        // Si l'utilisateur n'est pas authentifié, rediriger vers la page de login
        setTimeout(async () => {
          await goto('/login');
        }, 0);
        return;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue';
    } finally {
      isLoading = false;
    }
  });

  // Gérer la sélection d'une station
  const handleStationSelect = async (stationId: string) => {
    try {
      // Sauvegarder la station sélectionnée dans le localStorage
      localStorage.setItem('selectedStationId', stationId);
      
      // Émettre un événement personnalisé pour notifier les autres parties de l'application
      const event = new CustomEvent('stationChanged', { detail: { stationId } });
      window.dispatchEvent(event);
      
      // Rediriger vers le dashboard
      await goto('/dashboard');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue lors de la sélection de la station';
    }
  };

  // Gérer la déconnexion
  const handleLogout = async () => {
    try {
      await authManager.logout();
      await goto('/login');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue lors de la déconnexion';
    }
  };
</script>

<div class="min-h-screen flex flex-col bg-background">
  <!-- Header -->
  <header class="border-b">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo et titre -->
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <BuildingIcon class="h-4 w-4 text-muted-foreground" />
          </div>
          <span class="text-xl font-bold">
            <Translate key="app_name" module="common" />
          </span>
        </div>

        <!-- Informations utilisateur -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <span class="text-sm font-medium">
                {user?.prenom?.charAt(0) || user?.nom?.charAt(0) || user?.login?.charAt(0) || 'U'}
              </span>
            </div>
            <div class="hidden sm:block">
              <p class="text-sm font-medium">
                {user?.prenom ? `${user.prenom} ${user.nom}` : user?.nom || user?.login || 'Utilisateur'}
              </p>
              <p class="text-xs text-muted-foreground">
                {user?.role || 'Utilisateur'}
              </p>
            </div>
          </div>

          <!-- Bouton de déconnexion -->
          <Button
            variant="ghost"
            size="sm"
            class="flex items-center gap-2"
            onclick={() => handleLogout()}
          >
            <LogOutIcon class="h-4 w-4" />
            <span class="hidden sm:inline">
              <Translate key="logout" module="common" fallback="Déconnexion" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  </header>

  <!-- Contenu principal -->
  <main class="flex-1 py-8">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">
          <Translate key="station_selection" module="common" fallback="Sélection de station" />
        </h1>
        <p class="text-lg text-muted-foreground">
          <Translate
            key="select_station_prompt"
            module="common"
            fallback="Veuillez sélectionner une station pour continuer"
          />
        </p>
      </div>

      <!-- Grille des stations -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
        {#each stations as station (station.id)}
          <button
            type="button"
            class="group border rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-primary/50 bg-card flex flex-col h-full text-left"
            onclick={() => handleStationSelect(station.id)}
            aria-label={`Sélectionner la station ${station.nom}`}
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-3">
                <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors flex-1 truncate">
                  {station.nom}
                </h3>
                {#if station.statut === 'actif'}
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100 flex-shrink-0">
                    <Translate key="active" module="common" fallback="Actif" />
                  </span>
                {:else}
                  <span class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 flex-shrink-0">
                    <Translate key="inactive" module="common" fallback="Inactif" />
                  </span>
                {/if}
              </div>

              <div class="space-y-2 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-xs uppercase tracking-wide text-muted-foreground/80">
                    <Translate key="code" module="common" fallback="Code" />:
                  </span>
                  <span class="font-mono">{station.code}</span>
                </div>

                {#if station.ville}
                  <div class="flex items-center gap-2">
                    <span class="text-xs">📍</span>
                    <span>{station.ville}</span>
                  </div>
                {/if}

                {#if station.adresse}
                  <div class="flex items-start gap-2 pt-1">
                    <span class="text-xs mt-0.5">🏢</span>
                    <span class="text-xs text-muted-foreground/80 line-clamp-2">{station.adresse}</span>
                  </div>
                {/if}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
              <span class="text-xs text-muted-foreground">
                <Translate key="select_station" module="common" fallback="Sélectionner" />
              </span>
              <svg class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        {/each}
      </div>

      <!-- Message si aucune station disponible -->
      {#if stations.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <BuildingIcon class="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 class="text-2xl font-semibold text-foreground mb-2">
            <Translate key="no_stations_available" module="common" fallback="Aucune station disponible" />
          </h3>
          <p class="text-muted-foreground max-w-md">
            <Translate
              key="no_stations_message"
              module="common"
              fallback="Vous n'avez accès à aucune station. Veuillez contacter votre administrateur."
            />
          </p>
        </div>
      {/if}

      <!-- Indicateur de chargement -->
      {#if isLoading}
        <div class="flex items-center justify-center py-16">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      {/if}

      <!-- Message d'erreur -->
      {#if error}
        <div class="mt-8">
          <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 max-w-2xl mx-auto">
            <div class="flex items-center">
              <svg class="h-6 w-6 text-destructive mr-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <p class="text-base text-destructive">
                {error}
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <!-- Pied de page -->
  <footer class="border-t py-6">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <p class="text-center text-sm text-muted-foreground">
        <Translate
          key="copyright"
          module="common"
          fallback={`© ${new Date().getFullYear()} SuccessFuel. Tous droits réservés.`}
        />
      </p>
    </div>
  </footer>
</div>