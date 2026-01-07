# Architecture Système de SuccessFuel

## Vue d'ensemble de la Structure

### Organisation des dossiers
Le projet SuccessFuel suit une architecture de type monorepo avec une séparation claire entre le frontend et le backend :

```
successfuel/
├── src/                    # Frontend SvelteKit
│   ├── app.html          # Template HTML principal
│   ├── routes/           # Pages/routes SvelteKit
│   └── lib/              # Composants, services et utilitaires
│       ├── components/   # Composants UI réutilisables
│       ├── features/     # Fonctionnalités spécifiques
│       ├── hooks/        # Hooks Svelte
│       ├── i18n/         # Système de traduction
│       ├── services/     # Services API et logique métier
│       ├── styles/       # Styles globaux
│       ├── types/        # Définitions TypeScript
│       └── utils/        # Utilitaires génériques
├── src-tauri/            # Backend Rust Tauri
│   ├── src/              # Code Rust principal
│   ├── Cargo.toml        # Dépendances Rust
│   └── tauri.conf.json   # Configuration Tauri
├── static/               # Ressources statiques
└── scripts/              # Scripts de développement
```

### Technologies clés
- **Frontend**: SvelteKit 2, Svelte 5 (runes), TypeScript 5.6, Tailwind CSS 4
- **Backend**: Rust, Tauri 2, reqwest (HTTP client)
- **UI Components**: bits-ui, shadcn-svelte
- **Icônes**: lucide-svelte
- **Build**: Vite 6, adapter-static
- **API**: Communication via HTTP avec backend externe

## Architecture Front-end

### Framework et gestion de l'état
- **Svelte 5 avec Runes**: Utilisation des runes (`$state`, `$derived`, `$effect`) pour une gestion réactive de l'état
- **SvelteKit 2**: Framework pour le routage, le SSR (simulé en SPA) et la structure de l'application
- **Gestion d'état**:
  - Stores Svelte pour les données globales (authentification, i18n)
  - `authStore.ts` pour la gestion de l'état d'authentification
  - `companyStore.ts` pour les données de la compagnie
  - `i18nStore` pour la gestion des traductions

