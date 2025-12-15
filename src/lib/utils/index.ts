/**
 * Export centralisé de tous les utilitaires SuccessFuel
 *
 * Utilisation:
 * import { formatCurrency, calculateTax } from '$lib/utils';
 */

// Configuration locale
export * from './locale';

// Nombres, prix, dates et pourcentages (les plus fréquemment utilisées dans SuccessFuel)
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  roundCurrency,
  calculatePercent
} from './numbers';

export {
  formatFinancialValue
} from './financial';

export {
  formatLocalDate,
  formatDateTime
} from './dates';

// Tous les autres modules (moins fréquents)
export * from './validation';
export * from './statistics';
export * from './inventory';
export * from './formulas';
export * from './security';
export * from './exports';
export * from './helpers';