<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
  import { setTheme, applySavedTheme } from "$lib/utils";
  import { PaletteIcon } from "lucide-svelte";
  import { onMount } from "svelte";

  let selectedTheme = $state('default');

  onMount(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    selectedTheme = savedTheme;
    applySavedTheme();
  });

  const themes = [
    { id: 'default', name: 'Slate', description: 'Slate color palette' },
    { id: 'stone', name: 'Stone', description: 'Stone color palette' },
    { id: 'purple', name: 'Purple', description: 'Purple color palette' },
    { id: 'sky', name: 'Sky', description: 'Sky color palette' },
    { id: 'lime', name: 'Lime', description: 'Lime color palette' },
    { id: 'successfuel', name: 'SuccessFuel', description: 'SuccessFuel brand theme' }
  ];

  function selectTheme(themeId: string) {
    selectedTheme = themeId;
    setTheme(themeId);
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="icon" aria-label="Select theme">
      <PaletteIcon class="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {#each themes as theme}
      <DropdownMenuItem
        onclick={() => selectTheme(theme.id)}
        class={selectedTheme === theme.id ? 'bg-accent' : ''}
      >
        <div class="flex flex-col">
          <span class="font-medium">{theme.name}</span>
          <span class="text-xs text-muted-foreground">{theme.description}</span>
        </div>
      </DropdownMenuItem>
    {/each}
  </DropdownMenuContent>
</DropdownMenu>