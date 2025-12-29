<script>
  import SessionExpiredPopover from '$lib/components/auth/SessionExpiredPopover.svelte';
  import { onMount, onDestroy } from 'svelte';

  // Écouter l'événement personnalisé 'sessionExpired' pour afficher le popover
  let showSessionExpiredPopover = $state(false);
  let popoverComponent = null;

  function handleSessionExpired() {
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

<slot />

{#if showSessionExpiredPopover}
  <SessionExpiredPopover bind:this={popoverComponent} />
{/if}