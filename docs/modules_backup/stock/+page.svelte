<script lang="ts">
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "$lib/components/ui/dialog";
  import { t } from "$lib/i18n";
  
  // Données factices pour les niveaux de carburant
  type FuelLevel = {
    id: number;
    type: string;
    currentLevel: number; // en pourcentage
    capacity: number; // en litres
    unit: string;
    lastUpdated: string;
  };
  
  const fuelLevels: FuelLevel[] = [
    { id: 1, type: "Super 95", currentLevel: 78, capacity: 10000, unit: "L", lastUpdated: "2024-12-08" },
    { id: 2, type: "Diesel", currentLevel: 45, capacity: 12000, unit: "L", lastUpdated: "2024-12-08" },
    { id: 3, type: "Super 98", currentLevel: 23, capacity: 5000, unit: "L", lastUpdated: "2024-12-07" },
    { id: 4, type: "GPL", currentLevel: 65, capacity: 8000, unit: "L", lastUpdated: "2024-12-07" },
  ];
  
  // Types de carburant disponibles
  const fuelTypes = ["Super 95", "Super 98", "Diesel", "GPL", "SP95-E10", "Biodiesel"];
  
  // Fonction pour mettre à jour le niveau de carburant
  function updateFuelLevel(id: number, newLevel: number) {
    const fuel = fuelLevels.find(f => f.id === id);
    if (fuel) {
      fuel.currentLevel = newLevel;
      fuel.lastUpdated = new Date().toISOString().split('T')[0]; // Date du jour
    }
  }
  
  // Fonction pour ajouter du stock
  function addStock(fuelType: string, amount: number) {
    console.log(`Ajout de ${amount}L de ${fuelType}`);
    // Ici, on implémenterait la logique pour ajouter du stock
  }
</script>

<DashboardLayout>
  <div class="container mx-auto py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold tracking-tight">{t('title', 'stock')}</h1>
      <Dialog>
        <DialogTrigger>
          <Button>{t('add_stock', 'stock')}</Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_stock', 'stock')}</DialogTitle>
            <DialogDescription>
              Ajouter du stock à un type de carburant
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="fuel-type" class="text-right">Type</Label>
              <select name="fuel-type" id="fuel-type" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner un type de carburant</option>
                {#each fuelTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="quantity" class="text-right">Quantité (L)</Label>
              <Input id="quantity" class="col-span-3" type="number" min="0" />
            </div>
          </div>
          <Button type="submit" class="w-full">
            Ajouter au stock
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    
    <!-- Carte de résumé des niveaux de carburant -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>{t('fuel_levels', 'stock')}</CardTitle>
        <CardDescription>
          Niveaux actuels de chaque type de carburant dans les réservoirs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each fuelLevels as fuel}
            <Card class="border">
              <CardHeader class="pb-3">
                <CardTitle class="text-lg">{fuel.type}</CardTitle>
                <div class="flex items-center justify-between">
                  <span class="text-2xl font-bold">{fuel.currentLevel}%</span>
                  <span class="text-sm text-muted-foreground">{fuel.capacity * (fuel.currentLevel / 100)}L</span>
                </div>
              </CardHeader>
              <CardContent>
                <div class="mb-2">
                  <div class="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full" 
                      class:bg-primary={fuel.currentLevel > 20} 
                      class:bg-destructive={fuel.currentLevel <= 20}
                      style="width: {fuel.currentLevel}%"
                    ></div>
                  </div>
                </div>
                <div class="text-xs text-muted-foreground">
                  Dernière mise à jour: {fuel.lastUpdated}
                </div>
                <div class="mt-3 flex gap-2">
                  <Dialog>
                    <DialogTrigger>
                      <Button variant="outline" size="sm" class="w-full">
                        Mettre à jour
                      </Button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Mettre à jour le niveau de {fuel.type}</DialogTitle>
                        <DialogDescription>
                          Entrez le nouveau niveau pour {fuel.type}
                        </DialogDescription>
                      </DialogHeader>
                      <div class="grid gap-4 py-4">
                        <div class="grid grid-cols-4 items-center gap-4">
                          <Label for="new-level" class="text-right">Niveau (%)</Label>
                          <Input 
                            id="new-level" 
                            class="col-span-3" 
                            type="number" 
                            min="0" 
                            max="100" 
                            bind:value={fuel.currentLevel}
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        class="w-full"
                        on:click={() => updateFuelLevel(fuel.id, fuel.currentLevel)}
                      >
                        Mettre à jour
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          {/each}
        </div>
      </CardContent>
    </Card>
    
    <!-- Tableau des alertes de stock -->
    <Card>
      <CardHeader>
        <CardTitle>{t('low_stock_alerts', 'stock')}</CardTitle>
        <CardDescription>
          Types de carburant avec un niveau inférieur à 30%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fuel_type', 'stock')}</TableHead>
              <TableHead>{t('current_level', 'stock')}</TableHead>
              <TableHead>{t('unit', 'stock')}</TableHead>
              <TableHead>{t('actions', 'stock')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each fuelLevels.filter(fuel => fuel.currentLevel < 30) as fuel}
              <TableRow>
                <TableCell class="font-medium">{fuel.type}</TableCell>
                <TableCell>
                  <div class="flex items-center">
                    <div class="h-2 w-2 rounded-full bg-destructive mr-2"></div>
                    {fuel.currentLevel}%
                  </div>
                </TableCell>
                <TableCell>{fuel.capacity * (fuel.currentLevel / 100)}L</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    Commander du stock
                  </Button>
                </TableCell>
              </TableRow>
            {/each}
            {#if fuelLevels.filter(fuel => fuel.currentLevel < 30).length === 0}
              <TableRow>
                <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                  Aucune alerte de stock faible
                </TableCell>
              </TableRow>
            {/if}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</DashboardLayout>