/**
 * Utilitaires pour les calculs financiers dans SuccessFuel
 */

import { roundCurrency, calculatePercent, formatCurrency } from './numbers';
import { getCurrentCurrency } from './locale';

/**
 * Calcule la TVA sur un montant
 * @param amount - Le montant de base
 * @param taxRate - Le taux de TVA (ex: 18 pour 18%)
 * @returns L'objet contenant le montant HT, le montant de TVA et le montant TTC
 */
export interface TaxCalculation {
  amountBeforeTax: number;
  taxAmount: number;
  amountAfterTax: number;
  taxRate: number;
}

export function calculateTax(amount: number, taxRate: number): TaxCalculation {
  const taxAmount = calculatePercent(amount, taxRate);
  const amountAfterTax = amount + taxAmount;
  
  return {
    amountBeforeTax: roundCurrency(amount),
    taxAmount: roundCurrency(taxAmount),
    amountAfterTax: roundCurrency(amountAfterTax),
    taxRate
  };
}

/**
 * Calcule le prix de vente à partir du prix d'achat et de la marge souhaitée
 * @param purchasePrice - Prix d'achat
 * @param marginPercent - Marge souhaitée en pourcentage
 * @returns Le prix de vente calculé
 */
export function calculateSellingPrice(purchasePrice: number, marginPercent: number): number {
  const markup = calculatePercent(purchasePrice, marginPercent);
  return roundCurrency(purchasePrice + markup);
}

/**
 * Calcule le pourcentage de marge à partir des prix d'achat et de vente
 * @param purchasePrice - Prix d'achat
 * @param sellingPrice - Prix de vente
 * @returns Le pourcentage de marge
 */
export function calculateMarginPercent(purchasePrice: number, sellingPrice: number): number {
  if (purchasePrice <= 0) {
    return 0;
  }
  
  const margin = sellingPrice - purchasePrice;
  return roundCurrency((margin / purchasePrice) * 100);
}

/**
 * Calcule la marge brute en valeur
 * @param purchasePrice - Prix d'achat
 * @param sellingPrice - Prix de vente
 * @returns La marge brute en valeur
 */
export function calculateMarginValue(purchasePrice: number, sellingPrice: number): number {
  return roundCurrency(sellingPrice - purchasePrice);
}

/**
 * Calcule un discount sur un prix
 * @param price - Prix de base
 * @param discountPercent - Pourcentage de remise
 * @returns Le prix après remise
 */
export function calculateDiscount(price: number, discountPercent: number): number {
  const discountAmount = calculatePercent(price, discountPercent);
  return roundCurrency(price - discountAmount);
}

/**
 * Calcule le montant total avec une remise
 * @param price - Prix unitaire
 * @param quantity - Quantité
 * @param discountPercent - Pourcentage de remise
 * @returns L'objet contenant les montants avant/après remise
 */
export interface TotalCalculation {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export function calculateTotalWithDiscount(price: number, quantity: number, discountPercent: number = 0): TotalCalculation {
  const subtotal = price * quantity;
  const discountAmount = calculatePercent(subtotal, discountPercent);
  const total = subtotal - discountAmount;
  
  return {
    subtotal: roundCurrency(subtotal),
    discountAmount: roundCurrency(discountAmount),
    total: roundCurrency(total)
  };
}

/**
 * Calcule la valeur d'un stock (quantité * prix unitaire)
 * @param quantity - Quantité en stock
 * @param unitPrice - Prix unitaire
 * @returns La valeur totale du stock
 */
export function calculateStockValue(quantity: number, unitPrice: number): number {
  return roundCurrency(quantity * unitPrice);
}

/**
 * Calcule le coût moyen pondéré (PMP - Prix Moyen Pondéré)
 * @param currentQuantity - Quantité actuelle en stock
 * @param currentPrice - Prix moyen actuel
 * @param newQuantity - Nouvelle quantité entrante
 * @param newPrice - Prix d'achat de la nouvelle quantité
 * @returns Le nouveau prix moyen pondéré
 */
export function calculateWeightedAveragePrice(
  currentQuantity: number,
  currentPrice: number,
  newQuantity: number,
  newPrice: number
): number {
  const totalValue = (currentQuantity * currentPrice) + (newQuantity * newPrice);
  const totalQuantity = currentQuantity + newQuantity;
  
  if (totalQuantity === 0) {
    return 0;
  }
  
  return roundCurrency(totalValue / totalQuantity);
}

/**
 * Formate une valeur financière avec une devise
 * @param value - La valeur à formater
 * @param currency - Le code de la devise (par défaut la devise courante de l'utilisateur)
 * @returns La valeur formatée avec la devise
 */
export function formatFinancialValue(value: number, currency?: string): string {
  const formatCurrencyCode = currency || getCurrentCurrency();
  return formatCurrency(value, formatCurrencyCode);
}

/**
 * Calcule un ratio financier (ex: marge, rentabilité, etc.)
 * @param numerator - Numérateur
 * @param denominator - Dénominateur
 * @returns Le ratio en pourcentage
 */
export function calculateFinancialRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return roundCurrency((numerator / denominator) * 100);
}