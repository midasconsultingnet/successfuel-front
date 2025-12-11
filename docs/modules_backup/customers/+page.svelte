<script lang="ts">
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "$lib/components/ui/dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar";
  import { t } from "$lib/i18n";
  
  // Types pour les clients
  type Customer = {
    id: number;
    name: string;
    vehicle: string;
    email: string;
    phone: string;
    loyaltyPoints: number;
    lastVisit: string;
    totalSpent: number;
  };
  
  // Données factices pour les clients
  const customers: Customer[] = [
    { 
      id: 1, 
      name: "Jean Dupont", 
      vehicle: "Renault Clio", 
      email: "jean.dupont@email.com", 
      phone: "+33 6 12 34 56 78", 
      loyaltyPoints: 1250,
      lastVisit: "2024-12-08",
      totalSpent: 850.75
    },
    { 
      id: 2, 
      name: "Marie Lambert", 
      vehicle: "Peugeot 208", 
      email: "marie.lambert@email.com", 
      phone: "+33 6 23 45 67 89", 
      loyaltyPoints: 890,
      lastVisit: "2024-12-07",
      totalSpent: 620.30
    },
    { 
      id: 3, 
      name: "Pierre Martin", 
      vehicle: "Citroën C3", 
      email: "pierre.martin@email.com", 
      phone: "+33 6 34 56 78 90", 
      loyaltyPoints: 2100,
      lastVisit: "2024-12-06",
      totalSpent: 1200.50
    },
    { 
      id: 4, 
      name: "Sophie Bernard", 
      vehicle: "Volkswagen Golf", 
      email: "sophie.bernard@email.com", 
      phone: "+33 6 45 67 89 01", 
      loyaltyPoints: 650,
      lastVisit: "2024-12-05",
      totalSpent: 480.20
    },
  ];
  
  // Types de véhicules (exemples)
  const vehicleTypes = [
    "Citoyenne", "Berline", "SUV", "Utilitaire", 
    "Moto", "Camion", "Hybride", "Électrique"
  ];
  
  // Fonction pour ajouter un nouveau client
  function addCustomer(
    name: string, 
    vehicle: string, 
    email: string, 
    phone: string
  ) {
    console.log(`Nouveau client: ${name}, ${vehicle}, ${email}, ${phone}`);
    // Ici, on implémenterait la logique pour ajouter un client
  }
  
  // Fonction pour ajouter des points de fidélité
  function addLoyaltyPoints(customerId: number, points: number) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      customer.loyaltyPoints += points;
    }
  }
</script>

<DashboardLayout>
  <div class="container mx-auto py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold tracking-tight">{t('title', 'customers')}</h1>
      <Dialog>
        <DialogTrigger>
          <Button>{t('add_customer', 'customers')}</Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_customer', 'customers')}</DialogTitle>
            <DialogDescription>
              Enregistrer un nouveau client
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="customer-name" class="text-right">Nom</Label>
              <Input id="customer-name" class="col-span-3" placeholder="Nom complet" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="vehicle" class="text-right">Véhicule</Label>
              <select id="vehicle" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner un type</option>
                {#each vehicleTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="customer-email" class="text-right">Email</Label>
              <Input id="customer-email" class="col-span-3" type="email" placeholder="email@exemple.com" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="customer-phone" class="text-right">Téléphone</Label>
              <Input id="customer-phone" class="col-span-3" placeholder="+33 6 XX XX XX XX" />
            </div>
          </div>
          <Button type="submit" class="w-full">
            Ajouter le client
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    
    <!-- Résumé des clients -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total clients</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">1,234</div>
          <p class="text-xs text-muted-foreground">+18 cette semaine</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Fidèles</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">312</div>
          <p class="text-xs text-muted-foreground">25.3% du total</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Points fidélité</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">84,250</div>
          <p class="text-xs text-muted-foreground">1,250 moyen/client</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Fréquence</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">2.4</div>
          <p class="text-xs text-muted-foreground">visites/client/mois</p>
        </CardContent>
      </Card>
    </div>
    
    <!-- Tableau des clients -->
    <Card>
      <CardHeader>
        <CardTitle>Clients</CardTitle>
        <CardDescription>
          Liste des clients réguliers de la station
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Points fidélité</TableHead>
              <TableHead>Dernière visite</TableHead>
              <TableHead>Dépense totale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each customers as customer}
              <TableRow>
                <TableCell>
                  <div class="flex items-center">
                    <Avatar class="h-8 w-8 mr-3">
                      <AvatarImage src="https://github.com/shadcn.png" alt={customer.name} />
                      <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div class="font-medium">{customer.name}</div>
                  </div>
                </TableCell>
                <TableCell>{customer.vehicle}</TableCell>
                <TableCell>
                  <div>
                    <div>{customer.email}</div>
                    <div class="text-sm text-muted-foreground">{customer.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center">
                    <span class="mr-2">{customer.loyaltyPoints}</span>
                    <Badge variant="secondary">pts</Badge>
                  </div>
                </TableCell>
                <TableCell>{customer.lastVisit}</TableCell>
                <TableCell>€{customer.totalSpent.toFixed(2)}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</DashboardLayout>