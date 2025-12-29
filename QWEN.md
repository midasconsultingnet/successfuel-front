# ROLE
You MUST take the role here @ATLAS.md to assist this project

# SuccessFuel Project Overview

SuccessFuel is a cross-platform desktop application built using the Tauri + SvelteKit + TypeScript stack. It's a management system for gas stations with features for tracking inventory, sales, employees, and customers.

## Project Architecture

The project follows a typical Tauri application structure with:

- **Frontend**: Built with SvelteKit (v5 with runes), TypeScript, and Tailwind CSS
- **Backend**: Rust-based Tauri application with plugins
- **UI Components**: bits-ui and shadcn-svelte components
- **Icons**: lucide-svelte
- **Build Tool**: Vite

## Key Technologies & Dependencies

### Frontend Dependencies
- Svelte 5 (with runes) - Component framework with reactivity
- SvelteKit 2 - Application framework
- TypeScript 5.6 - Type safety
- Tailwind CSS - Styling framework
- Vite 6 - Build tool and development server
- bits-ui - Component library
- shadcn-svelte - UI components

### Backend Dependencies
- Tauri 2 - Desktop application framework
- Rust - Backend language for native performance
- @tauri-apps/api - Rust to frontend communication
- @tauri-apps/plugin-opener - File opening capabilities

## Project Structure

```
successfuel/
├── src/                    # SvelteKit frontend source
│   ├── app.html           # Main HTML template
│   ├── routes/            # SvelteKit page routes (SPA mode)
│   └── lib/               # Components, utilities, and features
│       ├── components/    # Reusable UI components
│       ├── features/      # Feature-specific code
│       ├── hooks/         # Svelte hooks
│       ├── i18n/          # Internationalization system
│       ├── services/      # Application services
│       ├── styles/        # CSS styles
│       ├── types/         # TypeScript type definitions
│       └── utils/         # Utility functions
│           ├── index.ts   # Centralized export of common utilities
│           ├── numbers.ts # Number and currency formatting utilities
│           ├── financial.ts # Financial calculation utilities
│           ├── dates.ts   # Date formatting utilities
│           ├── locale.ts  # Locale configuration service
│           ├── validation.ts # Data validation utilities
│           ├── statistics.ts # Statistical calculation utilities
│           ├── inventory.ts # Inventory management utilities
│           ├── formulas.ts # Business formula utilities
│           ├── security.ts # Security utilities
│           ├── exports.ts # Data export utilities
│           └── helpers.ts # General helper utilities
├── src-tauri/             # Tauri Rust backend source
│   ├── src/               # Rust source files
│   ├── Cargo.toml         # Rust dependencies and config
│   └── tauri.conf.json    # Tauri configuration
├── static/                # Static assets
├── docs/                  # Project documentation
├── scripts/               # Build and development scripts
├── package.json           # Node.js dependencies and scripts
├── svelte.config.js       # SvelteKit configuration
└── vite.config.js         # Vite configuration
```

## Building and Running

### Prerequisites
- Node.js (with pnpm package manager)
- Rust and Cargo (for Tauri backend)

### Development
To start the development environment:
```bash
pnpm tauri dev
```
This will start both the Vite development server and the Tauri application.

Alternatively, you can run just the frontend with:
```bash
pnpm dev
```

### Production Build
To build the application for distribution:
```bash
pnpm tauri build
```

### Other Useful Commands
- `pnpm build` - Build the SvelteKit application for static hosting
- `pnpm check` - Run TypeScript and Svelte type checking
- `pnpm check:watch` - Run type checking in watch mode
- `pnpm tauri` - Run Tauri CLI commands
- `pnpm preview` - Preview the built application locally
- `pnpm add-language` - Script to add new languages

## Configuration Details

The application is configured to work as a Single Page Application (SPA) using the `@sveltejs/adapter-static` with a fallback to `index.html`. This is necessary for Tauri since it doesn't have a Node.js server to perform server-side rendering.

The Vite configuration is set up to work specifically with Tauri:
- Port is fixed at 1420 for development
- HMR (Hot Module Replacement) is configured to work with Tauri
- File watching ignores the `src-tauri` directory to prevent conflicts

## Internationalization (i18n) System

The project implements a modern i18n system based on Svelte 5 runes with the following architecture:

### Core Components
- `I18nProvider.svelte` - Component that manages global i18n state
- `Translate.svelte` - Component for displaying translations reactively
- `index.ts` - Main i18n entry point with state management
- `config.ts` - Configuration for supported languages and modules

### Translation Modules
- `common/` - General application translations
- `navigation/` - Navigation-related translations  
- `sales/` - Sales module translations
- Additional modules can be added as needed

