<script lang="ts">
  import { onMount } from 'svelte';
  import { userService } from '$lib/services/UserService';
  import { authStore } from '$lib/services/authStore';
  import { get } from 'svelte/store';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';

  let user: any = null;
  let company: any = null;
  let isLoading = true;
  let error = '';

  onMount(async () => {
    try {
      // Vérifier si l'utilisateur est authentifié
      const authState = get(authStore);
      if (!authState.isAuthenticated) {
        // Si non authentifié, rediriger vers la page de login
        window.location.href = '/login';
        return;
      }

      // Récupérer les informations de l'utilisateur
      user = await userService.getMe();
      // Récupérer les informations de la compagnie
      company = await userService.getCompany();
    } catch (err) {
      console.error('Erreur lors de la récupération des informations:', err);
      error = 'Impossible de charger les informations de votre profil.';
    } finally {
      isLoading = false;
    }
  });

  const handleUpdateProfile = async () => {
    // Implémentation de la mise à jour du profil
    console.log('Mise à jour du profil');
  };
</script>

<div class="container mx-auto py-6">
  <h1 class="text-3xl font-bold tracking-tight mb-6">
    <Translate key="profile" module="common" fallback="Profil" />
  </h1>

  {#if isLoading}
    <div class="flex justify-center items-center h-64">
      <Translate key="loading" module="common" fallback="Chargement..." />
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      {error}
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Informations utilisateur -->
      <Card>
        <CardHeader>
          <CardTitle>
            <Translate key="user_info" module="common" fallback="Informations utilisateur" />
          </CardTitle>
          <CardDescription>
            <Translate key="user_info_desc" module="common" fallback="Vos informations personnelles" />
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="id" module="common" fallback="ID" />
              </p>
              <p class="font-medium">{user?.id}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="login" module="common" fallback="Login" />
              </p>
              <p class="font-medium">{user?.login}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="first_name" module="common" fallback="Prénom" />
              </p>
              <p class="font-medium">{user?.prenom}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="last_name" module="common" fallback="Nom" />
              </p>
              <p class="font-medium">{user?.nom}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="email" module="common" fallback="Email" />
              </p>
              <p class="font-medium">{user?.email}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="role" module="common" fallback="Rôle" />
              </p>
              <p class="font-medium">{user?.role}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="created_at" module="common" fallback="Créé le" />
              </p>
              <p class="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="last_login" module="common" fallback="Dernière connexion" />
              </p>
              <p class="font-medium">{user?.date_derniere_connexion ? new Date(user.date_derniere_connexion).toLocaleDateString() : ''}</p>
            </div>
          </div>
          <div class="pt-4">
            <Button onclick={() => handleUpdateProfile()}>
              <Translate key="update_profile" module="common" fallback="Mettre à jour le profil" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Informations de la compagnie -->
      <Card>
        <CardHeader>
          <CardTitle>
            <Translate key="company_info" module="common" fallback="Informations de la compagnie" />
          </CardTitle>
          <CardDescription>
            <Translate key="company_info_desc" module="common" fallback="Détails de votre compagnie" />
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="id" module="common" fallback="ID" />
              </p>
              <p class="font-medium">{company?.id}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="name" module="common" fallback="Nom" />
              </p>
              <p class="font-medium">{company?.nom}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="address" module="common" fallback="Adresse" />
              </p>
              <p class="font-medium">{company?.adresse}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="phone" module="common" fallback="Téléphone" />
              </p>
              <p class="font-medium">{company?.telephone}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="email" module="common" fallback="Email" />
              </p>
              <p class="font-medium">{company?.email}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="currency" module="common" fallback="Devise" />
              </p>
              <p class="font-medium">{company?.devise}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                <Translate key="created_at" module="common" fallback="Créé le" />
              </p>
              <p class="font-medium">{company?.created_at ? new Date(company.created_at).toLocaleDateString() : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}
</div>