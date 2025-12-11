<script lang="ts">
  import { i18nStore } from '$lib/i18n';
  import { get } from 'svelte/store';

  const { key = '', module = 'common' as const, fallback = undefined } = $props();

  // Obtenir l'état du store de manière réactive
  let storeState = $state(get(i18nStore));

  // Mettre à jour l'état quand le store change
  $effect(() => {
    const unsubscribe = i18nStore.subscribe(value => {
      storeState = value;
    });
    return unsubscribe;
  });

  // Calculer la traduction de façon réactive
  let translated = $derived(
    !storeState.isInitialized ? (fallback !== undefined ? fallback : key) :
    (() => {
      const keys = key.split('.');
      let current = storeState.resources[module];

      for (const part of keys) {
        if (current && typeof current === 'object' && current[part] !== undefined) {
          current = current[part];
        } else {
          return fallback !== undefined ? fallback : key; // Retourne le fallback ou la clé si la traduction n'est pas trouvée
        }
      }

      return typeof current === 'string' ? current : (fallback !== undefined ? fallback : key);
    })()
  );
</script>

{translated}