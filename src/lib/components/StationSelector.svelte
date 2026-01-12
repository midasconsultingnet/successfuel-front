<script lang="ts">
  import * as Select from "$lib/components/ui/select/index.js";
  import { authStore } from "$lib/services/authStore";
  import Translate from "$lib/i18n/Translate.svelte";
  import BuildingIcon from "@lucide/svelte/icons/building-2";

  // États
  let selectedStationId = $state<string>("");
  let stations = $state<any[]>([]);

  // Fonction pour obtenir le libellé de la station sélectionnée
  const getSelectedStationLabel = () => {
    const station = stations.find(s => s.id === selectedStationId);
    return station ? `${station.nom} (${station.code})` : "Sélectionner une station";
  };

  // Gérer le changement de station
  const handleStationChange = (stationId: string) => {
    console.log("Station sélectionnée:", stationId);

    // Émettre un événement personnalisé pour notifier les autres parties de l'application
    const event = new CustomEvent('stationChanged', { detail: { stationId } });
    window.dispatchEvent(event);
  };

  // S'abonner aux changements d'authentification pour charger les stations
  $effect(() => {
    const unsubscribe = authStore.subscribe((authState) => {
      if (authState.user && authState.user.stations_accessibles) {
        stations = authState.user.stations_accessibles;

        // Sélectionner la première station si aucune n'est sélectionnée
        if (stations.length > 0 && !selectedStationId) {
          selectedStationId = stations[0].id;
        }
      }
    });

    // Nettoyer l'abonnement
    return () => {
      unsubscribe();
    };
  });
</script>

<div class="relative">
  <Select.Root type="single" bind:value={selectedStationId}>
    <Select.Trigger class="w-[220px] justify-between">
      <div class="flex items-center gap-2">
        <BuildingIcon class="size-4" />
        <span class="truncate">{getSelectedStationLabel()}</span>
      </div>
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>
          <Translate key="accessible_stations" module="common" fallback="Stations accessibles" />
        </Select.Label>
        {#each stations as station (station.id)}
          <Select.Item value={station.id} label={`${station.nom} (${station.code})`}>
            <div class="flex items-center gap-2">
              <span class="truncate">{station.nom}</span>
              <span class="text-xs text-muted-foreground truncate">({station.code})</span>
              {#if station.statut === 'actif'}
                <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <Translate key="active" module="common" fallback="Actif" />
                </span>
              {:else}
                <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                  <Translate key="inactive" module="common" fallback="Inactif" />
                </span>
              {/if}
            </div>
          </Select.Item>
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>