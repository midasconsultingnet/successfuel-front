<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { profileService } from '$lib/services/ProfileService';
  import { authStore } from '$lib/services/authStore';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Translate from '$lib/i18n/Translate.svelte';
  import { toast } from 'svelte-sonner';
  import { i18nStore, getTranslation } from '$lib/i18n';

  // États du formulaire
  let nom = $state('');
  let prenom = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  // États pour les placeholders
  let firstNamePlaceholder = $state('Prénom');
  let lastNamePlaceholder = $state('Nom');
  let emailPlaceholder = $state('Email');
  let passwordPlaceholder = $state('Enter your new password');
  let confirmPasswordPlaceholder = $state('Confirm your new password');

  // Abonner aux changements de traduction
  $effect(() => {
    const unsubscribe = i18nStore.subscribe((state) => {
      if (state.isInitialized) {
        firstNamePlaceholder = getTranslation(state.resources, 'first_name', 'profile');
        lastNamePlaceholder = getTranslation(state.resources, 'last_name', 'profile');
        emailPlaceholder = getTranslation(state.resources, 'email', 'profile');
        passwordPlaceholder = getTranslation(state.resources, 'password_placeholder', 'profile');
        confirmPasswordPlaceholder = getTranslation(state.resources, 'confirm_password_placeholder', 'profile');
      }
    });

    return () => unsubscribe();
  });

  // Récupérer les informations du profil au chargement
  onMount(async () => {
    try {
      const profile = await profileService.getProfile();
      nom = profile.nom || '';
      prenom = profile.prenom || '';
      email = profile.email || '';
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      error = 'Impossible de charger les informations du profil';
    }
  });

  // Gérer la mise à jour du profil
  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    isLoading = true;
    error = '';

    // Validation du prénom (obligatoire)
    if (!prenom || prenom.trim() === '') {
      error = getTranslation(get(i18nStore).resources, 'first_name_required', 'profile');
      isLoading = false;
      return;
    }

    // Validation simple
    if (password && password !== confirmPassword) {
      error = 'Les mots de passe ne correspondent pas';
      isLoading = false;
      return;
    }

    if (password && password.length < 8) {
      error = 'Le mot de passe doit contenir au moins 8 caractères';
      isLoading = false;
      return;
    }

    try {
      const updateData: any = { nom, prenom, email };
      if (password) {
        updateData.password = password;
      }

      await profileService.updateProfile(updateData);

      // Mettre à jour les informations dans le store
      authStore.checkAuth(); // Actualiser les données utilisateur

      toast.success(getTranslation(get(i18nStore).resources, 'profile_updated', 'profile'));
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      error = 'Erreur lors de la mise à jour du profil';
      toast.error('Erreur', {
        description: error
      });
    } finally {
      isLoading = false;
    }
  };

  // Réinitialiser le formulaire
  const handleReset = async () => {
    // Récupérer à nouveau les informations depuis le backend
    try {
      const profile = await profileService.getProfile();
      nom = profile.nom || '';
      prenom = profile.prenom || '';
      email = profile.email || '';
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      error = 'Impossible de charger les informations du profil';
    }
  };
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold">
      <Translate key="title" module="profile" fallback="Paramètres du profil" />
    </h1>
    <p class="text-muted-foreground">
      <Translate key="subtitle" module="profile" fallback="Gérez vos informations personnelles" />
    </p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>
        <Translate key="personal_info" module="profile" fallback="Informations personnelles" />
      </CardTitle>
      <CardDescription>
        <Translate key="subtitle" module="profile" fallback="Gérez vos informations personnelles" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form onsubmit={handleSubmit} class="space-y-6">
        {#if error}
          <div class="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="prenom">
              <Translate key="first_name" module="profile" fallback="Prénom" />
            </Label>
            <Input
              id="prenom"
              name="prenom"
              type="text"
              bind:value={prenom}
              placeholder={firstNamePlaceholder}
              disabled={isLoading}
              autocomplete="one-time-code"
            />
          </div>

          <div class="space-y-2">
            <Label for="nom">
              <Translate key="last_name" module="profile" fallback="Nom" />
            </Label>
            <Input
              id="nom"
              name="nom"
              type="text"
              bind:value={nom}
              placeholder={lastNamePlaceholder}
              disabled={isLoading}
              autocomplete="one-time-code"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="email">
            <Translate key="email" module="profile" fallback="Email" />
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            placeholder={emailPlaceholder}
            disabled={isLoading}
            autocomplete="one-time-code"
          />
        </div>

        <div class="space-y-2">
          <Label for="password">
            <Translate key="password" module="profile" fallback="Mot de passe" />
          </Label>
          <div class="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              bind:value={password}
              placeholder={passwordPlaceholder}
              disabled={isLoading}
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              onclick={() => showPassword = !showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {#if showPassword}
                👁️
              {:else}
                👁️‍🗨️
              {/if}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">
            <Translate key="confirm_password" module="profile" fallback="Confirmer le mot de passe" />
          </Label>
          <div class="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              bind:value={confirmPassword}
              placeholder={confirmPasswordPlaceholder}
              disabled={isLoading}
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              onclick={() => showConfirmPassword = !showConfirmPassword}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {#if showConfirmPassword}
                👁️
              {:else}
                👁️‍🗨️
              {/if}
            </button>
          </div>
        </div>

        <div class="flex space-x-4">
          <Button type="submit" disabled={isLoading}>
            {#if isLoading}
              <Translate key="updating" module="profile" fallback="Mise à jour..." />
            {:else}
              <Translate key="save" module="profile" fallback="Enregistrer" />
            {/if}
          </Button>

          <Button type="button" class="border border-input bg-background hover:bg-accent hover:text-accent-foreground" onclick={handleReset} disabled={isLoading}>
            <Translate key="cancel" module="profile" fallback="Annuler" />
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</div>