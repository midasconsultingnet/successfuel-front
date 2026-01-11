<script lang="ts">
  import "../routes/layout.css";
  import I18nProvider from "$lib/i18n/I18nProvider.svelte";
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/services/authStore';
  import SessionExpiredHandler from '$lib/components/auth/SessionExpiredHandler.svelte';
  import { onMount } from 'svelte';

  // Effacer les tokens au démarrage de l'application pour forcer l'authentification
  onMount(() => {
    // Effacer les tokens d'authentification au démarrage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');

    // Réinitialiser l'état d'authentification
    authStore.logout();
  });

  // Props
  let { children } = $props();
</script>

<!-- Déterminer dynamiquement quel layout utiliser -->
<I18nProvider>
  {#if $page.url.pathname === '/'}
    <!-- Page publique (splash screen) -->
    {@render children?.()}
  {:else if $page.url.pathname.startsWith('/login') || $page.url.pathname.startsWith('/register')}
    <!-- Pages d'authentification -->
    {@render children?.()}
  {:else}
    <!-- Laisser les layouts enfants gérer leur propre logique (comme dashboard/+layout.svelte) -->
    {@render children?.()}
  {/if}
</I18nProvider>