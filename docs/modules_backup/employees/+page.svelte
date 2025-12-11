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
  
  // Types pour les employés
  type Employee = {
    id: number;
    name: string;
    position: string;
    email: string;
    phone: string;
    schedule: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    startDate: string;
  };
  
  // Données factices pour les employés
  const employees: Employee[] = [
    { 
      id: 1, 
      name: "Jean Martin", 
      position: "Gestionnaire", 
      email: "jean.martin@successfuel.com", 
      phone: "+33 6 12 34 56 78", 
      schedule: "08:00 - 16:00",
      status: "Active", 
      startDate: "2020-05-15" 
    },
    { 
      id: 2, 
      name: "Marie Dubois", 
      position: "Caissière", 
      email: "marie.dubois@successfuel.com", 
      phone: "+33 6 23 45 67 89", 
      schedule: "14:00 - 22:00",
      status: "Active", 
      startDate: "2021-08-22" 
    },
    { 
      id: 3, 
      name: "Pierre Lambert", 
      position: "Technicien", 
      email: "pierre.lambert@successfuel.com", 
      phone: "+33 6 34 56 78 90", 
      schedule: "06:00 - 14:00",
      status: "On Leave", 
      startDate: "2019-11-03" 
    },
    { 
      id: 4, 
      name: "Sophie Bernard", 
      position: "Caissière", 
      email: "sophie.bernard@successfuel.com", 
      phone: "+33 6 45 67 89 01", 
      schedule: "10:00 - 18:00",
      status: "Active", 
      startDate: "2022-01-10" 
    },
  ];
  
  // Positions disponibles
  const positions = ["Gestionnaire", "Caissière", "Technicien", "Responsable de nuit", "Stagiaire"];
  
  // Statuts
  const statuses = ["Active", "Inactive", "On Leave"];
  
  // Fonction pour ajouter un nouvel employé
  function addEmployee(
    name: string, 
    position: string, 
    email: string, 
    phone: string, 
    schedule: string
  ) {
    console.log(`Nouvel employé: ${name}, ${position}, ${email}, ${phone}, ${schedule}`);
    // Ici, on implémenterait la logique pour ajouter un employé
  }
</script>

<DashboardLayout>
  <div class="container mx-auto py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold tracking-tight">{t('title', 'employees')}</h1>
      <Dialog>
        <DialogTrigger>
          <Button>{t('add_employee', 'employees')}</Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('add_employee', 'employees')}</DialogTitle>
            <DialogDescription>
              Ajouter un nouvel employé à la station
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="name" class="text-right">Nom</Label>
              <Input id="name" class="col-span-3" placeholder="Nom complet" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="position" class="text-right">Poste</Label>
              <select id="position" class="col-span-3 p-2 border rounded-md bg-background">
                <option value="">Sélectionner un poste</option>
                {#each positions as pos}
                  <option value={pos}>{pos}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="email" class="text-right">Email</Label>
              <Input id="email" class="col-span-3" type="email" placeholder="email@entreprise.com" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="phone" class="text-right">Téléphone</Label>
              <Input id="phone" class="col-span-3" placeholder="+33 6 XX XX XX XX" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="schedule" class="text-right">Horaires</Label>
              <Input id="schedule" class="col-span-3" placeholder="08:00 - 16:00" />
            </div>
          </div>
          <Button type="submit" class="w-full">
            Ajouter l'employé
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    
    <!-- Résumé des employés -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total employés</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">24</div>
          <p class="text-xs text-muted-foreground">+2 ce mois</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Actifs</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">21</div>
          <p class="text-xs text-muted-foreground">87.5% du total</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">En service</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">7</div>
          <p class="text-xs text-muted-foreground">En ce moment</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Postes ouverts</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">3</div>
          <p class="text-xs text-muted-foreground">À pourvoir</p>
        </CardContent>
      </Card>
    </div>
    
    <!-- Tableau des employés -->
    <Card>
      <CardHeader>
        <CardTitle>Employés</CardTitle>
        <CardDescription>
          Liste de tous les employés de la station
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Horaires</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date d'entrée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each employees as employee}
              <TableRow>
                <TableCell>
                  <div class="flex items-center">
                    <Avatar class="h-8 w-8 mr-3">
                      <AvatarImage src="https://github.com/shadcn.png" alt={employee.name} />
                      <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div class="font-medium">{employee.name}</div>
                  </div>
                </TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>
                  <div>
                    <div>{employee.email}</div>
                    <div class="text-sm text-muted-foreground">{employee.phone}</div>
                  </div>
                </TableCell>
                <TableCell>{employee.schedule}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      employee.status === 'Active' 
                        ? 'default' 
                        : employee.status === 'On Leave' 
                          ? 'secondary' 
                          : 'destructive'
                    }
                  >
                    {employee.status}
                  </Badge>
                </TableCell>
                <TableCell>{employee.startDate}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</DashboardLayout>