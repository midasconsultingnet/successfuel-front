# Documentation du projet SuccessFuel

## Table des matières
1. [Introduction](#introduction)
2. [Structure du projet](#structure-du-projet)
3. [Technologies utilisées](#technologies-utilisées)
4. [Configuration du projet](#configuration-du-projet)
5. [Architecture des composants](#architecture-des-composants)
6. [Système de traduction i18n](#système-de-traduction-i18n)

## Introduction

SuccessFuel est une application de gestion de station-service moderne construite avec Tauri + SvelteKit + TypeScript. L'application fournit une interface de gestion complète pour les stations-service avec des fonctionnalités de suivi des stocks, gestion des ventes, employés et clients.

## Structure du projet

```
successfuel/
├── src/
│   ├── app.html                    # Template HTML principal
│   ├── routes/                     # Pages et routes SvelteKit
│   └── lib/                        # Composants et utilitaires
│       ├── components/             # Composants globaux
│       ├── i18n/                   # Système de traduction
│       └── utils.ts                # Utilitaires généraux
├── static/                         # Fichiers statiques
├── docs/                           # Documentation
├── src-tauri/                      # Code Rust pour le backend Tauri
├── package.json                    # Dépendances et scripts
└── svelte.config.js               # Configuration SvelteKit
```

## Technologies utilisées

- **Frontend**: SvelteKit (v5 avec runes), TypeScript, Tailwind CSS
- **Backend**: Rust avec Tauri
- **UI Components**: bits-ui, shadcn-svelte
- **Icônes**: lucide-svelte
- **Styling**: Tailwind CSS avec thème personnalisé
- **Build**: Vite

## Configuration du projet

### Prérequis

- Node.js 18+
- Rust et Cargo
- pnpm (recommandé)

### Installation

1. Cloner le dépôt
2. Exécuter `pnpm install` pour installer les dépendances
3. Pour le développement: `pnpm tauri dev`
4. Pour la production: `pnpm tauri build`

### Variables d'environnement

Le projet n'utilise pas de variables d'environnement externes. La configuration est gérée directement dans les fichiers de code.

## Architecture des composants

Le projet suit une architecture basée sur Svelte 5 avec les runes:

- **$state**: Pour la gestion d'état réactive
- **$derived**: Pour les valeurs dérivées réactives
- **$effect**: Pour les effets secondaires réactifs

### Structure des composants UI

- `/lib/components/ui/` - Composants d'interface utilisateur réutilisables
- `/lib/components/` - Composants spécifiques à l'application
- Chaque composant suit les principes des runes de Svelte 5

## Système de traduction i18n

Le projet implémente un système de traduction i18n moderne basé sur les runes de Svelte 5.

### Architecture

```
src/lib/i18n/
├── common/                 # Traductions communes (en.json, fr.json)
├── navigation/             # Traductions pour la navigation (en.json, fr.json)
├── sales/                  # Traductions pour les ventes (en.json, fr.json)
├── config.ts              # Configuration des langues supportées
├── fallback.ts            # Gestion des traductions fallback
├── global.d.ts            # Déclarations de type globales
├── I18nProvider.svelte    # Composant fournisseur qui gère l'état global
├── i18nService.ts         # Service de gestion i18n
├── index.ts               # Point d'entrée principal
├── Translate.svelte       # Composant pour afficher les traductions
├── translationManager.ts  # Gestionnaire de traduction
├── utils.ts               # Utilitaires pour la gestion des traductions
```

### Utilisation

Le système utilise des composants plutôt que des fonctions utilitaires pour garantir la réactivité:

```svelte
<script>
  import Translate from "$lib/i18n/Translate.svelte";
</script>

<!-- Utilisation simple -->
<Translate key="app_name" module="common" />

<!-- Avec fallback -->
<Translate key="dashboard" module="navigation" fallback="Dashboard" />
```

### Composant I18nProvider

Le composant `I18nProvider` doit entourer l'application et gère:

- Initialisation au montage du composant
- Chargement des traductions depuis localStorage
- Gestion de l'état de chargement
- Répartition de l'état aux composants enfants

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import I18nProvider from "$lib/i18n/I18nProvider.svelte";
</script>

<I18nProvider>
  <main>
    <slot />
  </main>
</I18nProvider>
```

### Réactivité

Le système garantit la réactivité des traductions en:

- Utilisant `$effect` pour s'abonner aux changements du store
- Mise à jour automatique des traductions à chaque changement de langue
- Gestion appropriée des souscriptions/désouscriptions

### Modules de traduction

Le système supporte des modules de traduction séparés:

- `common` - Traductions générales de l'application
- `navigation` - Traductions pour la navigation
- `sales` - Traductions pour la gestion des ventes
- Possibilité d'ajouter d'autres modules selon les besoins

### Ajout d'un nouveau module de traduction

Pour ajouter un nouveau module de traduction, suivez ces étapes :

1. **Créer les fichiers de traduction** :
   - Créer un dossier dans `src/lib/i18n/` avec le nom du module (ex: `sales`)
   - Créer les fichiers de traduction pour chaque langue supportée (ex: `en.json`, `fr.json`)

2. **Mettre à jour la configuration** :
   - Ajouter le nom du module à la liste `modules` dans `src/lib/i18n/config.ts`

3. **Mettre à jour la fonction de chargement** :
   - Modifier la fonction `loadAllTranslations` dans `src/lib/i18n/index.ts` pour inclure le nouveau module dans le chargement initial
   - Exemple : `const [common, navigation, sales, newModule] = await Promise.all([...])`

4. **Utiliser le module dans les composants** :
   - Dans les composants Svelte, utiliser le composant `<Translate>` avec le module approprié
   - Exemple : `<Translate key="title" module="newModule" />`

5. **Mettre à jour les composants UI** :
   - S'assurer que les composants comme `DashboardLayout` incluent les traductions nécessaires
   - Si le nouveau module a des liens de navigation, ajouter les traductions dans le module `navigation`

### Persistance

- La langue sélectionnée est sauvegardée dans localStorage
- Restaurée automatiquement au chargement de l'application
- Mise à jour en temps réel avec les changements de langue

### Structure des fichiers de traduction

Chaque module a ses propres fichiers de traduction:

```
common/
├── en.json
└── fr.json

navigation/
├── en.json
└── fr.json
```

Exemple de fichier de traduction:
```json
{
  "app_name": "SuccessFuel",
  "dashboard": "Tableau de bord",
  "settings": "Paramètres"
}
```

### Changement de langue

Le changement de langue se fait via la fonction `setLanguage` et met à jour immédiatement toutes les traductions dans l'interface utilisateur.

### Bonnes pratiques

- Utiliser le composant `<Translate />` plutôt que des fonctions utilitaires
- Toujours spécifier le module pour une meilleure organisation
- Profiter de la réactivité automatique pour les changements dynamiques
- Utiliser les fallbacks pour une meilleure expérience utilisateur

## Communication avec l'API Backend

L'application est conçue pour interagir avec un backend distant via une API REST. L'architecture mise en place permet une communication modulaire et extensible.

### Architecture

```
src/lib/services/
├── HttpClient.ts           # Client HTTP générique avec gestion des erreurs
├── ApiService.ts           # Service principal configuré pour l'API backend
├── [Entity]Service.ts      # Services spécifiques aux entités (ex: CustomerService.ts)
├── ErrorHandler.ts         # Gestion centralisée des erreurs
└── index.ts               # Point d'entrée pour l'ensemble des services
```

### Couche HTTP

La classe `HttpClient` fournit une abstraction générique pour les requêtes HTTP avec :

- Méthodes standard (GET, POST, PUT, DELETE)
- Gestion des headers et paramètres
- Gestion des erreurs avec système de notification optionnel
- Support des types TypeScript pour une meilleure sécurité

```typescript
import { HttpClient } from '$lib/services';

// Exemple d'utilisation
const client = new HttpClient('https://api.example.com');
const data = await client.get('/users');
```

### Injection de dépendances pour les notifications

L'architecture permet d'injecter un gestionnaire de notifications pour gérer les erreurs sans couplage direct avec l'UI :

```typescript
import { apiService } from '$lib/services';
import { toast } from '$lib/components/ui/sonner';

const notificationHandler = {
  showError: (title, description) => toast.error(title, { description }),
  showSuccess: (title, description) => toast.success(title, { description }),
  showInfo: (title, description) => toast.info(title, { description }),
  showWarning: (title, description) => toast.warning(title, { description })
};

apiService.setNotificationHandler(notificationHandler);
```

### Services spécifiques

Chaque entité métier possède un service dédié qui :

- Hérite des fonctionnalités de base de `ApiService`
- Fournit des méthodes spécifiques à l'entité
- Suit une structure cohérente pour la pagination, la recherche, etc.

Exemple d'architecture pour le service client :
```typescript
import { customerService } from '$lib/services';

// Opérations CRUD
const customers = await customerService.getCustomers(1, 10);
const customer = await customerService.getCustomerById('customer-id');
await customerService.createCustomer(customerData);
await customerService.updateCustomer('customer-id', updateData);
await customerService.deleteCustomer('customer-id');
```

### Gestion des erreurs

Le système de gestion des erreurs fournit :

- Classification des erreurs (réseau, authentification, validation, etc.)
- Transformation des erreurs API en erreurs applicatives
- Extraction des détails de validation
- Mécanisme de notification configurable

### Configuration de l'URL de base

L'URL de base de l'API est configurable via une variable d'environnement :

```
VITE_API_BASE_URL=http://localhost:8000/api
```

### Bonnes pratiques

- Utiliser les services dédiés plutôt que d'appeler directement HttpClient
- Toujours gérer les erreurs potentielles avec le système ErrorHandler
- Spécifier les types TypeScript pour les réponses d'API
- Injecter les gestionnaires de notifications dans les composants UI plutôt que dans les services