import type { ExchangeRateCache } from '@/types';

// Cache duration in hours
const CACHE_DURATION_HOURS = 24;

// Open Exchange Rates API response type
interface OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

/**
 * Fetch exchange rates from Open Exchange Rates API
 * Note: Free tier only supports USD as base currency
 * For other base currencies, we convert through USD
 */
export async function fetchExchangeRates(
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<ExchangeRateCache> {
  const appId = process.env.OPENEXCHANGERATES_APP_ID;

  if (!appId) {
    throw new Error('OPENEXCHANGERATES_APP_ID environment variable is not set');
  }

  // Fetch rates with USD as base (free tier limitation)
  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${appId}`,
    { next: { revalidate: 3600 } } // Cache for 1 hour at fetch level
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data: OpenExchangeRatesResponse = await response.json();
  const now = new Date().toISOString();

  // If base currency is USD, use rates directly
  // Otherwise, convert through USD
  const baseRate = data.rates[baseCurrency] || 1;

  const rates: ExchangeRateCache['rates'] = {};

  for (const currency of targetCurrencies) {
    if (currency === baseCurrency) {
      rates[currency] = { rate: 1, fetchedAt: now };
    } else {
      // Convert: 1 baseCurrency = X targetCurrency
      // Formula: (targetRate / baseRate)
      const targetRate = data.rates[currency];
      if (targetRate) {
        rates[currency] = {
          rate: targetRate / baseRate,
          fetchedAt: now,
        };
      }
    }
  }

  // Always include the base currency
  rates[baseCurrency] = { rate: 1, fetchedAt: now };

  return {
    baseCurrency,
    rates,
    lastUpdated: now,
  };
}

/**
 * Check if cached exchange rates are still valid
 */
export function isCacheValid(cache: ExchangeRateCache | undefined): boolean {
  if (!cache?.lastUpdated) return false;

  const lastUpdated = new Date(cache.lastUpdated);
  const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

  return hoursSinceUpdate < CACHE_DURATION_HOURS;
}

/**
 * Convert amount between currencies using cached rates
 * Returns null if conversion is not possible
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  cache: ExchangeRateCache | undefined
): { convertedAmount: number; rate: number } | null {
  if (!cache) return null;

  // Same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, rate: 1 };
  }

  const baseCurrency = cache.baseCurrency;

  // If converting from base currency
  if (fromCurrency === baseCurrency) {
    const toRate = cache.rates[toCurrency]?.rate;
    if (!toRate) return null;
    return {
      convertedAmount: amount * toRate,
      rate: toRate,
    };
  }

  // If converting to base currency
  if (toCurrency === baseCurrency) {
    const fromRate = cache.rates[fromCurrency]?.rate;
    if (!fromRate) return null;
    return {
      convertedAmount: amount / fromRate,
      rate: 1 / fromRate,
    };
  }

  // Cross conversion through base currency
  const fromRate = cache.rates[fromCurrency]?.rate;
  const toRate = cache.rates[toCurrency]?.rate;

  if (!fromRate || !toRate) return null;

  // Convert: amount in fromCurrency -> baseCurrency -> toCurrency
  const amountInBase = amount / fromRate;
  const convertedAmount = amountInBase * toRate;
  const effectiveRate = toRate / fromRate;

  return {
    convertedAmount,
    rate: effectiveRate,
  };
}

/**
 * Format exchange rate for display
 * e.g., "1 USD = 0.92 EUR"
 */
export function formatExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  rate: number
): string {
  const formattedRate = rate < 1
    ? rate.toFixed(4)
    : rate.toFixed(2);
  return `1 ${baseCurrency} = ${formattedRate} ${targetCurrency}`;
}

/**
 * Get age of cache in human-readable format
 */
export function getCacheAge(cache: ExchangeRateCache | undefined): string {
  if (!cache?.lastUpdated) return 'Never updated';

  const lastUpdated = new Date(cache.lastUpdated);
  const hoursAgo = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60));

  if (hoursAgo < 1) {
    const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60));
    return minutesAgo <= 1 ? 'Just now' : `${minutesAgo} minutes ago`;
  }

  if (hoursAgo < 24) {
    return `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
}
