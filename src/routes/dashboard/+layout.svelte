<script>
  import "../dashboard/layout.css";
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import I18nProvider from "$lib/i18n/I18nProvider.svelte";
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/services/authStore';
  import SessionExpiredHandler from '$lib/components/auth/SessionExpiredHandler.svelte';

  let isAuthenticated = $state(false);
  let isLoading = $state(true);

  onMount(async () => {
    const authState = get(authStore);

    if (!authState.isAuthenticated) {
      // Rediriger vers la page de login avec redirection vers la page actuelle
      const currentPath = get(page).url.pathname;
      goto(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    isAuthenticated = true;
    isLoading = false;
  });

  // Props
  let { children } = $props();
</script>

<I18nProvider>
  <SessionExpiredHandler />
  {#if isLoading}
    <div class="flex justify-center items-center h-screen">
      <p>Chargement...</p>
    </div>
  {:else if isAuthenticated}
    
      <main>
        <DashboardLayout>
          {@render children?.()}
        </DashboardLayout>
      </main>
  {/if}
</I18nProvider>