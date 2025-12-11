<script lang="ts">
  import { onMount } from 'svelte';
  import { i18nStore, initializeI18n } from '$lib/i18n';
  import { get } from 'svelte/store';

  const { children } = $props();

  // État de chargement
  let isLoaded = $state(false);

  // Charger les traductions au montage
  onMount(async () => {
    await initializeI18n();
    isLoaded = true;
  });

  // Fonction de traduction réactive
  const t = (key: string, module: 'common' | 'navigation' = 'common') => {
    if (!isLoaded) return key; // Retourne la clé si non chargé

    const state = get(i18nStore);
    if (!state.isInitialized) return key;

    const keys = key.split('.');
    let current = state.resources[module];

    for (const k of keys) {
      if (current && typeof current === 'object' && current[k] !== undefined) {
        current = current[k];
      } else {
        return key; // Retourne la clé si la traduction n'est pas trouvée
      }
    }

    return typeof current === 'string' ? current : key;
  };

  // Fonction pour changer la langue
  const changeLanguage = async (language: 'en' | 'fr') => {
    const { setLanguage } = await import('$lib/i18n');
    await setLanguage(language);
  };

  // Exposer les fonctions et états
  export { t, changeLanguage, isLoaded };
</script>

<!-- Afficher le contenu seulement quand les traductions sont chargées -->
{#if isLoaded}
  {@render children?.()}
{:else}
  <!-- Afficher un indicateur de chargement -->
  <div class="i18n-loading">
    <p>Chargement des traductions...</p>
  </div>
{/if}