### Usage
The system uses Svelte 5 runes for reactivity:
```svelte
<script>
  import Translate from "$lib/i18n/Translate.svelte";
</script>

<!-- Simple usage -->
<Translate key="app_name" module="common" />

<!-- With fallback -->
<Translate key="dashboard" module="navigation" fallback="Dashboard" />
```

The system automatically loads translations from localStorage on startup and persists the selected language.

## Architecture

The project follows an architecture hexagonale (ports and adapters) with clear separation between:
- **UI Layer**: Svelte components and user interfaces
- **Application Layer**: Business logic and orchestration
- **Domain Layer**: Pure business entities and rules
- **Infrastructure Layer**: External services, API, and persistence

### Directory Structure
- `src/lib/components/`: Reusable UI components
- `src/lib/features/`: Domain-specific features organized by domain
- `src/lib/utils/`: Generic utility functions
- `src/lib/services/`: Business and infrastructure services
- `src/routes/`: SvelteKit pages and routes
- `src-tauri/`: Rust backend code

### Svelte 5 Runes Implementation
- **$state**: For reactive state management
- **$derived**: For reactive derived values
- **$effect**: For reactive side effects
- Components use the structure with props defined via $props(), reactive variables with $state() or $derived(), and lifecycle events with $on()

## Internationalization (i18n) System

The project implements a modern i18n system based on Svelte 5 runes with the following architecture:

### Core Components
- `I18nProvider.svelte` - Component that manages global i18n state
- `Translate.svelte` - Component for displaying translations reactively
- `index.ts` - Main i18n entry point with state management
- `config.ts` - Configuration for supported languages and modules

### Translation Modules
- `common/` - General application translations
- `navigation/` - Navigation-related translations
- `sales/` - Sales module translations
- Additional modules can be added following the same pattern

### Adding New Translation Modules

To add a new translation module, follow these steps:

1. **Create translation files**:
   - Create a folder in `src/lib/i18n/` with the module name (e.g., `sales`)
   - Create translation files for each supported language (e.g., `en.json`, `fr.json`)

2. **Update configuration**:
   - Add the module name to the `modules` list in `src/lib/i18n/config.ts`

3. **Update loading function**:
   - Modify the `loadAllTranslations` function in `src/lib/i18n/index.ts` to include the new module in initial loading
   - Example: `const [common, navigation, sales, newModule] = await Promise.all([...])`

4. **Use module in components**:
   - In Svelte components, use the `<Translate>` component with the appropriate module
   - Example: `<Translate key="title" module="newModule" />`

5. **Update UI components if needed**:
   - Ensure components like `DashboardLayout` include necessary translations
   - If the new module has navigation links, add translations in the navigation module

### Usage
The system uses Svelte 5 runes for reactivity:
```svelte
<script>
  import Translate from "$lib/i18n/Translate.svelte";
</script>

<!-- Simple usage -->
<Translate key="app_name" module="common" />

<!-- With fallback -->
<Translate key="dashboard" module="navigation" fallback="Dashboard" />
```

The system automatically loads translations from localStorage on startup and persists the selected language.

## Development Conventions

- The codebase follows Svelte 5 and SvelteKit 2 conventions
- TypeScript is used for type safety throughout the frontend
- Components are placed in the `src/routes/` directory following SvelteKit's file-based routing
- Tauri commands follow Rust conventions and are defined with the `#[tauri::command]` attribute
- The project uses component aliases in svelte.config.js for cleaner imports
- Svelte 5 runes ($state, $derived, $effect) are used for reactivity
- When modifying or adding a shadcn-svelte component, you MUST WebFetch the documentation for that specific component from the online documentation linked in docs/doc-shadcn-svelte.md to ensure proper usage and implementation
- Use `camelCase` for variables, functions and properties
- Use `PascalCase` for components, classes and types
- Use `UPPER_SNAKE_CASE` for constants
- Use descriptive names and avoid abbreviations
- Svelte component files use `.svelte` extension with `PascalCase` names
- Use Tailwind utility classes rather than custom CSS classes
- For complex styling, create UI components in `src/lib/components/ui/`
- Define TypeScript types in `src/lib/types/` and use interfaces for complex objects
- Use Tauri commands for Rust-frontend communication
- Create dedicated services in `src/lib/services/` for API interactions
- Document complex functions with JSDoc for exported functions
- Validate all user input and use libraries like Zod for validation

## UI Framework

The project uses:
- Tailwind CSS for styling with a custom theme
- bits-ui and shadcn-svelte for UI components
- lucide-svelte for icons
- Custom component structure in the `src/lib/components/ui/` directory

