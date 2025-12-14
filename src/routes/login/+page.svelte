<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/services/authStore';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import Translate from '$lib/i18n/Translate.svelte';
  import { getTranslation, i18nStore } from '$lib/i18n';

  // État du formulaire
  let loginValue = '';
  let passwordValue = '';
  let isLoading = false;
  let error = '';

  // Fonction utilitaire pour simuler un délai
  function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // Vérifier si l'utilisateur est déjà connecté
  onMount(async () => {
    const authState = get(authStore);
    if (authState.isAuthenticated) {
      goto('/dashboard');
    }

    // Simuler l'attente de chargement complet de la page de login avec les traductions
    await sleep(1); // Attendre 1 seconde pour simuler le chargement des composants et traductions
    console.log('Page de login chargée avec toutes les traductions');

    // Importer et utiliser invoke directement
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_complete', { task: 'frontend' });
      console.log('Page de login - Notification envoyée au backend avec succès');
    } catch (error) {
      console.error('Page de login - Erreur lors de l\'import ou de l\'exécution de invoke:', error);
    }
  });

  // Gérer la soumission du formulaire
  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    isLoading = true;
    error = '';

    try {
      await authStore.login({ login: loginValue, password: passwordValue });
      // Rediriger vers le dashboard après connexion réussie
      goto('/dashboard');
    } catch (err) {
      console.error('Erreur de connexion:', err);
      error = 'invalid_credentials'; // Utiliser la clé de traduction
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="min-h-screen flex items-center justify-center bg-muted p-4">
  <div class="w-full max-w-md">
    <Card>
      <CardHeader class="text-center space-y-2">
        <CardTitle class="text-2xl">
          <Translate key="login_title" module="common" fallback="Connexion à votre compte" />
        </CardTitle>
        <CardDescription>
          <Translate key="login_subtitle" module="common" fallback="Entrez vos identifiants pour accéder à votre compte" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form on:submit={handleSubmit} class="space-y-6">
          <div class="space-y-4">
            {#if error}
              <div class="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md text-sm">
                <Translate key={error} module="common" fallback="Invalid credentials. Please try again." />
              </div>
            {/if}

            <div class="space-y-2">
              <Label for="login">
                <Translate key="username" module="common" fallback="Nom d'utilisateur" />
              </Label>
              <Input
                id="login"
                name="login"
                type="text"
                required
                bind:value={loginValue}
                placeholder={get(authStore) ? getTranslation(get(i18nStore).resources, 'username_placeholder', 'common') : 'Enter your username'}
                disabled={isLoading}
                autocomplete="one-time-code"
              />
            </div>

            <div class="space-y-2">
              <Label for="password">
                <Translate key="password" module="common" fallback="Mot de passe" />
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                bind:value={passwordValue}
                placeholder={get(authStore) ? getTranslation(get(i18nStore).resources, 'password_placeholder', 'common') : 'Enter your password'}
                disabled={isLoading}
                autocomplete="one-time-code"
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <!-- Pourrait être utilisé pour "Se souvenir de moi" -->
            </div>
          </div>

          <Button
            type="submit"
            class="w-full"
            disabled={isLoading}
          >
            {#if isLoading}
              <Translate key="logging_in" module="common" fallback="Connexion en cours..." />
            {:else}
              <Translate key="sign_in" module="common" fallback="Se connecter" />
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>