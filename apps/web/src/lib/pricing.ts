/**
 * Utility functions for calculating listing prices with hourly rates and multi-day discounts
 */

export type ListingPricingOptions = {
  hourlyAllowed?: boolean;
  pricePerHour?: number | null;
  durationDiscount3Days?: number | null;
  durationDiscount7Days?: number | null;
  durationDiscount30Days?: number | null;
};

export type ListingForPricing = {
  pricePerDay?: number | { toNumber?: () => number } | null;
  currency?: string;
  options?: {
    pricing?: ListingPricingOptions;
  } | null;
};

export type PriceCalculationResult = {
  basePrice: number;
  discount: number;
  finalPrice: number;
  isHourly: boolean;
  hours: number;
  days: number;
  discountThreshold: number | null; // 3, 7, or 30
};

/**
 * Calculate the total price for a listing based on start and end dates/times
 * Takes into account hourly rates and multi-day discounts (J+3, J+7, J+30)
 */
export function calculateListingPrice(
  startAt: string | Date,
  endAt: string | Date,
  listing: ListingForPricing,
): PriceCalculationResult | null {
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt;

  if (!start || !end || end <= start) {
    return null;
  }

  // Extract pricing options
  const pricing = listing.options?.pricing;
  const hourlyAllowed = pricing?.hourlyAllowed === true;
  const pricePerHour = pricing?.pricePerHour ?? null;
  const pricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay)
      : null;

  if (!pricePerDay && !(hourlyAllowed && pricePerHour)) {
    return null;
  }

  // Calculate duration
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.ceil(durationMs / (1000 * 60 * 60));
  const days = Math.ceil(hours / 24);

  let basePrice: number;
  let isHourly = false;

  // Determine if we should use hourly pricing
  if (hourlyAllowed && pricePerHour && pricePerHour > 0) {
    // Use hourly pricing
    basePrice = pricePerHour * hours;
    isHourly = true;
  } else if (pricePerDay && pricePerDay > 0) {
    // Use daily pricing
    basePrice = pricePerDay * days;
  } else {
    return null;
  }

  // Apply multi-day discounts based on days (even for hourly rentals)
  let discount = 0;
  let discountThreshold: number | null = null;

  const discount30Days = pricing?.durationDiscount30Days ?? null;
  const discount7Days = pricing?.durationDiscount7Days ?? null;
  const discount3Days = pricing?.durationDiscount3Days ?? null;

  if (days >= 30 && discount30Days != null && discount30Days > 0) {
    discount = discount30Days;
    discountThreshold = 30;
  } else if (days >= 7 && discount7Days != null && discount7Days > 0) {
    discount = discount7Days;
    discountThreshold = 7;
  } else if (days >= 3 && discount3Days != null && discount3Days > 0) {
    discount = discount3Days;
    discountThreshold = 3;
  }

  const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

  return {
    basePrice,
    discount,
    finalPrice,
    isHourly,
    hours,
    days,
    discountThreshold,
  };
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate the total price for selected options
 */
export function calculateOptionsPrice(
  options: {
    insurance?: boolean;
    guarantees?: boolean;
    delivery?: { enabled: boolean; coordinates?: { lat: number; lng: number } };
    flexibleReturn?: { enabled: boolean; coordinates?: { lat: number; lng: number } };
    secondDriver?: { enabled: boolean };
  },
  listingOptions: {
    insurance?: { price?: number };
    delivery?: { price?: number; pricePerKm?: number; radiusKm?: number };
    pickup?: { returnPricePerKm?: number; returnPrice?: number };
    secondDriver?: { price?: number };
  } | null | undefined,
  listingCoords?: { lat: number; lng: number } | null,
): number {
  let total = 0;

  if (options.insurance && listingOptions?.insurance?.price != null) {
    total += listingOptions.insurance.price;
  }

  if (options.guarantees) {
    // TODO: Get guarantees price from listing options when available
    total += 25;
  }

  if (options.delivery?.enabled && listingOptions?.delivery) {
    const delivery = listingOptions.delivery;
    if (delivery.pricePerKm != null && delivery.pricePerKm > 0 && listingCoords && options.delivery.coordinates) {
      const distance = haversineDistanceKm(
        listingCoords.lat,
        listingCoords.lng,
        options.delivery.coordinates.lat,
        options.delivery.coordinates.lng,
      );
      total += distance * delivery.pricePerKm;
    } else if (delivery.price != null) {
      total += delivery.price;
    }
  }

  if (options.flexibleReturn?.enabled && options.flexibleReturn.coordinates && listingCoords && listingOptions?.pickup) {
    const pickup = listingOptions.pickup;
    const returnLat = pickup.returnLat ?? listingCoords.lat;
    const returnLng = pickup.returnLng ?? listingCoords.lng;
    if (pickup.returnPricePerKm != null && pickup.returnPricePerKm > 0) {
      const distance = haversineDistanceKm(
        returnLat,
        returnLng,
        options.flexibleReturn.coordinates.lat,
        options.flexibleReturn.coordinates.lng,
      );
      total += distance * pickup.returnPricePerKm;
    } else if (pickup.returnPrice != null && pickup.returnPrice > 0) {
      total += pickup.returnPrice;
    }
  }

  if (options.secondDriver?.enabled && listingOptions?.secondDriver?.price != null) {
    total += listingOptions.secondDriver.price;
  }

  return total;
}