## Documentation

Documentation for Tauri can be found at https://tauri.app/
Documentation for SvelteKit can be found at https://kit.svelte.dev/
Additional project documentation is located in the `docs/` directory.

## Architecture Highlights

1. **Svelte 5 Runes**: The project leverages Svelte 5's new reactivity system with $state, $derived, and $effect
2. **Tauri Integration**: Combines web technologies with native Rust backend for desktop deployment
3. **Modular i18n**: Internationalization system organized by modules for scalability
4. **SPA Architecture**: Single-page application built with SvelteKit's adapter-static
5. **Component Library**: Uses bits-ui and shadcn-svelte for consistent UI components
6. **API Communication Layer**: Modular architecture for backend API interactions with error handling and type safety

## Utility Functions Architecture

The project implements a comprehensive utility system designed for ERP applications like SuccessFuel:

### Core Components
- `index.ts` - Centralized export module providing easy access to common utilities
- `numbers.ts` - Number formatting and currency utilities with locale support
- `financial.ts` - Financial calculation utilities with business-specific functions
- `dates.ts` - Date formatting utilities with locale-aware formatting
- `locale.ts` - Locale configuration service managing language and currency settings
- `validation.ts` - Data validation utilities with locale-adaptive validation
- Other specialized utility modules

### Key Features
- **Locale Integration**: Automatic use of user's preferred language and currency from localStorage
- **Centralized Access**: Common functions accessible via single import from `$lib/utils`
- **Modular Structure**: Specialized utilities organized in separate modules
- **ERP-Focused**: Functions specifically designed for business applications

### Common Utilities
- `formatCurrency(value, currency?)`: Formats currency values using user's default currency
- `formatNumber(value, decimals?, locale?)`: Formats numbers with proper thousand separators
- `formatPercent(value, locale?)`: Formats percentage values
- `formatLocalDate(date, locale?)`: Formats dates according to user's locale
- `formatDateTime(date, locale?)`: Formats date and time according to user's locale
- `roundCurrency(value)`: Rounds currency values to 2 decimal places
- `calculatePercent(value, percent)`: Calculates percentage of a value

### Locale Management
The locale service (`locale.ts`) automatically:
- Reads language from localStorage key 'language'
- Reads currency from localStorage key 'currency'
- Falls back to default 'fr-FR' and 'XOF' if not found
- Provides functions to update and persist locale settings

### Usage Examples
```typescript
import { formatCurrency, formatNumber, getCurrentCurrency } from '$lib/utils';

// Format currency using user's default currency
const formattedPrice = formatCurrency(1234.5); // "1 234,50 XOF" for French locale

// Format with specific currency
const usdPrice = formatCurrency(1234.5, 'USD'); // "$1,234.50" for French locale

// Format numbers with thousand separators
const formattedNumber = formatNumber(1234567.89); // "1 234 567,89" for French locale

// Get current user settings
const currency = getCurrentCurrency(); // Gets currency from localStorage
```

### Integration with Existing Components
The utilities have been integrated with existing components such as:
- Infrastructure configuration page showing fuel prices with proper currency formatting
- Automatic use of user's preferred currency and language settings

## API Communication Architecture

The project includes a modular architecture for communicating with backend services:

### Core Components
- `HttpClient.ts` - Generic HTTP client with configurable notification handling
- `ApiService.ts` - Main API service with authentication and base configuration
- `ErrorHandler.ts` - Centralized error handling with error classification
- `[Entity]Service.ts` - Entity-specific services (e.g., `CustomerService.ts`)

### Key Features
- **Dependency Injection**: Notification handlers can be injected to avoid tight coupling with UI components
- **Error Handling**: Comprehensive error classification and transformation system
- **Type Safety**: Full TypeScript support with defined interfaces for API responses
- **Modular Design**: Each entity has its own service following a consistent pattern

### Usage Example
The services can be used throughout the application with proper error handling:

```typescript
import { customerService, handleError } from "$lib/services";

try {
  const customers = await customerService.getCustomers(1, 10);
  // Process the customers data
} catch (error) {
  handleError(error);
}
```

### Notification Handling
For UI integration, notification handlers can be injected:

```typescript
import { apiService } from "$lib/services";
import { toast } from "$lib/components/ui/sonner";

const notificationHandler = {
  showError: (title, description) => toast.error(title, { description }),
  showSuccess: (title, description) => toast.success(title, { description }),
  showInfo: (title, description) => toast.info(title, { description }),
  showWarning: (title, description) => toast.warning(title, { description })
};

apiService.setNotificationHandler(notificationHandler);
```