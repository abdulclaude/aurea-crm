type ServicePayment = {
  paymentType: string;
  price: string | number | null;
  slidingScaleMinPrice: string | number | null;
  slidingScaleMaxPrice: string | number | null;
  currency: string;
};

export function formatServiceMoney(
  value: string | number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatServicePayment(service: ServicePayment): string {
  if (service.paymentType === "PAID" && service.price != null) {
    return formatServiceMoney(service.price, service.currency);
  }

  if (
    service.paymentType === "SLIDING_SCALE" &&
    service.slidingScaleMinPrice != null &&
    service.slidingScaleMaxPrice != null
  ) {
    return `${formatServiceMoney(service.slidingScaleMinPrice, service.currency)} - ${formatServiceMoney(service.slidingScaleMaxPrice, service.currency)}`;
  }

  if (service.paymentType === "FREE") return "Free";
  if (service.paymentType === "PACKAGE_ONLY") {
    return "Package/membership only";
  }
  return "Sliding scale";
}
