<script lang="ts">
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "$lib/components/ui/dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { t } from "$lib/i18n";
  
  // Types pour les transactions
  type Transaction = {
    id: number;
    date: string;
    customer: string;
    fuelType: string;
    quantity: number; // en litres
    unitPrice: number; // par litre
    totalAmount: number;
    paymentMethod: 'Cash' | 'Card' | 'Credit';
    status: 'Completed' | 'Pending' | 'Cancelled';
  };
  
  // Données factices pour les transactions
  const transactions: Transaction[] = [
    { 
      id: 1, 
      date: "2024-12-08 08:30", 
      customer: "Jean Dupont", 
      fuelType: "Super 95", 
      quantity: 45, 
      unitPrice: 1.72, 
      totalAmount: 77.40, 
      paymentMethod: "Card",
      status: "Completed"
    },
    { 
      id: 2, 
      date: "2024-12-08 09:15", 
      customer: "Marie Lambert", 
      fuelType: "Diesel", 
      quantity: 52, 
      unitPrice: 1.68, 
      totalAmount: 87.36, 
      paymentMethod: "Cash",
      status: "Completed"
    },
    { 
      id: 3, 
      date: "2024-12-08 10:45", 
      customer: "Pierre Martin", 
      fuelType: "Super 95", 
      quantity: 35, 
      unitPrice: 1.72, 
      totalAmount: 60.20, 
      paymentMethod: "Credit",
      status: "Pending"
    },
    { 
      id: 4, 
      date: "2024-12-07 16:20", 
      customer: "Sophie Bernard", 
      fuelType: "GPL", 
      quantity: 28, 
      unitPrice: 0.85, 
      totalAmount: 23.80, 
      paymentMethod: "Card",
      status: "Completed"
    },
  ];
  
  // Types de carburant disponibles
  const fuelTypes = ["Super 95", "Super 98", "Diesel", "GPL", "SP95-E10", "Biodiesel"];
  
  // Méthodes de paiement
  const paymentMethods = ["Cash", "Card", "Credit"];
  
  // Statuts de transaction
  const statuses = ["Completed", "Pending", "Cancelled"];
  
  // Fonction pour enregistrer une nouvelle vente
  function recordSale(customer: string, fuelType: string, quantity: number, paymentMethod: string) {
    console.log(`Nouvelle vente: ${customer}, ${fuelType}, ${quantity}L, ${paymentMethod}`);
    // Ici, on implémenterait la logique pour enregistrer la vente
  }
  
  // Fonction pour calculer le total
  function calculateTotal(unitPrice: number, quantity: number): number {
    return Number((unitPrice * quantity).toFixed(2));
  }
</script>

<DashboardLayout>
  <div class="container mx-auto py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold tracking-tight">{t('title', 'sales')}</h1>
      <Dialog>
        <DialogTrigger>
          <Button>{t('record_sale', 'sales')}</Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('record_sale', 'sales')}</DialogTitle>
            <DialogDescription>
              Enregistrer une nouvelle vente à la station
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="customer" class="text-right">Client</Label>
              <Input id="customer" class="col-span-3" placeholder="Nom du client" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="fuel-type" class="text-right">Carburant</Label>
              <select id="fuel-type" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner un type</option>
                {#each fuelTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="quantity" class="text-right">Quantité (L)</Label>
              <Input id="quantity" class="col-span-3" type="number" min="1" placeholder="Litres" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="payment-method" class="text-right">Paiement</Label>
              <select id="payment-method" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner une méthode</option>
                {#each paymentMethods as method}
                  <option value={method}>{method}</option>
                {/each}
              </select>
            </div>
          </div>
          <Button type="submit" class="w-full">
            Enregistrer la vente
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    
    <!-- Résumé des ventes -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total aujourd'hui</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">€1,234.96</div>
          <p class="text-xs text-muted-foreground">+20.1% hier</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Transactions</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">24</div>
          <p class="text-xs text-muted-foreground">+3 d'hier</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Carburant vendu</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">1,250 L</div>
          <p class="text-xs text-muted-foreground">+120 L hier</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Moyenne/client</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">€51.46</div>
          <p class="text-xs text-muted-foreground">+€5.20 hier</p>
        </CardContent>
      </Card>
    </div>
    
    <!-- Tableau des transactions -->
    <Card>
      <CardHeader>
        <CardTitle>{t('transactions', 'sales')}</CardTitle>
        <CardDescription>
          Historique des transactions récentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date', 'sales')}</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Carburant</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>{t('amount', 'sales')}</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each transactions as transaction}
              <TableRow>
                <TableCell class="font-medium">{transaction.date}</TableCell>
                <TableCell>{transaction.customer}</TableCell>
                <TableCell>{transaction.fuelType}</TableCell>
                <TableCell>{transaction.quantity} L</TableCell>
                <TableCell>€{transaction.totalAmount}</TableCell>
                <TableCell>
                  <Badge variant={transaction.paymentMethod === 'Card' ? 'default' : transaction.paymentMethod === 'Cash' ? 'secondary' : 'outline'}>
                    {transaction.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      transaction.status === 'Completed' 
                        ? 'default' 
                        : transaction.status === 'Pending' 
                          ? 'secondary' 
                          : 'destructive'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</DashboardLayout>