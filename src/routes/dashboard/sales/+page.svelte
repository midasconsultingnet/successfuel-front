<script lang="ts">
  import DashboardLayout from "$lib/components/DashboardLayout.svelte";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "$lib/components/ui/dialog";
  import { Badge } from "$lib/components/ui/badge";
  import Translate from "$lib/i18n/Translate.svelte";

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
    // Ici, on implémenterait la logique pour enregistrer une vente
  }
</script>


  <div class="container mx-auto py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold tracking-tight"><Translate key="title" module="sales" /></h1>
      <Dialog>
        <DialogTrigger>
          <Button><Translate key="record_sale" module="sales" /></Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle><Translate key="record_sale" module="sales" /></DialogTitle>
            <DialogDescription>
              <Translate key="record_sale" module="sales" fallback="Enregistrer une vente" />
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="customer" class="text-right"><Translate key="customer" module="sales" /></Label>
              <Input id="customer" class="col-span-3" placeholder="Nom du client" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="fuel-type" class="text-right"><Translate key="fuel_type" module="sales" /></Label>
              <select name="fuel-type" id="fuel-type" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner un type de carburant</option>
                {#each fuelTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="quantity" class="text-right"><Translate key="quantity" module="sales" /></Label>
              <Input id="quantity" class="col-span-3" type="number" min="0" placeholder="Litres" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="unit-price" class="text-right"><Translate key="unit_price" module="sales" /></Label>
              <Input id="unit-price" class="col-span-3" type="number" min="0" step="0.01" placeholder="€/L" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="payment-method" class="text-right"><Translate key="payment_method" module="sales" /></Label>
              <select name="payment-method" id="payment-method" class="col-span-3 p-2 border rounded-md bg-background">
                {#each paymentMethods as method}
                  <option value={method}>{method}</option>
                {/each}
              </select>
            </div>
          </div>
          <Button type="submit" class="w-full">
            <Translate key="record_sale" module="sales" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>

    <Card>
      <CardHeader>
        <CardTitle><Translate key="transactions" module="sales" /></CardTitle>
        <CardDescription><Translate key="transactions" module="sales" fallback="Historique des ventes" /></CardDescription>
      </CardHeader>
      <CardContent>
        <div class="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Translate key="date" module="sales" /></TableHead>
                <TableHead><Translate key="customer" module="sales" /></TableHead>
                <TableHead><Translate key="fuel_type" module="sales" /></TableHead>
                <TableHead><Translate key="quantity" module="sales" /></TableHead>
                <TableHead><Translate key="unit_price" module="sales" /></TableHead>
                <TableHead><Translate key="amount" module="sales" /></TableHead>
                <TableHead><Translate key="payment_method" module="sales" /></TableHead>
                <TableHead><Translate key="status" module="sales" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each transactions as transaction (transaction.id)}
                <TableRow>
                  <TableCell class="font-medium">{transaction.date}</TableCell>
                  <TableCell>{transaction.customer}</TableCell>
                  <TableCell>{transaction.fuelType}</TableCell>
                  <TableCell>{transaction.quantity} L</TableCell>
                  <TableCell>{transaction.unitPrice} €/L</TableCell>
                  <TableCell>{transaction.totalAmount} €</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {#if transaction.paymentMethod === 'Cash'}
                        <Translate key="cash" module="sales" fallback="Espèces" />
                      {:else if transaction.paymentMethod === 'Card'}
                        <Translate key="card" module="sales" fallback="Carte" />
                      {:else if transaction.paymentMethod === 'Credit'}
                        <Translate key="credit" module="sales" fallback="Crédit" />
                      {/if}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {#if transaction.status === 'Completed'}
                      <Badge class="bg-green-500 text-white">
                        <Translate key="completed" module="sales" fallback="Terminé" />
                      </Badge>
                    {:else if transaction.status === 'Pending'}
                      <Badge class="bg-yellow-500 text-white">
                        <Translate key="pending" module="sales" fallback="En attente" />
                      </Badge>
                    {:else}
                      <Badge class="bg-red-500 text-white">
                        <Translate key="cancelled" module="sales" fallback="Annulé" />
                      </Badge>
                    {/if}
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
