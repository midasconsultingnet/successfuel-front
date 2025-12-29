<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import Popover from '$lib/components/ui/popover/popover.svelte';
  import PopoverTrigger from '$lib/components/ui/popover/popover-trigger.svelte';
  import PopoverContent from '$lib/components/ui/popover/popover-content.svelte';
  import Progress from '$lib/components/ui/progress/progress.svelte';
  
  let isOpen = $state(false);
  let progress = $state(100);
  let timer: number | null = null;
  const redirectDelay = 3000; // 3 secondes
  let timeRemaining = $state(redirectDelay);

  // Fonction pour ouvrir le popover
  export function open() {
    isOpen = true;
    progress = 100;
    timeRemaining = redirectDelay;
    
    // Démarrer la progression de la barre et la redirection
    timer = window.setInterval(() => {
      const elapsed = redirectDelay - timeRemaining;
      progress = Math.max(0, 100 - (elapsed / redirectDelay) * 100);
      
      if (timeRemaining <= 0) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        redirectToLogin();
      } else {
        timeRemaining -= 100; // Mettre à jour toutes les 100ms
      }
    }, 100);
  }

  // Fonction pour rediriger vers la page de login
  function redirectToLogin() {
    isOpen = false;
    goto('/login');
  }

  // Fonction pour forcer la redirection immédiate
  export function forceRedirect() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    redirectToLogin();
  }

  onMount(() => {
    // Initialiser l'état fermé
    isOpen = false;
  });

  onDestroy(() => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
</script>

<div class="fixed inset-0 flex items-start justify-center pointer-events-none z-50">
  <Popover {isOpen}>
    <PopoverTrigger>
      <!-- Bouton invisible - le popover est contrôlé par l'état -->
    </PopoverTrigger>
    <PopoverContent 
      class="w-80 p-4 pointer-events-auto"
      on:close={() => forceRedirect()}
    >
      <div class="flex flex-col space-y-3">
        <h3 class="font-semibold text-lg text-foreground">Session expirée</h3>
        <p class="text-sm text-muted-foreground">
          Votre session a expiré. Vous allez être redirigé vers la page de connexion.
        </p>
        <Progress value={progress} max={100} class="w-full" />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Redirection dans {Math.ceil(timeRemaining / 1000)}s</span>
          <button 
            class="text-primary hover:underline text-sm"
            on:click={forceRedirect}
          >
            Se connecter maintenant
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</div>