### Structure des composants
- **Composants UI**: Répartis dans `src/lib/components/ui/` avec une structure basée sur shadcn-svelte
- **Composants fonctionnels**: Dans `src/lib/components/` pour les composants spécifiques au domaine
- **Réutilisabilité**: Utilisation d'alias dans `svelte.config.js` pour un accès simplifié aux composants
- **Gestion des permissions**: Structure prévue pour la gestion des permissions RBAC (en cours d'implémentation)

### Gestion de l'internationalisation (i18n) et du multi-devises
- **Système i18n**:
  - Basé sur Svelte 5 runes avec `I18nProvider.svelte` et `Translate.svelte`
  - Configuration dans `src/lib/i18n/config.ts`
  - Modules de traduction séparés (common, navigation, sales, etc.)
  - Chargement dynamique des traductions
- **Multi-devises**:
  - Service de configuration locale dans `src/lib/utils/locale.ts`
  - Stockage de la devise dans localStorage
  - Utilitaires de formatage dans `src/lib/utils/numbers.ts`
  - Support des formats monétaires selon la locale

## Architecture Back-end & Données

### Modèle de données
Les entités principales du système sont :
- **Stations**: Gestion des stations-service avec code, nom, adresse, coordonnées GPS
- **Cuves**: Réservoirs de carburant avec capacité, niveau actuel, type de carburant
- **Carburants**: Types de carburants avec libellé et code
- **Pompes**: Pompes à essence associées aux cuves
- **Employés**: Personnel de la station avec rôles et permissions
- **Clients**: Informations sur les clients
- **Ventes**: Transactions de vente de carburant et de produits
- **Trésoreries**: Gestion des caisses, banques, mobile money

### Architecture multi-tenant
- **Stratégie**: Le système semble implémenter une architecture multi-tenant avec des données isolées par compagnie/station
- **Isolation**: Les données sont liées à des `compagnie_id` et `station_id` dans les modèles
- **Configuration**: Chaque station peut avoir des configurations spécifiques (prix carburant, etc.)

### Flux de données
- **Frontend vers Backend**: Communication via HTTP avec le backend externe (https://successfuel-api.onrender.com)
- **Authentification**: JWT avec gestion des tokens d'accès et de rafraîchissement
- **API Services**: Architecture modulaire avec `HttpClient.ts` et services spécifiques par entité
- **Tauri**: Le backend Rust gère l'authentification et la communication avec le serveur distant

## Logiques Métiers

### Calcul des stocks de carburant
- **Calcul de volume**: Utilisation de la fonction `calculateTankVolume` dans `src/lib/utils/formulas.ts` qui effectue une interpolation linéaire basée sur les données de barémage
- **Réception vs ventes**: Le système gère les états initiaux des cuves via `TankInitialStockService` et calcule les volumes en fonction des hauteurs de jauge
- **Calcul de consommation**: Fonction `calculateFuelConsumption` pour déterminer la consommation moyenne par jour

### Conversion automatique des devises
- **Service de locale**: `src/lib/utils/locale.ts` gère la devise actuelle de l'utilisateur
- **Formatage monétaire**: `src/lib/utils/numbers.ts` contient `formatCurrency` qui utilise `Intl.NumberFormat`
- **Calculs financiers**: `src/lib/utils/financial.ts` pour les conversions et calculs financiers

### Transformation des ventes en écritures comptables
- **Logique comptable**: Non entièrement implémentée dans le code actuel, mais la structure est prévue
- **Services prévus**: Des services comme `TreasuryService` et `TreasuryInitialStateService` suggèrent une intégration comptable
- **Calculs financiers**: Utilisation de `src/lib/utils/financial.ts` pour les calculs de taxes, marges, etc.

### Règles de gestion des taxes par pays
- **Calcul de taxes**: Fonction `calculateTax` dans `src/lib/utils/financial.ts` permet de calculer la TVA
- **Flexibilité**: Le système est conçu pour supporter différents taux de taxes selon les pays
- **Paramètres locaux**: Les taux peuvent être configurés selon la localisation de la station

## État de conformité au CDC

### Fonctionnalités détectées

| Fonctionnalité | État | Détails |
|---|---|---|
| Gestion multi-pays | Partiellement implémenté | Système i18n et multi-devises en place, mais configuration par pays en cours |
| Gestion multi-devises | Implémenté | Service de locale avec support des devises multiples |
| Gestion multi-stations | Implémenté | Architecture avec `station_id` pour l'isolation des données |
| Calcul des stocks carburant | Implémenté | Formules de calcul de volume basées sur le barémage |
| Interface utilisateur moderne | Implémenté | SvelteKit 2 avec composants UI modernes |
| Authentification sécurisée | En cours | Structure RBAC prévue, authentification JWT en place |
| Gestion des permissions | En cours | Structure prévue mais non entièrement implémentée |
| Comptabilité simplifiée | Partiellement implémenté | Services trésorerie en place, mais intégration comptable complète manquante |

### Points de conformité
- ✅ **Efficacité**: Architecture modulaire et réactive avec Svelte 5 runes
- ✅ **Robustesse**: Gestion des erreurs centralisée avec `ErrorHandler.ts`
- ⚠️ **Multi-pays**: Système i18n en place mais configuration spécifique par pays en cours
- ✅ **Multi-devises**: Support complet des différentes devises
- ⚠️ **Comptabilité**: Fonctionnalités de base en place mais système complet en développement
- ✅ **Sécurité**: Authentification JWT avec gestion des tokens
- ⚠️ **Permissions**: Structure RBAC prévue mais non entièrement implémentée

### État du développement
- **Phase 1**: Architecture frontend et i18n (terminée)
- **Phase 2**: Intégration backend (en cours)
- **Phase 3**: Fonctionnalités avancées (planifiée)
- **Roadmap**: Jusqu'à la semaine 16 avec des jalons clairs