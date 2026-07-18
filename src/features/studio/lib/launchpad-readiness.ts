import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

export type LaunchpadPricingFact = {
  currency: string;
  price: string;
};

export type LaunchpadReadinessFacts = {
  hasStudioProfile: boolean;
  hasRooms: boolean;
  hasClassTypes: boolean;
  hasInstructors: boolean;
  hasValidPricing: boolean;
  hasFutureBookableClass: boolean;
  hasPublishedBookingSurface: boolean;
  paidPublicSalesEnabled: boolean;
  paymentProviderReady: boolean;
};

function percentage(completed: number, total: number): number {
  return total === 0 ? 100 : Math.round((completed / total) * 100);
}

export function isSupportedCurrency(value: string): boolean {
  try {
    const normalized = normalizeCurrency(value);
    currencyExponent(normalized);
    return Intl.supportedValuesOf("currency").includes(normalized);
  } catch {
    return false;
  }
}

export function isValidLocalPricing(
  pricing: LaunchpadPricingFact,
  localCurrency: string,
): boolean {
  if (
    !isSupportedCurrency(localCurrency) ||
    normalizeCurrency(pricing.currency) !== normalizeCurrency(localCurrency)
  ) {
    return false;
  }
  try {
    return (
      decimalToMinorUnits(pricing.price, currencyExponent(localCurrency)) >= 0
    );
  } catch {
    return false;
  }
}

export function hasPaidPublicSale(
  pricing: readonly LaunchpadPricingFact[],
): boolean {
  return pricing.some((item) => {
    if (!isSupportedCurrency(item.currency)) return false;
    try {
      return (
        decimalToMinorUnits(item.price, currencyExponent(item.currency)) > 0
      );
    } catch {
      return false;
    }
  });
}

export function buildLaunchpadReadiness(input: LaunchpadReadinessFacts) {
  const foundationSteps = [
    input.hasStudioProfile,
    input.hasRooms,
    input.hasClassTypes,
    input.hasInstructors,
    input.hasValidPricing,
  ];
  const goLiveSteps = [
    input.hasFutureBookableClass,
    input.hasPublishedBookingSurface,
    ...(input.paidPublicSalesEnabled ? [input.paymentProviderReady] : []),
  ];
  const foundationCompleted = foundationSteps.filter(Boolean).length;
  const goLiveCompleted = goLiveSteps.filter(Boolean).length;
  const completed = foundationCompleted + goLiveCompleted;
  const total = foundationSteps.length + goLiveSteps.length;

  return {
    ...input,
    paymentProviderRequired: input.paidPublicSalesEnabled,
    foundation: {
      completed: foundationCompleted,
      total: foundationSteps.length,
      percentage: percentage(foundationCompleted, foundationSteps.length),
      ready: foundationCompleted === foundationSteps.length,
    },
    goLive: {
      completed: goLiveCompleted,
      total: goLiveSteps.length,
      percentage: percentage(goLiveCompleted, goLiveSteps.length),
      ready: goLiveCompleted === goLiveSteps.length,
    },
    completed,
    total,
    percentage: percentage(completed, total),
  };
}
