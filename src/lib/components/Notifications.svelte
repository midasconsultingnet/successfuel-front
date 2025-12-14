<script lang="ts">
  import { Toaster as SonnerToaster } from "$lib/components/ui/sonner";
  import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Bell } from "lucide-svelte";
  
  // Types pour les notifications
  type Notification = {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    read: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
  };
  
  // Données factices pour les notifications
  const notifications: Notification[] = [
    {
      id: 1,
      title: "Niveau de carburant bas",
      description: "Le niveau de Diesel est inférieur à 20%",
      timestamp: "10 min ago",
      read: false,
      type: "warning"
    },
    {
      id: 2,
      title: "Vente enregistrée",
      description: "Pierre Martin a acheté 65.50€ de Super 95",
      timestamp: "1 hour ago",
      read: false,
      type: "info"
    },
    {
      id: 3,
      title: "Mise à jour disponible",
      description: "Nouvelle version du système disponible",
      timestamp: "2 hours ago",
      read: true,
      type: "info"
    }
  ];
  
  // Fonction pour marquer une notification comme lue
  function markAsRead(id: number) {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
    }
  }
  
  // Fonction pour supprimer une notification
  function removeNotification(id: number) {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications.splice(index, 1);
    }
  }
  
  // Fonction pour obtenir l'icône selon le type de notification
  function getIcon(type: string) {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }
</script>

<!-- Bouton de notification -->
<Popover>
  <PopoverTrigger>
    <Button 
      variant="ghost" 
      size="icon" 
      class="relative"
      aria-label="Notifications"
    >
      <Bell class="h-5 w-5" />
      {#if notifications.filter(n => !n.read).length > 0}
        <span class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[0.6rem] text-destructive-foreground">
          {notifications.filter(n => !n.read).length}
        </span>
      {/if}
    </Button>
  </PopoverTrigger>
  <PopoverContent 
    class="w-80 p-0"
    align="end"
    side="bottom"
    sideOffset={5}
  >
    <div class="p-4 border-b">
      <h3 class="font-semibold">Notifications</h3>
    </div>
    <div class="max-h-80 overflow-y-auto">
      {#if notifications.length === 0}
        <div class="p-4 text-center text-muted-foreground">
          Aucune notification
        </div>
      {:else}
        {#each notifications as notification (notification.id)}
          <div class="border-b last:border-b-0">
            <div class="p-3 flex items-start gap-3 hover:bg-accent transition-colors">
              <span class="mt-0.5 text-lg">{getIcon(notification.type)}</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between gap-2">
                  <h4 class="font-medium truncate">{notification.title}</h4>
                {#if !notification.read}
                  <div class="unread-indicator"></div>
                {/if}
                </div>
                <p class="text-sm text-muted-foreground mt-1">
                  {notification.description}
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  {notification.timestamp}
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-2 p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onclick={() => markAsRead(notification.id)}
                disabled={notification.read}
              >
                Marquer comme lu
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onclick={() => removeNotification(notification.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <div class="p-2 border-t text-center">
      <Button variant="link" class="h-auto p-0 text-sm">
        Voir tout
      </Button>
    </div>
  </PopoverContent>
</Popover>

<style>
  .unread-indicator {
    height: 0.5rem;
    width: 0.5rem;
    flex-shrink: 0;
    border-radius: 50%;
    background-color: hsl(222.2 84% 4.9%);
  }
</style>