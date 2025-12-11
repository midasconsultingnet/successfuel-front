<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { i18nStore } from '$lib/i18n';
  import { get } from 'svelte/store';
  import Translate from "$lib/i18n/Translate.svelte";


  // UI Components
  import { Button } from '$lib/components/ui/button';
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Separator } from '$lib/components/ui/separator';
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
  import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '$lib/components/ui/navigation-menu';

  // Custom Components
  import LanguageSelector from './LanguageSelector.svelte';
  import Notifications from './Notifications.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import ThemeSelector from './ThemeSelector.svelte';

  // State
  let isSidebarOpen = $state(true);
  let isMobileMenuOpen = $state(false);

  // Navigation items
  interface NavItem {
    href: string;
    icon: string;
    titleKey: string; // Store the key instead of the translation
  }

  let navItems = $state<NavItem[]>([]);

  // Toggle functions
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  // Initialize navigation items with translation keys
  $effect(() => {
    navItems = [
      { href: '/dashboard', icon: '📊', titleKey: 'dashboard' },
      { href: '/dashboard/sales', icon: '💰', titleKey: 'sales' }
    ];
  });

  // Apply responsive behavior
  onMount(() => {
    if (browser) {
      // Set initial sidebar state based on screen size
      isSidebarOpen = window.innerWidth >= 768;

      // Handle window resize
      const handleResize = () => {
        if (window.innerWidth < 768) {
          isSidebarOpen = false;
        } else {
          // On larger screens, maintain the previous state or default to open
          isSidebarOpen = isSidebarOpen || true;
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  });
  
  // Props
  let { children } = $props();
</script>

<!-- Sidebar desktop - only show on medium and larger screens -->
<aside class={`fixed inset-y-0 left-0 z-50 bg-background border-r transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-16'} md:block hidden`}>
  <div class="flex h-full flex-col gap-2">
    <div class="flex h-full max-h-screen flex-col gap-2 p-2">
      <!-- Logo et titre dans la sidebar -->
      <div class="flex items-center gap-2 p-2 font-bold">
        <img src="/icon.png" alt="SuccessFuel Logo" class="h-8 w-8" />
        {#if isSidebarOpen}
          <Translate key="app_name" module="common" />
        {/if}
      </div>
      <div class="flex-1 overflow-auto">
        <nav class="flex flex-col gap-1">
          {#each navItems as item (item.href)}
            <a
              href={item.href}
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {#if isSidebarOpen}
                <span class="text-lg">{item.icon}</span>
                <Translate key={item.titleKey} module="navigation" />
              {:else}
                <span class="text-lg"
                      title={item.titleKey}
                >
                  {item.icon}
                </span>
              {/if}
            </a>
          {/each}
        </nav>
      </div>
      <Separator />
      <div class="px-3 py-2">
        {#if isSidebarOpen}
          <h3 class="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            User
          </h3>
          <div class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
            <Avatar class="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div class="flex-1">
              <p class="text-sm font-medium">Admin User</p>
              <p class="text-xs text-muted-foreground">admin@successfuel.com</p>
            </div>
          </div>
        {:else}
          <div class="flex justify-center">
            <Avatar class="h-8 w-8" title="Admin User">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        {/if}
      </div>
    </div>
  </div>
</aside>

<!-- Header with proper offset -->
<header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
  <div class="h-16 flex items-center">
    <div class="w-full">
      <div class="mx-auto h-full px-4 sm:px-6 lg:px-8">
        <div class={`flex h-16 items-center ${isSidebarOpen ? 'md:pl-64' : 'md:pl-16'}`}>
          <!-- Hamburger menu for mobile and sidebar toggle for desktop -->
          <div class="flex items-center gap-2 mr-2">
            <!-- Hamburger menu for mobile -->
            <Sheet bind:open={isMobileMenuOpen}>
              <SheetTrigger>
                <Button variant="ghost" size="icon" class="md:hidden">
                  <span>☰</span>
                  <span class="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div class="flex flex-col h-full">
                  <!-- Logo in mobile menu -->
                  <div class="flex items-center gap-2 p-4 font-bold border-b">
                    <img src="/icon.png" alt="SuccessFuel Logo" class="h-8 w-8" />
                    <Translate key="app_name" module="common" />
                  </div>
                  <div class="flex flex-col space-y-2 pt-4 flex-1">
                    {#each navItems as item (item.href)}
                      <a
                        href={item.href}
                        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                        onclick={() => isMobileMenuOpen = false}
                      >
                        <span class="text-lg">{item.icon}</span>
                        <Translate key={item.titleKey} module="navigation" />
                      </a>
                    {/each}
                  </div>
                  <Separator class="mt-auto" />
                  <div class="p-4">
                    <div class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
                      <Avatar class="h-8 w-8">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      <div>
                        <p class="text-sm font-medium">Admin User</p>
                        <p class="text-xs text-muted-foreground">admin@successfuel.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <!-- Toggle button for desktop sidebar -->
            <Button
              variant="ghost"
              size="icon"
              class="hidden md:flex"
              onclick={toggleSidebar}
            >
              {#if isSidebarOpen}
                <span class="text-lg">«</span>
              {:else}
                <span class="text-lg">»</span>
              {/if}
              <span class="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          <!-- Spacer to push right-aligned elements to the right -->
          <div class="flex-1"></div>

          <!-- Barre d'outils droite -->
          <div class="flex items-center gap-2 sm:gap-4">
            <!-- Icône de recherche -->
            <Dialog>
              <DialogTrigger>
                <button
                  class="p-2 rounded-full hover:bg-accent"
                  aria-label="Search"
                >
                  🔍
                </button>
              </DialogTrigger>
              <DialogContent class="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Search</DialogTitle>
                  <DialogDescription>
                    Search for anything in the application
                  </DialogDescription>
                </DialogHeader>
                <div class="flex items-center space-x-2">
                  <div class="grid flex-1 gap-2">
                    <Input id="search" placeholder="Search..." />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <!-- Sélecteur de langue -->
            <LanguageSelector />

            <!-- Notifications -->
            <Notifications />

            <!-- Theme Toggle -->
            <ThemeToggle />

            <!-- Theme Selector -->
            <ThemeSelector />

            <!-- Avatar utilisateur -->
            <Avatar class="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- Main content area with proper offset -->
<main class="pt-6">
  <div class={`w-full ${isSidebarOpen ? 'md:pl-64' : 'md:pl-16'}`}>
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      {@render children?.()}
    </div>
  </div>
</main>