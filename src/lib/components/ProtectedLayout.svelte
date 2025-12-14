<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/services/authStore';
  import DashboardLayout from './DashboardLayout.svelte';
  
  let isAuthenticated = $state(false);
  let isLoading = $state(true);
  
  // Props
  let { children } = $props();
  
  onMount(async () => {
    // Vérifier l'état d'authentification
    const authState = get(authStore);
    
    if (!authState.isAuthenticated) {
      // Rediriger vers la page de login
      const currentPath = get(page).url.pathname;
      goto(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    isAuthenticated = true;
    isLoading = false;
  });
</script>

{#if isLoading}
  <div class="flex justify-center items-center h-screen">
    <p>Chargement...</p>
  </div>
{:else if isAuthenticated}
  <DashboardLayout>
    {@render children?.()}
  </DashboardLayout>
{:else}
  <!-- Cet état ne devrait jamais être atteint grâce à la redirection ci-dessus -->
  <div class="flex justify-center items-center h-screen">
    <p>Redirection...</p>
  </div>
{/if}