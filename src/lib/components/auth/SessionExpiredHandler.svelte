<script lang="ts">
  import SessionExpiredPopover from '$lib/components/auth/SessionExpiredPopover.svelte';
  import { onMount, onDestroy } from 'svelte';

  // Définir children comme propriété pour permettre le rendu du contenu parent
  let { children } = $props<{ children: any }>();

  // Écouter l'événement personnalisé 'sessionExpired' pour afficher le popover
  let showSessionExpiredPopover = $state(false);
  let popoverComponent: any = $state(null);
  let lastEventTime = $state(0);
  const debounceTime = 1000; // 1 seconde de décalage pour éviter les doubles événements

  function handleSessionExpired() {
    const currentTime = Date.now();
    // Empêcher le traitement des événements trop rapprochés
    if (currentTime - lastEventTime < debounceTime) {
      return;
    }

    lastEventTime = currentTime;
    showSessionExpiredPopover = true;
    // Appeler la fonction open() du composant popover
    if (popoverComponent) {
      popoverComponent.open();
    }
  }

  onMount(() => {
    window.addEventListener('sessionExpired', handleSessionExpired);
  });

  onDestroy(() => {
    window.removeEventListener('sessionExpired', handleSessionExpired);
  });
</script>

{@render children?.()}