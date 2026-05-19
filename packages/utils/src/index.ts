import { Transaction } from '@repo/types';

/**
 * Formats a numeric amount as currency.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'es-ES'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Compares two descriptions using a basic fuzzy match (lowercase, clean symbols).
 */
export function isDescriptionSimilar(desc1: string | null, desc2: string | null): boolean {
  if (!desc1 || !desc2) return desc1 === desc2;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  return clean(desc1).includes(clean(desc2)) || clean(desc2).includes(clean(desc1));
}

/**
 * Deduplicates incoming transactions against existing ones.
 * Returns an array of transactions that are NOT duplicates.
 * Matching criteria:
 * - Same absolute amount AND type
 * - Date within +/- 1 day
 * - Similar description OR same account
 */
export function deduplicateTransactions(
  existing: Transaction[],
  incoming: Partial<Transaction>[]
): Partial<Transaction>[] {
  return incoming.filter((inc) => {
    const incDateStr = inc.date;
    if (inc.amount === undefined || !inc.type || !incDateStr) return true;

    const isDuplicate = existing.some((ext) => {
      // 1. Compare amounts
      const amountMatch = Math.abs(Number(ext.amount)) === Math.abs(Number(inc.amount));
      if (!amountMatch) return false;

      // 2. Compare types
      const typeMatch = ext.type === inc.type;
      if (!typeMatch) return false;

      // 3. Compare dates (+/- 1 day window)
      const extDate = new Date(ext.date);
      const incDate = new Date(incDateStr);
      const diffTime = Math.abs(extDate.getTime() - incDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const dateMatch = diffDays <= 1;
      if (!dateMatch) return false;

      // 4. Compare descriptions (fuzzy match) or account
      const descMatch = isDescriptionSimilar(ext.description, inc.description || null);
      const accountMatch = ext.account_id === inc.account_id;

      return descMatch || accountMatch;
    });

    return !isDuplicate;
  });
}
