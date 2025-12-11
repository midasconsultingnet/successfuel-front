# Conventions de codage et d'architecture pour SuccessFuel

## Table des matières
1. [Architecture générale](#architecture-générale)
2. [Conventions de nommage](#conventions-de-nommage)
3. [Structure des composants Svelte](#structure-des-composants-svelte)
4. [Gestion des états](#gestion-des-états)
5. [Gestion des styles](#gestion-des-styles)
6. [Gestion des données et API](#gestion-des-données-et-api)
7. [Tests](#tests)
8. [Documentation](#documentation)
9. [Sécurité](#sécurité)

## Architecture générale

### Architecture hexagonale (ports and adapters)
L'application suit une architecture modulaire avec une séparation claire entre:
- **UI Layer**: Composants Svelte et interfaces utilisateur
- **Application Layer**: Logique métier et orchestration
- **Domain Layer**: Entités et règles métier pures
- **Infrastructure Layer**: Services externes, API, persistance

### Structure des dossiers
- `src/lib/components/`: Composants UI réutilisables
- `src/lib/features/`: Fonctionnalités spécifiques organisées par domaine
- `src/lib/utils/`: Fonctions utilitaires génériques
- `src/lib/services/`: Services métier et d'infrastructure
- `src/routes/`: Pages et routes SvelteKit
- `src-tauri/`: Code backend Rust

## Conventions de nommage

### TypeScript / JavaScript
- `camelCase` pour les variables, fonctions et propriétés
- `PascalCase` pour les composants, classes et types
- `UPPER_SNAKE_CASE` pour les constantes
- Utiliser des noms descriptifs et éviter les abréviations

### Svelte Components
- Fichiers en `.svelte`
- Noms en `PascalCase`
- Utiliser un préfixe pour les composants spécifiques (ex: `StockTable.svelte`, `EmployeeCard.svelte`)

### CSS Classes (Tailwind)
- Utiliser les classes utilitaires Tailwind plutôt que des classes personnalisées
- Pour les styles complexes, créer des composants UI dans `src/lib/components/ui/`

## Structure des composants Svelte

### Bonnes pratiques
```svelte
<script lang="ts">
  // 1. Importations
  import type { MyType } from '$lib/types';
  import { myFunction } from '$lib/utils';
  import { Button } from '$lib/components/ui/button.svelte';
  
  // 2. Déclaration des props avec $props()
  let {
    requiredProp,
    optionalProp = 'default'
  }: Props = $props();
  
  // 3. Variables réactives avec $state() ou $derived()
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  // 4. Événements personnalisés avec $on()
  $on('mount', () => {
    console.log('Component mounted');
  });
</script>

<!-- 5. Structure HTML claire et sémantique -->
<div class="container">
  <h1>{count}</h1>
  <Button on:click={() => count++}>Increment</Button>
</div>

<style>
  /* 6. Styles limités si nécessaire, préférer Tailwind */
</style>
```

### Gestion des événements
- Utiliser les événements natifs du DOM
- Créer des événements personnalisés avec `dispatch` si nécessaire
- Gérer les erreurs de manière appropriée

## Gestion des états

### Variables réactives
- Utiliser `$state()` pour les variables réactives
- Utiliser `$derived()` pour les calculs dérivés
- Éviter les variables globales non nécessaires

### États complexes
Pour les états complexes ou partagés, envisager:
- Une bibliothèque d'état comme Svelte Stores
- Des services dédiés dans `src/lib/services/`

### Stores Svelte
```typescript
// stores/counter.ts
import { writable } from 'svelte/store';

export const count = writable(0);

// Utilisation dans un composant
import { count } from '$lib/stores/counter';
```

## Gestion des styles

### Tailwind CSS
- Utiliser les classes utilitaires Tailwind pour le style
- Créer des composants UI pour les éléments récurrents
- Personnaliser le thème dans `tailwind.config.js`
- Utiliser les variables CSS pour le thème (voir `src/routes/+layout.css`)

### Thème Slate
- Le thème Slate est configuré avec des variables CSS dans `+layout.css`
- Utiliser les classes de couleurs standard: `bg-primary`, `text-secondary`, etc.
- Respecter les variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`

### Responsive Design
- Utiliser les variantes responsive de Tailwind: `md:`, `lg:`, etc.
- Privilégier des interfaces mobile-first

## Gestion des données et API

### Types TypeScript
- Définir des types dans `src/lib/types/`
- Utiliser des interfaces pour les objets complexes
- Valider les données avec des bibliothèques comme Zod si nécessaire

### Communication avec le backend
- Utiliser les commandes Tauri pour la communication Rust-frontend
- Créer des services d'API dans `src/lib/services/`
- Gérer les erreurs de manière appropriée

### Schéma de données exemple
```typescript
// types/stock.ts
export interface FuelLevel {
  id: number;
  type: string;     // Type de carburant
  currentLevel: number; // Niveau actuel en %
  capacity: number; // Capacité max en litres
  unit: string;     // Unité de mesure
  lastUpdated: string; // Date de dernière mise à jour
}
```

## Tests

### Types de tests
- Tests unitaires pour les fonctions utilitaires
- Tests d'intégration pour les composants
- Tests E2E pour les fonctionnalités critiques

### Outils de test
- Vitest pour les tests unitaires
- Testing Library pour les tests de composants
- Playwright pour les tests E2E

### Structure des tests
```
src/
├── lib/
│   ├── utils/
│   │   ├── myFunction.ts
│   │   └── myFunction.test.ts
├── routes/
│   ├── +page.svelte
│   └── +page.test.svelte
```

## Documentation

### Commentaires dans le code
- Documenter les fonctions complexes
- Utiliser JSDoc pour les fonctions exportées
- Expliquer les décisions d'architecture importantes

### Documentation externe
- Mettre à jour `DEVELOPMENT_GUIDE.md` pour les changements architecturaux
- Documenter les API et les interfaces dans des fichiers séparés
- Maintenir une documentation utilisateur à jour

## Sécurité

### Validation des entrées
- Valider toutes les données utilisateur
- Utiliser des bibliothèques de validation comme Zod
- Échapper les entrées potentiellement dangereuses

### Protection contre XSS
- Utiliser les mécanismes de protection de Svelte
- Échapper le HTML utilisateur si nécessaire
- Valider les URLs et fichiers téléchargés

### Communication sécurisée
- Utiliser HTTPS en production
- Valider les origines dans les communications IPC
- Suivre les meilleures pratiques Tauri pour la sécurité

---

Ces conventions visent à maintenir une base de code propre, lisible et maintenable. Elles doivent être suivies par tous les contributeurs au projet SuccessFuel.