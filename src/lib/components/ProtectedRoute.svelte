<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/services/authStore';
  import { isAuthenticated } from '$lib/utils/authUtils';

  let { fallback = '/login', redirectToCurrent = true, children } = $props<{
    fallback?: string;
    redirectToCurrent?: boolean;
    children?: any;
  }>();

  let isAuthorized = $state(false);
  let isLoading = $state(true);

  onMount(async () => {
    const authState = get(authStore);

    if (!authState.isAuthenticated) {
      // Rediriger vers la page de login avec redirection vers la page actuelle
      const redirectPath = redirectToCurrent ? get(page).url.pathname : fallback;
      goto(`/login?redirectTo=${encodeURIComponent(redirectPath)}`);
      return;
    }

    // Mise à jour de l'état d'autorisation
    isAuthorized = true;
    isLoading = false;
  });
</script>

{#if isLoading}
  <div class="flex justify-center items-center h-screen">
    <p>Chargement...</p>
  </div>
{:else if isAuthorized}
  {@render children?.()}
{/if}