<script>
  import { Button } from "$lib/components/ui/button";
  import { setDarkMode, initDarkMode } from "$lib/utils";
  import { MoonIcon, SunIcon } from "lucide-svelte";
  import { onMount } from "svelte";

  let isDark = $state(false);

  onMount(() => {
    // Initialize the theme based on user preference or system setting
    initDarkMode();
    // Set the isDark state based on current theme
    isDark = document.documentElement.classList.contains('dark');
  });

  function toggleTheme() {
    isDark = !isDark;
    setDarkMode(isDark);
  }
</script>

<Button
  variant="ghost"
  size="icon"
  aria-label="Toggle theme"
  onclick={toggleTheme}
>
  {#if isDark}
    <SunIcon class="h-5 w-5" />
  {:else}
    <MoonIcon class="h-5 w-5" />
  {/if}
</Button>