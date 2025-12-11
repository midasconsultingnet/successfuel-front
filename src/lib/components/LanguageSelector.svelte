<script lang="ts">
  import { i18nStore } from '$lib/i18n';
  import { get } from 'svelte/store';

  let currentLanguage = $state('en');

  // Charger la langue initiale
  $effect(() => {
    const unsubscribe = i18nStore.subscribe(state => {
      if (state.isInitialized) {
        currentLanguage = state.currentLanguage;
      }
    });

    return unsubscribe;
  });

  async function switchLanguage(lang: string) {
    // Importer dynamiquement pour éviter les problèmes d'import circulaire
    const { setLanguage } = await import('$lib/i18n');
    await setLanguage(lang as 'en' | 'fr');
  }
</script>

<div class="language-selector">
  <button
    class="lang-btn"
    class:active={currentLanguage === 'en'}
    onclick={() => switchLanguage('en')}
    aria-label="Switch to English"
  >
    EN
  </button>
  <span class="separator">|</span>
  <button
    class="lang-btn"
    class:active={currentLanguage === 'fr'}
    onclick={() => switchLanguage('fr')}
    aria-label="Switch to French"
  >
    FR
  </button>
</div>

<style>
  .language-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lang-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }

  .lang-btn:hover {
    background-color: var(--muted);
  }

  .lang-btn.active {
    background-color: var(--accent);
    font-weight: bold;
  }

  .separator {
    color: var(--muted-foreground);
  }
</style>