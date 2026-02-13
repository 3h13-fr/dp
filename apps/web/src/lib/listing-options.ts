/**
 * Types for listing options (defined by host)
 */

export type ListingPricingOptions = {
  hourlyAllowed?: boolean;
  pricePerHour?: number | null;
  durationDiscount3Days?: number | null;
  durationDiscount7Days?: number | null;
  durationDiscount30Days?: number | null;
};

export type ListingDeliveryOptions = {
  available: boolean;
  radiusKm: number;
  pricePerKm: number;
  price?: number; // legacy flat fee
};

export type ListingInsuranceOptions = {
  available?: boolean;
  price?: number;
  description?: string;
  usePlatformInsurance?: boolean;
  policyIds?: string[];
  policies?: Array<{ id: string; name: string }>;
};

export type ListingSecondDriverOptions = {
  available: boolean;
  price: number;
};

export type ListingPickupOptions = {
  returnMethod?: 'same' | 'different';
  returnAddress?: string;
  returnMaxDistanceKm?: number;
  returnLat?: number;
  returnLng?: number;
};

export type ListingOptions = {
  pricing?: ListingPricingOptions;
  delivery?: ListingDeliveryOptions;
  insurance?: ListingInsuranceOptions;
  secondDriver?: ListingSecondDriverOptions;
  pickup?: ListingPickupOptions;
};

/**
 * Types for booking options (selected by user)
 */

export type BookingDeliveryOption = {
  enabled: boolean;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type BookingSecondDriverOption = {
  enabled: boolean;
  driverInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

export type BookingFlexibleReturnOption = {
  enabled: boolean;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type BookingOptions = {
  insurance?: boolean;
  guarantees?: boolean;
  delivery?: BookingDeliveryOption;
  secondDriver?: BookingSecondDriverOption;
  flexibleReturn?: BookingFlexibleReturnOption;
};
