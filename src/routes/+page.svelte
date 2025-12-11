<script>
  import { onMount } from 'svelte';

  // Afficher le splashscreen avec l'image animée pendant 10 secondes
  async function setup() {
    console.log('Splashscreen démarré avec image animée');
  }

  // Exécuter l'initialisation au chargement de la page
  onMount(async () => {
    await setup();
  });
</script>

<style>
  .splash-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 97vw;
    height: 97vh;
    background: white;
  }

  .logo-container {
    text-align: center;
  }

  .logo-image {
    width: 360px;
    height: 360px;
    margin-bottom: 2rem;
  }
</style>

<div class="splash-container">
  <div class="logo-container">
    <img src="/splash.gif" alt="SuccessFuel Animation" class="logo-image" />
  </div>
</div>