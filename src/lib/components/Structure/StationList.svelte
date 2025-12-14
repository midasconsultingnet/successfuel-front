<script lang="ts">
  import { onMount } from 'svelte';
  import { stationService, type Station } from '$lib/services/StationService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { getTranslation } from '$lib/i18n';
  import { goto } from '$app/navigation';

  // UI Components
  import { Button } from '$lib/components/ui/button';
  import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
  } from '$lib/components/ui/dialog';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';

  // State
  let stations: Station[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Dialog states
  let isCreateDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let editingStation: Station | null = $state(null);

  // Form states
  let formData = $state({
    nom: '',
    code: '',
    adresse: '',
    coordonnees_gps: ''
  });

  let formErrors = $state<Record<string, string>>({});

  // Derived state pour les traductions
  let translations = $derived($i18nStore.resources);

  // Charger les stations
  async function loadStations() {
    try {
      loading = true;
      error = null;
      stations = await stationService.getStations();
    } catch (err) {
      console.error('Erreur lors du chargement des stations:', err);
      error = (err as Error).message || 'Erreur lors du chargement des stations';
    } finally {
      loading = false;
    }
  }

  // Gestion des formulaires
  function handleCreateStation(event: SubmitEvent) {
    event.preventDefault();
    formErrors = {};

    // Validation simple
    if (!formData.nom.trim()) {
      formErrors.nom = getTranslation($i18nStore.resources, 'name_required', 'common') || 'Le nom est requis';
      return;
    }
    if (!formData.code.trim()) {
      formErrors.code = getTranslation($i18nStore.resources, 'code_required', 'common') || 'Le code est requis';
      return;
    }
    if (!formData.adresse.trim()) {
      formErrors.adresse = getTranslation($i18nStore.resources, 'address_required', 'common') || 'L\'adresse est requise';
      return;
    }

    // Appel API pour créer la station
    stationService.createStation({
      nom: formData.nom,
      code: formData.code,
      adresse: formData.adresse,
      coordonnees_gps: formData.coordonnees_gps
    })
      .then((newStation) => {
        stations = [...stations, newStation];
        isCreateDialogOpen = false;
        resetForm();

        // Notification de succès
        toast.success(
          getTranslation($i18nStore.resources, 'success', 'common') || 'Succès',
          {
            description: getTranslation($i18nStore.resources, 'station_created_success', 'structure') || 'Station créée avec succès'
          }
        );
      })
      .catch((err) => {
        console.error('Erreur lors de la création de la station:', err);
        formErrors.global = err.message || getTranslation($i18nStore.resources, 'error_creating_station', 'structure') || 'Erreur lors de la création de la station';

        // Notification d'erreur
        toast.error(
          getTranslation($i18nStore.resources, 'error', 'common') || 'Erreur',
          {
            description: getTranslation($i18nStore.resources, 'error_creating_station', 'structure') || 'Erreur lors de la création de la station'
          }
        );
      });
  }

  function handleEditStation(event: SubmitEvent) {
    event.preventDefault();
    if (!editingStation) return;

    formErrors = {};

    // Validation simple
    if (!formData.nom.trim()) {
      formErrors.nom = getTranslation($i18nStore.resources, 'name_required', 'common') || 'Le nom est requis';
      return;
    }
    if (!formData.code.trim()) {
      formErrors.code = getTranslation($i18nStore.resources, 'code_required', 'common') || 'Le code est requis';
      return;
    }
    if (!formData.adresse.trim()) {
      formErrors.adresse = getTranslation($i18nStore.resources, 'address_required', 'common') || 'L\'adresse est requise';
      return;
    }

    // Appel API pour mettre à jour la station
    stationService.updateStation(editingStation.id, {
      nom: formData.nom,
      code: formData.code,
      adresse: formData.adresse,
      coordonnees_gps: formData.coordonnees_gps
    })
      .then((updatedStation) => {
        stations = stations.map(s => s.id === updatedStation.id ? updatedStation : s);
        isEditDialogOpen = false;
        resetForm();

        // Notification de succès
        toast.success(
          getTranslation($i18nStore.resources, 'success', 'common') || 'Succès',
          {
            description: getTranslation($i18nStore.resources, 'station_updated_success', 'structure') || 'Station mise à jour avec succès'
          }
        );
      })
      .catch((err) => {
        console.error('Erreur lors de la mise à jour de la station:', err);
        formErrors.global = err.message || getTranslation($i18nStore.resources, 'error_updating_station', 'structure') || 'Erreur lors de la mise à jour de la station';

        // Notification d'erreur
        toast.error(
          getTranslation($i18nStore.resources, 'error', 'common') || 'Erreur',
          {
            description: getTranslation($i18nStore.resources, 'error_updating_station', 'structure') || 'Erreur lors de la mise à jour de la station'
          }
        );
      });
  }

  function resetForm() {
    formData = {
      nom: '',
      code: '',
      adresse: '',
      coordonnees_gps: ''
    };
    formErrors = {};
  }

  function openEditDialog(station: Station) {
    editingStation = station;
    const stationAdresse = station.adresse || '';
    const stationCoordonnees = station.coordonnees_gps || '';

    formData = {
      nom: station.nom,
      code: station.code,
      adresse: stationAdresse,
      coordonnees_gps: stationCoordonnees
    };
    isEditDialogOpen = true;
  }

  function handleDeleteStation(stationId: string) {
    if (confirm(getTranslation($i18nStore.resources, 'confirm_delete_station', 'structure') || 'Êtes-vous sûr de vouloir supprimer cette station ?')) {
      stationService.deleteStation(stationId)
        .then(() => {
          stations = stations.filter(s => s.id !== stationId);

          // Notification de succès
          toast.success(
            getTranslation($i18nStore.resources, 'success', 'common') || 'Succès',
            {
              description: getTranslation($i18nStore.resources, 'station_deleted_success', 'structure') || 'Station supprimée avec succès'
            }
          );
        })
        .catch((err) => {
          console.error('Erreur lors de la suppression de la station:', err);

          // Notification d'erreur
          toast.error(
            getTranslation($i18nStore.resources, 'error', 'common') || 'Erreur',
            {
              description: getTranslation($i18nStore.resources, 'error_deleting_station', 'structure') || 'Erreur lors de la suppression de la station'
            }
          );
        });
    }
  }

  function handleStationAction(station: Station) {
    if (station.statut === 'actif') {
      // Rediriger vers la station (à implémenter dans un module futur)
      console.log('Accéder à la station actif:', station.id);
    } else {
      // Rediriger vers la page de configuration de la station
      goto(`/dashboard/configuration/${station.id}`);
    }
  }

  // Charger les stations au montage
  onMount(loadStations);
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="structure" module="common" fallback="Structure" />
    </h1>
    <Dialog bind:open={isCreateDialogOpen}>
      <DialogTrigger>
        <Button>
          <Translate key="add_station" module="structure" fallback="Ajouter une station" />
        </Button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Translate key="add_station" module="common" fallback="Ajouter une station" />
          </DialogTitle>
          <DialogDescription>
            <Translate
              key="add_station_description"
              module="common"
              fallback="Entrez les informations de la nouvelle station"
            />
          </DialogDescription>
        </DialogHeader>
        <form onsubmit={handleCreateStation} class="grid gap-4 py-4">
          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="nom">
              <Translate key="name" module="common" fallback="Nom" />
            </Label>
            <Input
              id="nom"
              bind:value={formData.nom}
              placeholder="Nom de la station"
              class={formErrors.nom ? 'border-red-500' : ''}
            />
            {#if formErrors.nom}
              <p class="text-sm text-red-500">{formErrors.nom}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="code">
              <Translate key="code" module="common" fallback="Code" />
            </Label>
            <Input
              id="code"
              bind:value={formData.code}
              placeholder="Code de la station"
              autocomplete="one-time-code"
              class={formErrors.code ? 'border-red-500' : ''}
            />
            {#if formErrors.code}
              <p class="text-sm text-red-500">{formErrors.code}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="adresse">
              <Translate key="address" module="common" fallback="Adresse" />
            </Label>
            <Input
              id="adresse"
              bind:value={formData.adresse}
              placeholder="Adresse de la station"
              autocomplete="one-time-code"
              class={formErrors.adresse ? 'border-red-500' : ''}
            />
            {#if formErrors.adresse}
              <p class="text-sm text-red-500">{formErrors.adresse}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="coordonnees_gps">
              <Translate key="coordinates" module="common" fallback="Coordonnées GPS" />
            </Label>
            <Input
              id="coordonnees_gps"
              bind:value={formData.coordonnees_gps}
              placeholder="Coordonnées GPS"
              autocomplete="one-time-code"
            />
          </div>

          {#if formErrors.global}
            <div class="text-sm text-red-500 bg-red-50 p-2 rounded">
              {formErrors.global}
            </div>
          {/if}

          <div class="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onclick={() => {
                isCreateDialogOpen = false;
                resetForm();
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button type="submit">
              <Translate key="save" module="common" fallback="Enregistrer" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>

  {#if loading}
    <Card>
      <CardContent class="p-6 flex justify-center items-center h-64">
        <Spinner />
        <span class="ml-2">
          <Translate key="loading" module="common" fallback="Chargement..." />
        </span>
      </CardContent>
    </Card>
  {:else if error}
    <Card>
      <CardContent class="p-6 text-center text-red-500">
        {error}
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>
          <Translate key="stations" module="structure" fallback="Stations" />
        </CardTitle>
        <CardDescription>
          <Translate key="stations_description" module="structure" fallback="Liste des stations de votre réseau" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Translate key="name" module="common" fallback="Nom" />
                </TableHead>
                <TableHead>
                  <Translate key="code" module="common" fallback="Code" />
                </TableHead>
                <TableHead>
                  <Translate key="address" module="common" fallback="Adresse" />
                </TableHead>
                <TableHead>
                  <Translate key="coordinates" module="structure" fallback="Coordonnées GPS" />
                </TableHead>
                <TableHead>
                  <Translate key="created_at" module="common" fallback="Créé le" />
                </TableHead>
                <TableHead class="text-right">
                  <Translate key="actions" module="common" fallback="Actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each stations as station (station.id)}
                <TableRow>
                  <TableCell class="font-medium">{station.nom}</TableCell>
                  <TableCell>{station.code}</TableCell>
                  <TableCell>{station.adresse}</TableCell>
                  <TableCell>{station.coordonnees_gps}</TableCell>
                  <TableCell>
                    {new Date(station.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => openEditDialog(station)}
                      >
                        <Translate key="edit" module="common" fallback="Éditer" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => handleDeleteStation(station.id)}
                      >
                        <Translate key="delete" module="common" fallback="Supprimer" />
                      </Button>
                      <Button
                        size="sm"
                        onclick={() => handleStationAction(station)}
                      >
                        {#if translations && translations.structure}
                          {station.statut === 'actif'
                            ? translations.structure['enter_station']
                            : translations.structure['continue_configuration']}
                        {/if}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Dialog d'édition -->
  {#if editingStation}
    <Dialog bind:open={isEditDialogOpen}>
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Translate key="edit_station" module="common" fallback="Éditer la station" />
          </DialogTitle>
          <DialogDescription>
            <Translate 
              key="edit_station_description" 
              module="common" 
              fallback="Modifiez les informations de la station" 
            />
          </DialogDescription>
        </DialogHeader>
        <form onsubmit={handleEditStation} class="grid gap-4 py-4">
          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="edit-nom">
              <Translate key="name" module="common" fallback="Nom" />
            </Label>
            <Input
              id="edit-nom"
              bind:value={formData.nom}
              placeholder="Nom de la station"
              autocomplete="one-time-code"
              class={formErrors.nom ? 'border-red-500' : ''}
            />
            {#if formErrors.nom}
              <p class="text-sm text-red-500">{formErrors.nom}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="edit-code">
              <Translate key="code" module="common" fallback="Code" />
            </Label>
            <Input
              id="edit-code"
              bind:value={formData.code}
              placeholder="Code de la station"
              autocomplete="one-time-code"
              class={formErrors.code ? 'border-red-500' : ''}
            />
            {#if formErrors.code}
              <p class="text-sm text-red-500">{formErrors.code}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="edit-adresse">
              <Translate key="address" module="common" fallback="Adresse" />
            </Label>
            <Input
              id="edit-adresse"
              bind:value={formData.adresse}
              placeholder="Adresse de la station"
              autocomplete="one-time-code"
              class={formErrors.adresse ? 'border-red-500' : ''}
            />
            {#if formErrors.adresse}
              <p class="text-sm text-red-500">{formErrors.adresse}</p>
            {/if}
          </div>

          <div class="grid w-full max-w-sm items-center gap-1.5">
            <Label for="edit-coordonnees_gps">
              <Translate key="coordinates" module="common" fallback="Coordonnées GPS" />
            </Label>
            <Input
              id="edit-coordonnees_gps"
              bind:value={formData.coordonnees_gps}
              placeholder="Coordonnées GPS"
              autocomplete="one-time-code"
            />
          </div>

          {#if formErrors.global}
            <div class="text-sm text-red-500 bg-red-50 p-2 rounded">
              {formErrors.global}
            </div>
          {/if}

          <div class="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onclick={() => {
                isEditDialogOpen = false;
                resetForm();
              }}
            >
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            <Button type="submit">
              <Translate key="save" module="common" fallback="Enregistrer" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  {/if}
</div>