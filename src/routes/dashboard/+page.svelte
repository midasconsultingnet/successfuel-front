<script lang="ts">
  import { onMount } from 'svelte';
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import Translate from "$lib/i18n/Translate.svelte";

  // Données factices pour les indicateurs clés
  const fuelTypes = [
    { name: "Super 95", level: 78, capacity: 10000, unit: "L" },
    { name: "Diesel", level: 45, capacity: 12000, unit: "L" },
    { name: "Super 98", level: 23, capacity: 5000, unit: "L" },
  ];

  const salesData = [
    { day: "Lun", amount: 2400 },
    { day: "Mar", amount: 1398 },
    { day: "Mer", amount: 9800 },
    { day: "Jeu", amount: 3908 },
    { day: "Ven", amount: 4800 },
    { day: "Sam", amount: 3800 },
    { day: "Dim", amount: 4300 },
  ];

  const recentTransactions = [
    { id: 1, customer: "Jean Dupont", fuelType: "Super 95", amount: 65.50, date: "2024-12-01" },
    { id: 2, customer: "Marie Lambert", fuelType: "Diesel", amount: 85.20, date: "2024-12-01" },
    { id: 3, customer: "Pierre Martin", fuelType: "Super 95", amount: 52.30, date: "2024-11-30" },
    { id: 4, customer: "Sophie Bernard", fuelType: "Diesel", amount: 72.40, date: "2024-11-30" },
  ];

  // Fonction utilitaire pour simuler un délai
  function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // Fonction pour signaler que le dashboard est prêt
  async function notifyDashboardReady() {
    // Simuler l'attente de chargement complet du dashboard avec les traductions
    await sleep(1); // Attendre 1 seconde pour simuler le chargement des composants et traductions
    console.log('Dashboard prêt avec toutes les traductions chargées');

    // Signaler au backend que la tâche frontend est terminée
    // Seulement si l'utilisateur est authentifié (cette condition est gérée par le layout protégé)
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const tauri = (window as any).__TAURI__;
      await tauri.invoke('set_complete', { task: 'frontend' });
    }
  }

  onMount(async () => {
    console.log('Dashboard - Composant monté, interface prête');
  });
</script>

<div class="container mx-auto py-6">
  <h1 class="text-3xl font-bold tracking-tight mb-6"><Translate key="dashboard" module="navigation" /></h1>

  <!-- Indicateurs clés -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium"><Translate key="daily_sales" module="common" fallback="Total Ventes (Jour)" /></CardTitle>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">€1,234.56</div>
        <p class="text-xs text-muted-foreground">+20.1% d'hier</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium"><Translate key="today_customers" module="common" fallback="Clients aujourd'hui" /></CardTitle>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">+573</div>
        <p class="text-xs text-muted-foreground">+10 d'hier</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium"><Translate key="diesel_stock" module="common" fallback="Stock Diesel" /></CardTitle>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.002 4.002 0 003 15z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">45%</div>
        <p class="text-xs text-muted-foreground">6,780 L restants</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium"><Translate key="active_employees" module="common" fallback="Employés actifs" /></CardTitle>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">7</div>
        <p class="text-xs text-muted-foreground">+1 en service</p>
      </CardContent>
    </Card>
  </div>

  <!-- Graphique et détails -->
  <div class="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
    <!-- Graphique de ventes -->
    <Card class="lg:col-span-2">
      <CardHeader>
        <CardTitle><Translate key="weekly_sales" module="common" fallback="Ventes hebdomadaires" /></CardTitle>
        <CardDescription>
          <Translate key="weekly_sales_desc" module="common" fallback="Total des ventes par jour de la semaine" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-7 gap-2">
          {#each salesData as dayData}
            <div class="flex flex-col items-center">
              <span class="text-sm text-muted-foreground">{dayData.day}</span>
              <div class="mt-2 h-20 w-full bg-secondary rounded-sm flex items-end justify-center">
                <div
                  class="w-full bg-primary rounded-sm"
                  style="height: {Math.min(dayData.amount / 100, 80)}px;"
                ></div>
              </div>
              <span class="text-xs mt-1">€{dayData.amount}</span>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Niveaux de carburant -->
    <Card>
      <CardHeader>
        <CardTitle><Translate key="fuel_levels" module="common" fallback="Niveaux de carburant" /></CardTitle>
        <CardDescription>
          <Translate key="fuel_levels_desc" module="common" fallback="Niveau actuel pour chaque type de carburant" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each fuelTypes as fuel}
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-sm font-medium">{fuel.name}</span>
                <span class="text-sm font-medium">{fuel.level}%</span>
              </div>
              <div class="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  class:bg-primary={fuel.level > 20}
                  class:bg-destructive={fuel.level <= 20}
                  style="width: {fuel.level}%"
                ></div>
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                {fuel.capacity * (fuel.level / 100)} {fuel.unit} / {fuel.capacity} {fuel.unit}
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Transactions récentes -->
  <Card>
    <CardHeader>
      <CardTitle><Translate key="recent_transactions" module="common" fallback="Transactions récentes" /></CardTitle>
      <CardDescription>
        <Translate key="recent_transactions_desc" module="common" fallback="Dernières ventes effectuées à la station" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        {#each recentTransactions as transaction}
          <div class="flex items-center">
            <div class="flex-1 space-y-1">
              <p class="text-sm font-medium">{transaction.customer}</p>
              <p class="text-sm text-muted-foreground">{transaction.fuelType} • {transaction.date}</p>
            </div>
            <div class="text-sm font-medium">€{transaction.amount}</div>
          </div>
        {/each}
      </div>
    </CardContent>
  </Card>
</div>