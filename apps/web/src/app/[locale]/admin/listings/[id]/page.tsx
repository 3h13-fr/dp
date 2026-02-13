'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { HostAvailabilityCalendar } from '@/components/listings/HostAvailabilityCalendar';
import { EditableListingField } from '@/components/host/EditableListingField';
import { ListingEditTabs } from '@/components/host/ListingEditTabs';
import { Step7Photos } from '@/components/host/create-listing';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { AddressMapPicker } from '@/components/AddressMapPicker';
import { ConfirmDisableDialog } from '@/components/host/ConfirmDisableDialog';
import { FieldGroup } from '@/components/host/FieldGroup';
import { CollapsibleSection } from '@/components/host/CollapsibleSection';
import { DiscountGroup } from '@/components/host/pricing/DiscountGroup';
import { ListingStatusBar } from '@/components/host/ListingStatusBar';
import { S3Image } from '@/components/S3Image';
import { CategorySelector } from '@/components/admin/CategorySelector';
import type {
  LocationPickupData,
  PricingData,
  AvailabilityBookingRulesData,
  RulesConditionsData,
  EquipmentKey,
} from '@/components/host/create-listing';

type Tab = 'vehicle' | 'location' | 'pricing' | 'insurance' | 'availability' | 'rules' | 'photos';

// New pricing structure with percentage-based discounts
type DiscountConfig = {
  enabled: boolean;
  percentage: number | null;
};

type NewPricingData = {
  pricePerDay: number;
  caution: number | null;
  description: string;
  discount3Days: DiscountConfig;
  discount7Days: DiscountConfig;
  discount30Days: DiscountConfig;
  youngDriverFee?: number | null;
};

type ListingOptions = {
  equipment?: EquipmentKey[];
  delivery?: {
    available?: boolean;
    radiusKm?: number;
    pricePerKm?: number;
    price?: number; // legacy
    hourlyDeliveryAvailable?: boolean;
    deliveryPricePerHour?: number | null;
  };
  pickup?: {
    method?: 'handover' | 'keybox';
    returnMethod?: 'same' | 'different';
    returnAddress?: string;
    returnCity?: string;
    returnCountry?: string;
    keyboxCode?: string;
    returnMaxDistanceKm?: number;
    returnPricePerKm?: number;
  };
  pricing?: {
    weekend?: number | null;
    week?: number | null;
    month?: number | null;
    hourlyAllowed?: boolean;
    perHour?: number | null;
    durationDiscount3Days?: number | null;
    durationDiscount7Days?: number | null;
    youngDriverFee?: number | null;
    optionFees?: Record<string, number>;
    chauffeurDaily?: number | null;
    chauffeurPromo3Days?: number | null;
    chauffeurPromo7Days?: number | null;
    chauffeurPromo30Days?: number | null;
  };
  availability?: {
    bufferHours?: number;
    autoUnavailableAfterDays?: number | null;
    rejectIsolatedGaps?: boolean;
    allowedTimeSlots?: Array<{ start: string; end: string }>;
    forbiddenDepartureDays?: number[];
  };
  usageConditions?: {
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    musicAllowed?: boolean;
    tollsIncluded?: boolean;
    fuelPolicy?: 'full_to_full' | 'full_to_empty' | 'same_level';
    maxMileagePerDay?: number | null;
    excessMileagePricePerKm?: number | null;
    requireInternationalLicense?: boolean;
  };
  returnRules?: {
    returnFuelLevel?: 'full' | 'same' | 'any';
    returnCleaningRequired?: boolean;
    returnChecklist?: string[];
  };
  secondDriver?: { available?: boolean; price?: number };
  insurance?: { usePlatformInsurance?: boolean; policyIds?: string[] };
};

type ListingDetail = {
  id: string;
  type: string;
  status: string;
  slug: string;
  displayTitle?: string;
  title?: string | null;
  displayName?: string | null;
  description?: string | null;
  pricePerDay?: number | string | null;
  caution?: number | string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  vehicleId?: string | null;
  vehicle?: {
    id: string;
    make: { name: string };
    model: { name: string };
    modelYear: number;
    trimLabel?: string | null;
    transmissionType?: string | null;
    fuelType?: string | null;
    driveType?: string | null;
    topSpeedKmh?: number | null;
    zeroTo100S?: number | string | null;
    powerKw?: number | string | null;
    powerCv?: number | null;
    batteryKwh?: number | string | null;
    registrationCountry?: string | null;
    licensePlate?: string | null;
    fiscalPower?: number | null;
    ownerType?: string | null;
  } | null;
  transmission?: string | null;
  fuelType?: string | null;
  seats?: number | null;
  doors?: number | null;
  luggage?: number | null;
  minBookingNoticeHours?: number | null;
  maxBookingAdvanceDays?: number | null;
  instantBooking?: boolean;
  manualApprovalRequired?: boolean;
  minRentalDurationHours?: number | null;
  maxRentalDurationDays?: number | null;
  minDriverAge?: number | null;
  minLicenseYears?: number | null;
  options?: ListingOptions | null;
  host: { id: string; email: string; firstName: string | null; lastName: string | null };
  photos: { id: string; url: string; order: number }[];
  categories?: Array<{ id: string; category: { id: string; name: string; slug: string } }>;
};

type Make = { id: string; name: string };
type Model = { id: string; name: string };
type Country = { id: string; code: string; slug: string; name: Record<string, string> };
type Category = { id: string; name: string; slug: string; imageUrl?: string | null; order: number };

// Fonctions de formatage pour les valeurs enum du véhicule
function formatTransmissionType(value: string | null | undefined): string {
  if (!value) return '—';
  const mapping: Record<string, string> = {
    manual: 'Manuelle',
    automatic: 'Automatique',
    semi_automatic: 'Semi-automatique',
    cvt: 'CVT',
    other: 'Autre',
  };
  return mapping[value] || value;
}

function formatFuelType(value: string | null | undefined): string {
  if (!value) return '—';
  const mapping: Record<string, string> = {
    petrol: 'Essence',
    diesel: 'Diesel',
    electric: 'Électrique',
    hybrid: 'Hybride',
    lpg: 'GPL',
    other: 'Autre',
  };
  return mapping[value] || value;
}

function formatDriveType(value: string | null | undefined): string {
  if (!value) return '—';
  const mapping: Record<string, string> = {
    fwd: 'Traction avant',
    rwd: 'Propulsion arrière',
    awd: 'Transmission intégrale',
    other: 'Autre',
  };
  return mapping[value] || value;
}

function publicListingPath(type: string): string {
  if (type === 'CAR_RENTAL') return '/location';
  if (type === 'MOTORIZED_EXPERIENCE') return '/experience';
  if (type === 'CHAUFFEUR') return '/ride';
  return '/listings';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PolicyOption = { id: string; name: string; insurerName: string };
type InsuranceTabContentProps = {
  usePlatformInsurance: boolean;
  policyIds: string[];
  onSaveUsePlatform: (value: boolean) => Promise<void>;
  onSavePolicyIds: (value: string[]) => Promise<void>;
  setInsuranceOptions: React.Dispatch<React.SetStateAction<{ usePlatformInsurance: boolean; policyIds: string[] }>>;
};

function InsuranceTabContent({
  usePlatformInsurance,
  policyIds,
  onSaveUsePlatform,
  onSavePolicyIds,
  setInsuranceOptions,
}: InsuranceTabContentProps) {
  const [policiesFlat, setPoliciesFlat] = useState<PolicyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/insurance/policies')
      .then((r) => r.json())
      .then((data: { insurers?: Array<{ name: string; policies: Array<{ id: string; name: string }> }> }) => {
        const flat: PolicyOption[] = [];
        (data.insurers || []).forEach((ins) => {
          (ins.policies || []).forEach((p) => flat.push({ id: p.id, name: p.name, insurerName: ins.name }));
        });
        setPoliciesFlat(flat);
      })
      .catch(() => setPoliciesFlat([]))
      .finally(() => setLoading(false));
  }, []);

  const togglePolicy = (policyId: string) => {
    const next = policyIds.includes(policyId) ? policyIds.filter((id) => id !== policyId) : [...policyIds, policyId];
    setInsuranceOptions((prev) => ({ ...prev, policyIds: next }));
    onSavePolicyIds(next);
  };

  return (
    <div className="space-y-6">
      <FieldGroup title="Assurances plateforme">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
            <input
              type="radio"
              name="platformInsurance"
              checked={!usePlatformInsurance}
              onChange={async () => {
                await onSaveUsePlatform(false);
                setInsuranceOptions((prev) => ({ ...prev, usePlatformInsurance: false }));
              }}
              className="h-4 w-4"
            />
            <span className="font-medium">Ne pas utiliser notre assurance</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
            <input
              type="radio"
              name="platformInsurance"
              checked={usePlatformInsurance}
              onChange={async () => {
                await onSaveUsePlatform(true);
                setInsuranceOptions((prev) => ({ ...prev, usePlatformInsurance: true }));
              }}
              className="h-4 w-4"
            />
            <span className="font-medium">Utiliser nos assurances</span>
          </label>
        </div>
        {usePlatformInsurance && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Sélectionnez les polices proposées aux locataires :</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <ul className="space-y-2 rounded-lg border border-border p-3">
                {policiesFlat.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={policyIds.includes(p.id)}
                      onChange={() => togglePolicy(p.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">({p.insurerName})</span>
                  </li>
                ))}
                {policiesFlat.length === 0 && (
                  <li className="text-sm text-muted-foreground">Aucune police disponible. Créez-en dans Admin &gt; Assurances.</li>
                )}
              </ul>
            )}
          </div>
        )}
      </FieldGroup>
    </div>
  );
}

export default function AdminListingDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const tCreate = useTranslations('createListing');
  const id = String(params.id);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('location');
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [vehicleListings, setVehicleListings] = useState<Array<{ id: string; type: string; status: string }>>([]);

  // Vehicle data
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Current states (saved values)
  const [locationPickup, setLocationPickup] = useState<LocationPickupData>({
    address: '',
    city: '',
    country: '',
    pickupMethod: 'handover',
    returnMethod: 'same',
    deliveryAvailable: false,
    deliveryRadiusKm: 50,
    deliveryPricePerKm: 0,
    keyboxCode: '',
    hourlyDeliveryAvailable: false,
    deliveryPricePerHour: null,
  });
  // New pricing state with percentage-based discounts
  const [pricing, setPricing] = useState<NewPricingData>({
    pricePerDay: 0,
    caution: null,
    description: '',
    discount3Days: { enabled: false, percentage: null },
    discount7Days: { enabled: false, percentage: null },
    discount30Days: { enabled: false, percentage: null },
    youngDriverFee: null,
  });
  const [availabilityBookingRules, setAvailabilityBookingRules] = useState<AvailabilityBookingRulesData>({
    bufferHours: 2,
    autoUnavailableAfterDays: null,
    rejectIsolatedGaps: false,
    allowedTimeSlots: [{ start: '00:00', end: '23:59' }],
    forbiddenDepartureDays: [],
    minBookingNoticeHours: 24,
    maxBookingAdvanceDays: 180,
    allowLastMinute: true,
    minRentalDurationHours: 24,
    maxRentalDurationDays: 30,
    instantBooking: true,
    manualApprovalRequired: false,
    manualApprovalAfterDays: null,
  });
  const [rulesConditions, setRulesConditions] = useState<RulesConditionsData>({
    smokingAllowed: false,
    petsAllowed: false,
    musicAllowed: true,
    tollsIncluded: false,
    fuelPolicy: 'full_to_full',
    maxMileagePerDay: null,
    excessMileagePricePerKm: null,
    minDriverAge: 21,
    minLicenseYears: 1,
    requireInternationalLicense: false,
    allowedCountries: [],
    forbiddenZones: [],
    returnFuelLevel: 'full',
    returnCleaningRequired: false,
    returnChecklist: [],
  });
  const [secondDriver, setSecondDriver] = useState<{ available: boolean; price: number }>({ available: false, price: 0 });
  const [insuranceOptions, setInsuranceOptions] = useState<{ usePlatformInsurance: boolean; policyIds: string[] }>({
    usePlatformInsurance: false,
    policyIds: [],
  });

  // Parse options JSONB and initialize states
  const initializeStatesFromListing = useCallback((data: ListingDetail) => {
    const opts = (data.options || {}) as ListingOptions;

    const rawMethod = opts.pickup?.method;
    const pickupMethod = rawMethod === 'keybox' ? 'keybox' : 'handover';
    const locationData: LocationPickupData = {
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      pickupMethod,
      returnMethod: opts.pickup?.returnMethod || 'same',
      returnAddress: opts.pickup?.returnAddress,
      returnCity: opts.pickup?.returnCity,
      returnCountry: opts.pickup?.returnCountry,
      deliveryAvailable: opts.delivery?.available || false,
      deliveryRadiusKm: opts.delivery?.radiusKm || 50,
      deliveryPricePerKm: opts.delivery?.pricePerKm ?? opts.delivery?.price ?? 0,
      keyboxCode: opts.pickup?.keyboxCode || '',
      hourlyDeliveryAvailable: opts.delivery?.hourlyDeliveryAvailable ?? false,
      deliveryPricePerHour: opts.delivery?.deliveryPricePerHour ?? null,
      returnMaxDistanceKm: opts.pickup?.returnMaxDistanceKm,
      returnPricePerKm: opts.pickup?.returnPricePerKm,
    };
    setLocationPickup(locationData);

    // Migrate from old pricing structure to new one
    const basePrice = typeof data.pricePerDay === 'number' ? data.pricePerDay : parseFloat(String(data.pricePerDay || 0));
    const oldDiscount3 = opts.pricing?.durationDiscount3Days ?? null;
    const oldDiscount7 = opts.pricing?.durationDiscount7Days ?? null;
    
    const pricingData: NewPricingData = {
      pricePerDay: basePrice,
      caution: typeof data.caution === 'number' ? data.caution : (data.caution ? parseFloat(String(data.caution)) : null),
      description: data.description || '',
      discount3Days: {
        enabled: oldDiscount3 !== null && oldDiscount3 > 0,
        percentage: oldDiscount3,
      },
      discount7Days: {
        enabled: oldDiscount7 !== null && oldDiscount7 > 0,
        percentage: oldDiscount7,
      },
      discount30Days: {
        enabled: false,
        percentage: null,
      },
      youngDriverFee: opts.pricing?.youngDriverFee ?? null,
    };
    setPricing(pricingData);

    const availabilityData: AvailabilityBookingRulesData = {
      bufferHours: opts.availability?.bufferHours || 2,
      autoUnavailableAfterDays: opts.availability?.autoUnavailableAfterDays ?? null,
      rejectIsolatedGaps: opts.availability?.rejectIsolatedGaps || false,
      allowedTimeSlots: opts.availability?.allowedTimeSlots || [{ start: '00:00', end: '23:59' }],
      forbiddenDepartureDays: opts.availability?.forbiddenDepartureDays || [],
      minBookingNoticeHours: data.minBookingNoticeHours || 24,
      maxBookingAdvanceDays: data.maxBookingAdvanceDays || 180,
      allowLastMinute: true,
      minRentalDurationHours: data.minRentalDurationHours || 24,
      maxRentalDurationDays: data.maxRentalDurationDays || 30,
      instantBooking: data.instantBooking ?? true,
      manualApprovalRequired: data.manualApprovalRequired || false,
      manualApprovalAfterDays: null,
    };
    setAvailabilityBookingRules(availabilityData);

    const rulesData: RulesConditionsData = {
      smokingAllowed: opts.usageConditions?.smokingAllowed || false,
      petsAllowed: opts.usageConditions?.petsAllowed || false,
      musicAllowed: opts.usageConditions?.musicAllowed ?? true,
      tollsIncluded: opts.usageConditions?.tollsIncluded || false,
      fuelPolicy: opts.usageConditions?.fuelPolicy || 'full_to_full',
      maxMileagePerDay: opts.usageConditions?.maxMileagePerDay ?? null,
      excessMileagePricePerKm: opts.usageConditions?.excessMileagePricePerKm ?? null,
      minDriverAge: data.minDriverAge || 21,
      minLicenseYears: data.minLicenseYears || 1,
      requireInternationalLicense: opts.usageConditions?.requireInternationalLicense || false,
      allowedCountries: [],
      forbiddenZones: [],
      returnFuelLevel: opts.returnRules?.returnFuelLevel || 'full',
      returnCleaningRequired: opts.returnRules?.returnCleaningRequired || false,
      returnChecklist: opts.returnRules?.returnChecklist || [],
    };
    setRulesConditions(rulesData);
    setSecondDriver({
      available: opts.secondDriver?.available ?? false,
      price: opts.secondDriver?.price ?? 0,
    });
    setInsuranceOptions({
      usePlatformInsurance: opts.insurance?.usePlatformInsurance ?? false,
      policyIds: Array.isArray(opts.insurance?.policyIds) ? opts.insurance.policyIds : [],
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/listings/${id}`)
      .then((res) => {
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          setListing(data);
          initializeStatesFromListing(data);
          setVehicleListings([{ id: data.id, type: data.type, status: data.status }]);
        }
        setLoading(false);
      })
      .catch(() => {
        setListing(null);
        setLoading(false);
      });
  }, [id, initializeStatesFromListing]);

  // Load makes and models for vehicle editing
  useEffect(() => {
    fetch(API_URL + '/vehicles/makes')
      .then((r) => r.json())
      .then((d: { items?: Make[] }) => {
        if (d?.items) setMakes(d.items);
      })
      .catch(() => setMakes([]));
  }, []);

  useEffect(() => {
    fetch(API_URL + '/geo/countries')
      .then((r) => r.json())
      .then((data: Country[] | { items?: Country[] }) => {
        const items = Array.isArray(data) ? data : (data as { items?: Country[] }).items;
        if (items) setCountries(items);
      })
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (listing?.vehicle?.make?.name) {
      const make = makes.find((m) => m.name === listing.vehicle?.make.name);
      if (make) {
        fetch(API_URL + `/vehicles/makes/${make.id}/models`)
          .then((r) => r.json())
          .then((d: { items?: Model[] }) => {
            if (d?.items) setModels(d.items);
          })
          .catch(() => setModels([]));
      }
    }
  }, [listing, makes]);

  // Load categories for the listing type
  useEffect(() => {
    if (listing?.type) {
      apiFetch(`/admin/categories?vertical=${listing.type}`)
        .then((res) => res.json())
        .then((data: Category[]) => {
          setCategories(data);
        })
        .catch(() => setCategories([]));
    }
  }, [listing?.type]);

  // Build options JSONB for saving
  const buildOptionsForField = useCallback((
    fieldKey: string,
    value: any,
  ): Partial<ListingOptions> => {
    const existingOptions = (listing?.options || {}) as ListingOptions;
    const newOptions = { ...existingOptions };

    // Location fields
    if (fieldKey.startsWith('location.')) {
      const field = fieldKey.replace('location.', '');
      if (!newOptions.pickup) newOptions.pickup = {};
      if (!newOptions.delivery) newOptions.delivery = {};
      
      if (field === 'address' || field === 'city' || field === 'country') {
        // These are stored directly on listing, not in options
        return newOptions;
      }
      if (field === 'pickupMethod') {
        newOptions.pickup.method = value;
      } else if (field === 'keyboxCode') {
        newOptions.pickup.keyboxCode = value;
      } else if (field === 'returnMethod') {
        newOptions.pickup.returnMethod = value;
      } else if (field === 'returnAddress') {
        newOptions.pickup.returnAddress = value;
      } else if (field === 'returnCity') {
        newOptions.pickup.returnCity = value;
      } else if (field === 'returnCountry') {
        newOptions.pickup.returnCountry = value;
      } else if (field === 'deliveryAvailable') {
        newOptions.delivery.available = value;
      } else if (field === 'deliveryRadiusKm') {
        newOptions.delivery.radiusKm = value;
      } else if (field === 'deliveryPrice' || field === 'deliveryPricePerKm') {
        newOptions.delivery.pricePerKm = value;
      } else if (field === 'hourlyDeliveryAvailable') {
        newOptions.delivery.hourlyDeliveryAvailable = value;
      } else if (field === 'deliveryPricePerHour') {
        newOptions.delivery.deliveryPricePerHour = value;
      } else if (field === 'returnMaxDistanceKm') {
        if (!newOptions.pickup) newOptions.pickup = {};
        newOptions.pickup.returnMaxDistanceKm = value;
      } else if (field === 'returnPricePerKm') {
        if (!newOptions.pickup) newOptions.pickup = {};
        newOptions.pickup.returnPricePerKm = value;
      }
    }

    // Pricing fields - new structure with percentage discounts
    if (fieldKey.startsWith('pricing.')) {
      const field = fieldKey.replace('pricing.', '');
      if (!newOptions.pricing) newOptions.pricing = {};
      
      if (field === 'pricePerDay' || field === 'caution' || field === 'description') {
        // These are stored directly on listing
        return newOptions;
      }
      // New discount structure
      if (field === 'discount3Days.enabled') {
        newOptions.pricing.durationDiscount3Days = value ? (newOptions.pricing.durationDiscount3Days || 0) : null;
      } else if (field === 'discount3Days.percentage') {
        newOptions.pricing.durationDiscount3Days = value;
      } else if (field === 'discount7Days.enabled') {
        newOptions.pricing.durationDiscount7Days = value ? (newOptions.pricing.durationDiscount7Days || 0) : null;
      } else if (field === 'discount7Days.percentage') {
        newOptions.pricing.durationDiscount7Days = value;
      } else if (field === 'discount30Days.enabled') {
        // New field - store in a new key or reuse existing structure
        if (!value) {
          // Remove if disabled
          delete (newOptions.pricing as any).durationDiscount30Days;
        }
      } else if (field === 'discount30Days.percentage') {
        (newOptions.pricing as any).durationDiscount30Days = value;
      } else if (field === 'youngDriverFee') {
        newOptions.pricing.youngDriverFee = value;
      }
      // Legacy fields - keep for backward compatibility but don't use in UI
      else if (field === 'priceWeekend' || field === 'priceWeek' || field === 'priceMonth' || 
               field === 'hourlyAllowed' || field === 'pricePerHour' ||
               field === 'chauffeurDaily' || field === 'chauffeurPromo3Days' || 
               field === 'chauffeurPromo7Days' || field === 'chauffeurPromo30Days') {
        // Keep for backward compatibility but deprecated
        (newOptions.pricing as any)[field] = value;
      }
    }

    // Availability fields
    if (fieldKey.startsWith('availability.')) {
      const field = fieldKey.replace('availability.', '');
      if (!newOptions.availability) newOptions.availability = {};
      
      if (field === 'bufferHours') newOptions.availability.bufferHours = value;
      else if (field === 'autoUnavailableAfterDays') newOptions.availability.autoUnavailableAfterDays = value;
      else if (field === 'rejectIsolatedGaps') newOptions.availability.rejectIsolatedGaps = value;
      else if (field === 'allowedTimeSlots') newOptions.availability.allowedTimeSlots = value;
      else if (field === 'forbiddenDepartureDays') newOptions.availability.forbiddenDepartureDays = value;
      // minBookingNoticeHours, maxBookingAdvanceDays, instantBooking, manualApprovalRequired, minRentalDurationHours, maxRentalDurationDays are stored directly on listing
    }

    // Rules fields
    if (fieldKey.startsWith('rules.')) {
      const field = fieldKey.replace('rules.', '');
      if (!newOptions.usageConditions) newOptions.usageConditions = {};
      if (!newOptions.returnRules) newOptions.returnRules = {};
      
      if (field === 'smokingAllowed') newOptions.usageConditions.smokingAllowed = value;
      else if (field === 'petsAllowed') newOptions.usageConditions.petsAllowed = value;
      else if (field === 'musicAllowed') newOptions.usageConditions.musicAllowed = value;
      else if (field === 'tollsIncluded') newOptions.usageConditions.tollsIncluded = value;
      else if (field === 'fuelPolicy') newOptions.usageConditions.fuelPolicy = value;
      else if (field === 'maxMileagePerDay') newOptions.usageConditions.maxMileagePerDay = value;
      else if (field === 'excessMileagePricePerKm') newOptions.usageConditions.excessMileagePricePerKm = value;
      else if (field === 'returnFuelLevel') newOptions.returnRules.returnFuelLevel = value;
      else if (field === 'returnCleaningRequired') newOptions.returnRules.returnCleaningRequired = value;
      // minDriverAge, minLicenseYears are stored directly on listing
    }

    if (fieldKey === 'secondDriver.available' || fieldKey === 'secondDriver.price') {
      const existing = (listing?.options || {}) as ListingOptions;
      newOptions.secondDriver = {
        ...existing.secondDriver,
        ...(fieldKey === 'secondDriver.available' ? { available: value } : { price: value }),
      };
    }

    if (fieldKey === 'insurance.usePlatformInsurance' || fieldKey === 'insurance.policyIds') {
      const existing = (listing?.options || {}) as ListingOptions;
      newOptions.insurance = {
        ...existing.insurance,
        ...(fieldKey === 'insurance.usePlatformInsurance' ? { usePlatformInsurance: value } : { policyIds: value }),
      };
    }

    return newOptions;
  }, [listing]);

  // Save individual field
  const handleSaveField = useCallback(async (fieldKey: string, value: any, additionalData?: { city?: string; country?: string; latitude?: number; longitude?: number }) => {
    if (!listing) return;

    const existingOptions = (listing.options || {}) as ListingOptions;
    const newOptions = buildOptionsForField(fieldKey, value);
    const mergedOptions = { ...existingOptions, ...newOptions };

    const body: Record<string, any> = { options: mergedOptions };

    // Handle fields stored directly on listing
    if (fieldKey === 'location.address') {
      body.address = value;
      if (additionalData?.city) body.city = additionalData.city;
      if (additionalData?.country) body.country = additionalData.country;
      if (additionalData?.latitude !== undefined) body.latitude = additionalData.latitude;
      if (additionalData?.longitude !== undefined) body.longitude = additionalData.longitude;
      setLocationPickup((prev) => ({
        ...prev,
        address: value,
        city: additionalData?.city || prev.city,
        country: additionalData?.country || prev.country,
        latitude: additionalData?.latitude !== undefined ? additionalData.latitude : prev.latitude,
        longitude: additionalData?.longitude !== undefined ? additionalData.longitude : prev.longitude,
      }));
    } else if (fieldKey === 'location.city') {
      body.city = value;
      setLocationPickup((prev) => ({ ...prev, city: value }));
    } else if (fieldKey === 'location.country') {
      body.country = value;
      setLocationPickup((prev) => ({ ...prev, country: value }));
    } else if (fieldKey === 'location.pickupMethod') {
      setLocationPickup((prev) => ({ ...prev, pickupMethod: value }));
      // Include keyboxCode when saving pickup method
      if (!mergedOptions.pickup) mergedOptions.pickup = {};
      mergedOptions.pickup.keyboxCode = locationPickup.keyboxCode || undefined;
      body.options = mergedOptions;
    } else if (fieldKey === 'location.keyboxCode') {
      setLocationPickup((prev) => ({ ...prev, keyboxCode: value }));
    } else if (fieldKey === 'location.returnMethod') {
      setLocationPickup((prev) => ({ ...prev, returnMethod: value }));
    } else if (fieldKey === 'location.returnAddress') {
      setLocationPickup((prev) => ({ ...prev, returnAddress: value }));
    } else if (fieldKey === 'location.deliveryAvailable') {
      setLocationPickup((prev) => ({ ...prev, deliveryAvailable: value }));
    } else if (fieldKey === 'location.deliveryRadiusKm') {
      setLocationPickup((prev) => ({ ...prev, deliveryRadiusKm: value }));
    } else if (fieldKey === 'location.deliveryPrice' || fieldKey === 'location.deliveryPricePerKm') {
      setLocationPickup((prev) => ({ ...prev, deliveryPricePerKm: value }));
    } else if (fieldKey === 'location.hourlyDeliveryAvailable') {
      setLocationPickup((prev) => ({ ...prev, hourlyDeliveryAvailable: value }));
    } else if (fieldKey === 'location.deliveryPricePerHour') {
      setLocationPickup((prev) => ({ ...prev, deliveryPricePerHour: value }));
    } else if (fieldKey === 'location.returnMaxDistanceKm') {
      setLocationPickup((prev) => ({ ...prev, returnMaxDistanceKm: value }));
    } else if (fieldKey === 'location.returnPricePerKm') {
      setLocationPickup((prev) => ({ ...prev, returnPricePerKm: value }));
    } else if (fieldKey === 'pricing.pricePerDay') {
      body.pricePerDay = value;
      setPricing((prev) => ({ ...prev, pricePerDay: value }));
    } else if (fieldKey === 'pricing.caution') {
      body.caution = value;
      setPricing((prev) => ({ ...prev, caution: value }));
    } else if (fieldKey === 'pricing.description') {
      body.description = value;
      setPricing((prev) => ({ ...prev, description: value }));
    } else if (fieldKey === 'pricing.discount3Days.enabled') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const currentPercentage = existingOptions.pricing?.durationDiscount3Days ?? null;
      if (!value && currentPercentage) {
        // Disable - set to null
        const newOptions = { ...existingOptions };
        if (!newOptions.pricing) newOptions.pricing = {};
        newOptions.pricing.durationDiscount3Days = null;
        body.options = newOptions;
      }
      setPricing((prev) => ({ ...prev, discount3Days: { ...prev.discount3Days, enabled: value } }));
    } else if (fieldKey === 'pricing.discount3Days.percentage') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const newOptions = { ...existingOptions };
      if (!newOptions.pricing) newOptions.pricing = {};
      newOptions.pricing.durationDiscount3Days = value;
      body.options = newOptions;
      setPricing((prev) => ({ ...prev, discount3Days: { ...prev.discount3Days, percentage: value } }));
    } else if (fieldKey === 'pricing.discount7Days.enabled') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const currentPercentage = existingOptions.pricing?.durationDiscount7Days ?? null;
      if (!value && currentPercentage) {
        const newOptions = { ...existingOptions };
        if (!newOptions.pricing) newOptions.pricing = {};
        newOptions.pricing.durationDiscount7Days = null;
        body.options = newOptions;
      }
      setPricing((prev) => ({ ...prev, discount7Days: { ...prev.discount7Days, enabled: value } }));
    } else if (fieldKey === 'pricing.discount7Days.percentage') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const newOptions = { ...existingOptions };
      if (!newOptions.pricing) newOptions.pricing = {};
      newOptions.pricing.durationDiscount7Days = value;
      body.options = newOptions;
      setPricing((prev) => ({ ...prev, discount7Days: { ...prev.discount7Days, percentage: value } }));
    } else if (fieldKey === 'pricing.discount30Days.enabled') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      if (!value) {
        const newOptions = { ...existingOptions };
        if (!newOptions.pricing) newOptions.pricing = {};
        delete (newOptions.pricing as any).durationDiscount30Days;
        body.options = newOptions;
      }
      setPricing((prev) => ({ ...prev, discount30Days: { ...prev.discount30Days, enabled: value } }));
    } else if (fieldKey === 'pricing.discount30Days.percentage') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const newOptions = { ...existingOptions };
      if (!newOptions.pricing) newOptions.pricing = {};
      (newOptions.pricing as any).durationDiscount30Days = value;
      body.options = newOptions;
      setPricing((prev) => ({ ...prev, discount30Days: { ...prev.discount30Days, percentage: value } }));
    } else if (fieldKey === 'pricing.youngDriverFee') {
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const newOptions = { ...existingOptions };
      if (!newOptions.pricing) newOptions.pricing = {};
      newOptions.pricing.youngDriverFee = value;
      body.options = newOptions;
      setPricing((prev) => ({ ...prev, youngDriverFee: value }));
    } else if (fieldKey === 'secondDriver.available') {
      setSecondDriver((prev) => ({ ...prev, available: value }));
    } else if (fieldKey === 'secondDriver.price') {
      setSecondDriver((prev) => ({ ...prev, price: value }));
    } else if (fieldKey === 'insurance.usePlatformInsurance') {
      setInsuranceOptions((prev) => ({ ...prev, usePlatformInsurance: value }));
    } else if (fieldKey === 'insurance.policyIds') {
      setInsuranceOptions((prev) => ({ ...prev, policyIds: value }));
    } else if (fieldKey.startsWith('pricing.')) {
      // Legacy fields - handle for backward compatibility
      const field = fieldKey.replace('pricing.', '');
      const existingOptions = (listing?.options || {}) as ListingOptions;
      const newOptions = { ...existingOptions };
      if (!newOptions.pricing) newOptions.pricing = {};
      (newOptions.pricing as any)[field] = value;
      body.options = newOptions;
    } else if (fieldKey === 'availability.minBookingNoticeHours') {
      body.minBookingNoticeHours = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, minBookingNoticeHours: value }));
    } else if (fieldKey === 'availability.maxBookingAdvanceDays') {
      body.maxBookingAdvanceDays = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, maxBookingAdvanceDays: value }));
    } else if (fieldKey === 'availability.instantBooking') {
      body.instantBooking = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, instantBooking: value }));
    } else if (fieldKey === 'availability.manualApprovalRequired') {
      body.manualApprovalRequired = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, manualApprovalRequired: value }));
    } else if (fieldKey === 'availability.minRentalDurationHours') {
      body.minRentalDurationHours = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, minRentalDurationHours: value }));
    } else if (fieldKey === 'availability.maxRentalDurationDays') {
      body.maxRentalDurationDays = value;
      setAvailabilityBookingRules((prev) => ({ ...prev, maxRentalDurationDays: value }));
    } else if (fieldKey.startsWith('availability.')) {
      const field = fieldKey.replace('availability.', '');
      setAvailabilityBookingRules((prev) => ({ ...prev, [field]: value }));
    } else if (fieldKey === 'rules.minDriverAge') {
      body.minDriverAge = value;
      setRulesConditions((prev) => ({ ...prev, minDriverAge: value }));
    } else if (fieldKey === 'rules.minLicenseYears') {
      body.minLicenseYears = value;
      setRulesConditions((prev) => ({ ...prev, minLicenseYears: value }));
    } else if (fieldKey.startsWith('rules.')) {
      const field = fieldKey.replace('rules.', '');
      setRulesConditions((prev) => ({ ...prev, [field]: value }));
    } else if (fieldKey === 'categoryIds') {
      body.categoryIds = value;
    }

    const res = await apiFetch(`/admin/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save');
    }

    const updated = await res.json();
    setListing((prev) => (prev ? { ...prev, ...updated } : null));
  }, [listing, id, buildOptionsForField, locationPickup.keyboxCode]);

  const handleSaveVehicleField = useCallback(async (field: string, value: string | number | null) => {
    if (!listing?.vehicleId) return;
    const normalized = (value === '' || value === undefined) ? null : value;
    const body: Record<string, string | number | null> = { [field]: normalized };
    const res = await apiFetch(`/admin/listings/${id}/vehicle`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save');
    }
    const updated = await res.json();
    setListing((prev) =>
      prev?.vehicle
        ? {
            ...prev,
            vehicle: { ...prev.vehicle, ...updated },
          }
        : prev
    );
  }, [listing?.vehicleId, id]);

  // Check if listing can be activated
  const canActivateListing = useCallback(() => {
    if (!listing) return false;
    
    // Check critical fields
    const hasPrice = pricing.pricePerDay > 0;
    const hasPhotos = listing.photos && listing.photos.length >= 3;
    const hasAddress = !!(listing.address && listing.city && listing.country);
    const hasVehicle = !!(listing.vehicleId && listing.vehicle);
    
    // For availability, we'll check if there's at least one available date
    // This is a simplified check - in production you might want to fetch actual availability
    const hasAvailability = true; // TODO: Fetch actual availability from API
    
    return hasPrice && hasPhotos && hasAddress && hasVehicle && hasAvailability;
  }, [listing, pricing]);

  // Get completion checks for indicator
  const getCompletionChecks = useCallback(() => {
    if (!listing) return [];
    
    return [
      {
        id: 'price',
        label: 'Tarif journalier défini',
        completed: pricing.pricePerDay > 0,
      },
      {
        id: 'photos',
        label: 'Minimum 3 photos uploadées',
        completed: !!(listing.photos && listing.photos.length >= 3),
      },
      {
        id: 'address',
        label: 'Adresse complète (adresse, ville, pays)',
        completed: !!(listing.address && listing.city && listing.country),
      },
      {
        id: 'vehicle',
        label: 'Véhicule associé',
        completed: !!(listing.vehicleId && listing.vehicle),
      },
      {
        id: 'availability',
        label: 'Au moins une disponibilité dans le calendrier',
        completed: true, // TODO: Check actual availability
      },
    ];
  }, [listing, pricing]);

  // Delete photo
  const handleDeletePhoto = useCallback(async (photoId: string) => {
    if (!listing) return;
    setDeletingPhotoId(photoId);
    try {
      const res = await apiFetch(`/admin/listings/${id}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete photo');
      }

      // Reload listing to get updated photos
      const updatedRes = await apiFetch(`/admin/listings/${id}`);
      if (updatedRes.ok) {
        const updated = await updatedRes.json();
        setListing(updated);
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setDeletingPhotoId(null);
    }
  }, [listing, id]);

  // Reload photos after adding
  const handlePhotosAdded = useCallback(() => {
    apiFetch(`/admin/listings/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setListing(data);
      });
  }, [id]);

  if (loading) return <p className="text-muted-foreground">{t('loading')}</p>;
  if (!listing) {
    return (
      <div>
        <p className="text-muted-foreground">{t('listingNotFound')}</p>
        <Link href={`/${locale}/admin/listings`} className="mt-4 inline-block text-primary underline">
          ← Back to Listings
        </Link>
      </div>
    );
  }

  const publicBase = publicListingPath(listing.type);
  const publicUrl = `/${locale}${publicBase}/${listing.slug}`;

  // Handle status toggle - admins can set any status
  const handleStatusToggle = async () => {
    if (!listing) return;
    
    // For admin, allow all statuses
    const newStatus = listing.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    
    try {
      const res = await apiFetch(`/admin/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setListing((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const listingTitle = listing.displayTitle ?? listing.displayName ?? listing.title ?? '—';
  
  // Calculate completion percentage
  const completionChecks = getCompletionChecks();
  const completedCount = completionChecks.filter((c) => c.completed).length;
  const totalCount = completionChecks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <Link href={`/${locale}/admin/listings`} className="mb-4 inline-block text-sm text-primary hover:underline">
            ← Back to Listings
          </Link>
          <h2 className="mt-4 text-xl font-bold text-black">Modifier l&apos;annonce</h2>
          <nav className="mt-4 space-y-0.5" aria-label="Navigation de l&apos;annonce">
            {[
              { id: 'vehicle' as Tab, label: 'Véhicule', show: !!listing.vehicleId },
              { id: 'location' as Tab, label: 'Localisation & remise', show: true },
              { id: 'pricing' as Tab, label: 'Tarifs', show: true },
              { id: 'insurance' as Tab, label: 'Assurances', show: true },
              { id: 'rules' as Tab, label: 'Conditions & règles', show: true },
              { id: 'availability' as Tab, label: 'Disponibilités', show: true },
              { id: 'photos' as Tab, label: 'Photos', show: true },
            ]
              .filter((tab) => tab.show)
              .map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-neutral-100 text-black'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Status Bar */}
          <div className="mb-4 lg:hidden">
            <Link href={`/${locale}/admin/listings`} className="mb-4 inline-block text-sm text-primary hover:underline">
              ← Back to Listings
            </Link>
          </div>
          <ListingStatusBar
            listing={listing}
            listingTitle={listingTitle}
            publicUrl={publicUrl}
            completionPercentage={completionPercentage}
            completionChecks={completionChecks}
            canActivate={canActivateListing()}
            onToggleStatus={handleStatusToggle}
            onShowDisableConfirm={() => setShowDisableConfirm(true)}
          />

        {/* Confirmation Dialog */}
        <ConfirmDisableDialog
          isOpen={showDisableConfirm}
          onClose={() => setShowDisableConfirm(false)}
          onConfirm={handleStatusToggle}
          listingTitle={listingTitle}
        />

          {/* Mobile: Tabs */}
          <div className="lg:hidden mt-4">
            <ListingEditTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              hasVehicle={!!listing.vehicleId}
            />
          </div>

          {/* Tab Content */}
          <div className="mt-6">
          {activeTab === 'vehicle' && listing.vehicleId && listing.vehicle && (
            <div className="space-y-6">
              {/* Groupe 1 — Identité du véhicule */}
              <FieldGroup
                title="Identité du véhicule"
                description="Marque, modèle et année du véhicule"
              >
                <EditableListingField
                  label={tCreate('make') || 'Marque'}
                  value={makes.find((m) => m.name === listing.vehicle.make.name)?.id || ''}
                  fieldKey="vehicle.make"
                  fieldType="vehicleMake"
                  onSave={async () => {}}
                  disabled
                />
                <EditableListingField
                  label={tCreate('model') || 'Modèle'}
                  value={models.find((m) => m.name === listing.vehicle.model.name)?.id || ''}
                  fieldKey="vehicle.model"
                  fieldType="vehicleModel"
                  onSave={async () => {}}
                  makeId={makes.find((m) => m.name === listing.vehicle.make.name)?.id}
                  disabled
                />
                <EditableListingField
                  label={tCreate('year') || 'Année'}
                  value={listing.vehicle.modelYear}
                  fieldKey="vehicle.year"
                  fieldType="number"
                  onSave={async () => {}}
                  disabled
                />
              </FieldGroup>

              {/* Groupe 2 — Caractéristiques techniques */}
              {(listing.vehicle.transmissionType || listing.vehicle.fuelType || listing.vehicle.driveType) && (
                <FieldGroup
                  title="Caractéristiques techniques"
                  description="Boîte de vitesse, motorisation et transmission"
                >
                  {listing.vehicle.transmissionType && (
                    <EditableListingField
                      label="Boîte de vitesse"
                      value={formatTransmissionType(listing.vehicle.transmissionType)}
                      fieldKey="vehicle.transmissionType"
                      fieldType="text"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                  {listing.vehicle.fuelType && (
                    <EditableListingField
                      label="Motorisation"
                      value={formatFuelType(listing.vehicle.fuelType)}
                      fieldKey="vehicle.fuelType"
                      fieldType="text"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                  {listing.vehicle.driveType && (
                    <EditableListingField
                      label="Transmission"
                      value={formatDriveType(listing.vehicle.driveType)}
                      fieldKey="vehicle.driveType"
                      fieldType="text"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                </FieldGroup>
              )}

              {/* Groupe 2b — Spécificités */}
              <FieldGroup
                title="Spécificités"
                description="Puissance, vitesse maximale et accélération"
              >
                {listing.vehicle?.fuelType === 'electric' ? (
                  <EditableListingField
                    label={tCreate('powerKwh') || 'Puissance (KWh)'}
                    value={listing.vehicle?.batteryKwh ?? listing.vehicle?.powerKw ?? ''}
                    fieldKey="vehicle.batteryKwh"
                    fieldType="number"
                    onSave={(value) => handleSaveVehicleField('batteryKwh', value as number)}
                  />
                ) : (
                  <EditableListingField
                    label={tCreate('powerCv') || 'Puissance (CV)'}
                    value={listing.vehicle?.powerCv ?? (listing.vehicle?.powerKw ? Math.round(Number(listing.vehicle.powerKw) * 1.36) : '')}
                    fieldKey="vehicle.powerCv"
                    fieldType="number"
                    onSave={(value) => handleSaveVehicleField('powerCv', value as number)}
                  />
                )}
                <EditableListingField
                  label={tCreate('topSpeed') || 'Vitesse maximum (km/h)'}
                    value={listing.vehicle?.topSpeedKmh ?? ''}
                  fieldKey="vehicle.topSpeedKmh"
                  fieldType="number"
                  onSave={(value) => handleSaveVehicleField('topSpeedKmh', value as number)}
                />
                <EditableListingField
                  label={tCreate('zeroTo100') || 'Accélération 0 à 100 (s)'}
                    value={listing.vehicle?.zeroTo100S ?? ''}
                  fieldKey="vehicle.zeroTo100S"
                  fieldType="number"
                  onSave={(value) => handleSaveVehicleField('zeroTo100S', value as number)}
                />
              </FieldGroup>

              {/* Groupe 3 — Capacités */}
              {(listing.seats || listing.doors || listing.luggage) && (
                <FieldGroup
                  title="Capacités"
                  description="Nombre de passagers, portes et bagages"
                >
                  {listing.seats && (
                    <EditableListingField
                      label={tCreate('seats') || 'Passagers'}
                      value={listing.seats}
                      fieldKey="vehicle.seats"
                      fieldType="number"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                  {listing.doors && (
                    <EditableListingField
                      label={tCreate('doors') || 'Portes'}
                      value={listing.doors}
                      fieldKey="vehicle.doors"
                      fieldType="number"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                  {listing.luggage && (
                    <EditableListingField
                      label={tCreate('luggage') || 'Bagages'}
                      value={listing.luggage}
                      fieldKey="vehicle.luggage"
                      fieldType="number"
                      onSave={async () => {}}
                      disabled
                    />
                  )}
                </FieldGroup>
              )}

              {/* Groupe 4 — Information administrative */}
              <FieldGroup
                title="Information administrative"
                description="Pays d'immatriculation, plaque et propriétaire"
              >
                <EditableListingField
                  label={tCreate('registrationCountry') || "Pays d'immatriculation"}
                  value={listing.vehicle.registrationCountry ?? ''}
                  fieldKey="vehicle.registrationCountry"
                  fieldType="select"
                  options={[
                    { value: '', label: tCreate('selectOption') || 'Sélectionner...' },
                    ...countries.map((c) => ({ value: c.code, label: (c.name as Record<string, string>)?.[locale] || c.code })),
                  ]}
                  onSave={(value) => handleSaveVehicleField('registrationCountry', value as string)}
                />
                <EditableListingField
                  label={tCreate('licensePlate') || "Plaque d'immatriculation"}
                  value={listing.vehicle.licensePlate ?? ''}
                  fieldKey="vehicle.licensePlate"
                  fieldType="text"
                  onSave={(value) => handleSaveVehicleField('licensePlate', value as string)}
                />
                <EditableListingField
                  label={tCreate('fiscalPower') || 'Puissance fiscale'}
                  value={listing.vehicle.fiscalPower ?? ''}
                  fieldKey="vehicle.fiscalPower"
                  fieldType="number"
                  onSave={(value) => handleSaveVehicleField('fiscalPower', value as number)}
                />
                <EditableListingField
                  label={tCreate('ownerType') || 'Propriétaire'}
                  value={listing.vehicle.ownerType ?? ''}
                  fieldKey="vehicle.ownerType"
                  fieldType="select"
                  options={[
                    { value: '', label: tCreate('selectOption') || 'Sélectionner...' },
                    { value: 'PARTICULAR', label: tCreate('ownerParticular') || 'Particulier' },
                    { value: 'PROFESSIONAL', label: tCreate('ownerProfessional') || 'Professionnel' },
                  ]}
                  onSave={(value) => handleSaveVehicleField('ownerType', value as string)}
                />
              </FieldGroup>

              {/* Groupe 5 — Catégories (admin uniquement) */}
              <FieldGroup
                title="Catégories"
                description="Sélectionnez une ou plusieurs catégories pour ce véhicule. Les catégories aident les utilisateurs à trouver le véhicule qui correspond à leurs besoins."
              >
                <CategorySelector
                  categories={categories}
                  selectedCategoryIds={listing.categories?.map((lc) => lc.category.id) ?? []}
                  onSelectionChange={async (categoryIds) => {
                    await handleSaveField('categoryIds', categoryIds);
                  }}
                />
              </FieldGroup>

              {listing.vehicle.trimLabel && (
                <FieldGroup
                  title="Finitions"
                  description="Version et finitions du véhicule"
                >
                  <EditableListingField
                    label={tCreate('trim') || 'Finitions'}
                    value={listing.vehicle.trimLabel}
                    fieldKey="vehicle.trim"
                    fieldType="text"
                    onSave={async () => {}}
                    disabled
                  />
                </FieldGroup>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              {/* Groupe 1 — Adresse principale */}
              <FieldGroup
                title="Adresse principale"
                description="Où le véhicule est-il disponible pour la remise ?"
              >
                <EditableListingField
                  label={tCreate('address') || 'Adresse'}
                  value={locationPickup.address}
                  fieldKey="location.address"
                  fieldType="address"
                  onSave={(value) => handleSaveField('location.address', value)}
                  onAddressSelect={async (suggestion) => {
                    await handleSaveField('location.address', suggestion.address, {
                      city: suggestion.city,
                      country: suggestion.country,
                      latitude: suggestion.latitude,
                      longitude: suggestion.longitude,
                    });
                  }}
                />
                {locationPickup.latitude != null && locationPickup.longitude != null && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-600 mb-2">Aperçu de la localisation — déplacez le marqueur pour mettre à jour l'adresse</p>
                    <AddressMapPicker
                      latitude={locationPickup.latitude}
                      longitude={locationPickup.longitude}
                      address={locationPickup.address}
                      onPositionChange={async (lat, lng, suggestion) => {
                        await handleSaveField('location.address', suggestion.address, {
                          city: suggestion.city,
                          country: suggestion.country,
                          latitude: lat,
                          longitude: lng,
                        });
                      }}
                      height={200}
                    />
                  </div>
                )}
              </FieldGroup>

              {/* Groupe 2 — Méthode de remise et retour */}
              <FieldGroup
                title="Méthode de remise et retour"
                description="Comment le client récupère-t-il et retourne-t-il le véhicule ?"
              >
                <EditableListingField
                  label={tCreate('pickupMethod') || 'Méthode de remise'}
                  value={locationPickup.pickupMethod}
                  fieldKey="location.pickupMethod"
                  fieldType="pickupMethod"
                  onSave={(value) => handleSaveField('location.pickupMethod', value)}
                  keyboxCode={locationPickup.keyboxCode}
                  onKeyboxCodeChange={(code) => setLocationPickup((prev) => ({ ...prev, keyboxCode: code }))}
                />
                <EditableListingField
                  label={tCreate('returnMethod') || 'Méthode de retour'}
                  value={locationPickup.returnMethod}
                  fieldKey="location.returnMethod"
                  fieldType="returnMethod"
                  onSave={(value) => handleSaveField('location.returnMethod', value)}
                  returnMethod={locationPickup.returnMethod}
                />
                {locationPickup.returnMethod === 'different' && (
                  <>
                    <EditableListingField
                      label={tCreate('returnAddress') || 'Adresse de retour'}
                      value={locationPickup.returnAddress || ''}
                      fieldKey="location.returnAddress"
                      fieldType="address"
                      onSave={(value) => handleSaveField('location.returnAddress', value)}
                      onAddressSelect={async (suggestion) => {
                        await handleSaveField('location.returnAddress', suggestion.address, {
                          city: suggestion.city,
                          country: suggestion.country,
                        });
                      }}
                    />
                    <EditableListingField
                      label={tCreate('returnMaxDistanceKm') || 'Distance max du lieu de retour (km)'}
                      value={locationPickup.returnMaxDistanceKm ?? 50}
                      fieldKey="location.returnMaxDistanceKm"
                      fieldType="number"
                      onSave={(value) => handleSaveField('location.returnMaxDistanceKm', value)}
                    />
                    <EditableListingField
                      label={tCreate('returnPricePerKm') || 'Prix au km (€)'}
                      value={locationPickup.returnPricePerKm ?? 0}
                      fieldKey="location.returnPricePerKm"
                      fieldType="number"
                      onSave={(value) => handleSaveField('location.returnPricePerKm', value)}
                    />
                  </>
                )}
              </FieldGroup>

              {/* Groupe 3 — Livraison */}
              <FieldGroup
                title="Livraison"
                description="Proposez-vous un service de livraison du véhicule ?"
              >
                <EditableListingField
                  label={tCreate('deliveryOffer') || 'Service de livraison'}
                  value={locationPickup.deliveryAvailable}
                  fieldKey="location.deliveryAvailable"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('location.deliveryAvailable', value)}
                />
                {locationPickup.deliveryAvailable && (
                  <div className="space-y-0 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-neutral-700 mb-2">
                        {tCreate('deliveryRadiusKm') || 'Rayon de livraison'} : {locationPickup.deliveryRadiusKm} km
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={locationPickup.deliveryRadiusKm}
                        onChange={(e) => handleSaveField('location.deliveryRadiusKm', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-neutral-500 mt-1">
                        <span>1 km</span>
                        <span>100 km</span>
                      </div>
                    </div>
                    <EditableListingField
                      label={tCreate('deliveryPricePerKm') || 'Prix au km (€)'}
                      value={locationPickup.deliveryPricePerKm}
                      fieldKey="location.deliveryPricePerKm"
                      fieldType="number"
                      onSave={(value) => handleSaveField('location.deliveryPricePerKm', value)}
                    />
                  </div>
                )}
              </FieldGroup>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Groupe 1 — Tarif de base */}
              <FieldGroup
                title="Tarif de base"
                description="Définissez votre tarif journalier de référence"
              >
                <EditableListingField
                  label={tCreate('pricePerDay') || 'Tarif journalier'}
                  value={pricing.pricePerDay}
                  fieldKey="pricing.pricePerDay"
                  fieldType="number"
                  onSave={(value) => handleSaveField('pricing.pricePerDay', value)}
                />
                {pricing.pricePerDay > 0 && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 mt-2">
                    <p className="text-sm font-medium text-green-800">
                      Prix journalier : {pricing.pricePerDay.toFixed(2)} €
                    </p>
                  </div>
                )}
              </FieldGroup>

              {/* Groupe 2 — Remise J+3 */}
              <FieldGroup
                title="Remise J+3"
                description="Offrez une remise pour les locations de 3 jours ou plus"
              >
                <DiscountGroup
                  label="Remise à partir de 3 jours"
                  days={3}
                  enabled={pricing.discount3Days.enabled}
                  percentage={pricing.discount3Days.percentage}
                  basePrice={pricing.pricePerDay}
                  onToggle={(enabled) => handleSaveField('pricing.discount3Days.enabled', enabled)}
                  onPercentageChange={(percentage) => handleSaveField('pricing.discount3Days.percentage', percentage)}
                  minPercentage={0}
                  maxPercentage={100}
                />
              </FieldGroup>

              {/* Groupe 3 — Remise J+7 */}
              <FieldGroup
                title="Remise J+7"
                description="Offrez une remise encore plus avantageuse pour les locations de 7 jours ou plus"
              >
                <DiscountGroup
                  label="Remise à partir de 7 jours"
                  days={7}
                  enabled={pricing.discount7Days.enabled}
                  percentage={pricing.discount7Days.percentage}
                  basePrice={pricing.pricePerDay}
                  onToggle={(enabled) => handleSaveField('pricing.discount7Days.enabled', enabled)}
                  onPercentageChange={(percentage) => {
                    // Validation: must be >= discount3Days if enabled
                    if (percentage !== null && pricing.discount3Days.enabled && pricing.discount3Days.percentage !== null) {
                      const minPct = pricing.discount3Days.percentage;
                      if (percentage < minPct) {
                        alert(`La remise J+7 doit être d'au moins ${minPct}% (égale ou supérieure à la remise J+3)`);
                        return;
                      }
                    }
                    handleSaveField('pricing.discount7Days.percentage', percentage);
                  }}
                  minPercentage={pricing.discount3Days.enabled && pricing.discount3Days.percentage !== null ? pricing.discount3Days.percentage : 0}
                  maxPercentage={100}
                />
              </FieldGroup>

              {/* Groupe 4 — Remise J+30 */}
              <FieldGroup
                title="Remise J+30"
                description="Remise maximale pour les locations longues durées (30 jours ou plus)"
              >
                <DiscountGroup
                  label="Remise à partir de 30 jours"
                  days={30}
                  enabled={pricing.discount30Days.enabled}
                  percentage={pricing.discount30Days.percentage}
                  basePrice={pricing.pricePerDay}
                  onToggle={(enabled) => handleSaveField('pricing.discount30Days.enabled', enabled)}
                  onPercentageChange={(percentage) => {
                    // Validation: must be >= discount7Days if enabled
                    if (percentage !== null && pricing.discount7Days.enabled && pricing.discount7Days.percentage !== null) {
                      const minPct = pricing.discount7Days.percentage;
                      if (percentage < minPct) {
                        alert(`La remise J+30 doit être d'au moins ${minPct}% (égale ou supérieure à la remise J+7)`);
                        return;
                      }
                    }
                    handleSaveField('pricing.discount30Days.percentage', percentage);
                  }}
                  minPercentage={pricing.discount7Days.enabled && pricing.discount7Days.percentage !== null ? pricing.discount7Days.percentage : 0}
                  maxPercentage={100}
                />
              </FieldGroup>

              {/* Livraison à l'heure (affiché si livraison activée) */}
              {locationPickup.deliveryAvailable && (
                <FieldGroup title={tCreate('hourlyDelivery') || 'Livraison à l\'heure'}>
                  <EditableListingField
                    label={tCreate('hourlyDeliveryAvailable') || 'Proposer la livraison à l\'heure'}
                    value={locationPickup.hourlyDeliveryAvailable}
                    fieldKey="location.hourlyDeliveryAvailable"
                    fieldType="boolean"
                    onSave={(value) => handleSaveField('location.hourlyDeliveryAvailable', value)}
                  />
                  {locationPickup.hourlyDeliveryAvailable && (
                    <EditableListingField
                      label={tCreate('deliveryPricePerHour') || 'Tarif horaire de livraison (€)'}
                      value={locationPickup.deliveryPricePerHour}
                      fieldKey="location.deliveryPricePerHour"
                      fieldType="number"
                      onSave={(value) => handleSaveField('location.deliveryPricePerHour', value)}
                    />
                  )}
                </FieldGroup>
              )}

              {/* Simulation de prix */}
              {pricing.pricePerDay > 0 && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-lg font-semibold text-black mb-3">Simulation de prix</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[3, 7, 30].map((days) => {
                      let finalPrice = pricing.pricePerDay;
                      let discount = 0;
                      
                      if (days >= 30 && pricing.discount30Days.enabled && pricing.discount30Days.percentage) {
                        discount = pricing.discount30Days.percentage;
                        finalPrice = pricing.pricePerDay * (1 - discount / 100);
                      } else if (days >= 7 && pricing.discount7Days.enabled && pricing.discount7Days.percentage) {
                        discount = pricing.discount7Days.percentage;
                        finalPrice = pricing.pricePerDay * (1 - discount / 100);
                      } else if (days >= 3 && pricing.discount3Days.enabled && pricing.discount3Days.percentage) {
                        discount = pricing.discount3Days.percentage;
                        finalPrice = pricing.pricePerDay * (1 - discount / 100);
                      }
                      
                      const total = finalPrice * days;
                      const originalTotal = pricing.pricePerDay * days;
                      const savings = originalTotal - total;
                      
                      return (
                        <div key={days} className="rounded-lg bg-white border border-neutral-200 p-3">
                          <p className="text-xs text-neutral-600 mb-1">{days} jours</p>
                          <p className="text-lg font-semibold text-black">{total.toFixed(2)} €</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {finalPrice.toFixed(2)} € / jour
                          </p>
                          {discount > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Économie : {savings.toFixed(2)} € ({discount}%)
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'insurance' && (
            <InsuranceTabContent
              usePlatformInsurance={insuranceOptions.usePlatformInsurance}
              policyIds={insuranceOptions.policyIds}
              onSaveUsePlatform={(value) => handleSaveField('insurance.usePlatformInsurance', value)}
              onSavePolicyIds={(value) => handleSaveField('insurance.policyIds', value)}
              setInsuranceOptions={setInsuranceOptions}
            />
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              {/* Groupe 1 — Type de réservation */}
              <FieldGroup
                title="Type de réservation"
                description="Comment les réservations sont-elles confirmées ?"
              >
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
                    <input
                      type="radio"
                      name="bookingMode"
                      checked={availabilityBookingRules.instantBooking}
                      onChange={async () => {
                        await handleSaveField('availability.instantBooking', true);
                        await handleSaveField('availability.manualApprovalRequired', false);
                        setAvailabilityBookingRules((prev) => ({ ...prev, instantBooking: true, manualApprovalRequired: false }));
                      }}
                      className="h-4 w-4"
                    />
                    <div>
                      <span className="font-medium">{tCreate('instantBooking') || 'Réservation instantanée'}</span>
                      <p className="text-sm text-muted-foreground">{tCreate('instantBookingDesc') || 'La réservation est confirmée automatiquement.'}</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
                    <input
                      type="radio"
                      name="bookingMode"
                      checked={availabilityBookingRules.manualApprovalRequired}
                      onChange={async () => {
                        await handleSaveField('availability.instantBooking', false);
                        await handleSaveField('availability.manualApprovalRequired', true);
                        setAvailabilityBookingRules((prev) => ({ ...prev, instantBooking: false, manualApprovalRequired: true }));
                      }}
                      className="h-4 w-4"
                    />
                    <div>
                      <span className="font-medium">{tCreate('manualApproval') || 'Validation manuelle requise'}</span>
                      <p className="text-sm text-muted-foreground">{tCreate('manualApprovalDesc') || 'Chaque réservation doit être validée par vous.'}</p>
                    </div>
                  </label>
                </div>
              </FieldGroup>

              {/* Groupe 2 — Contraintes de réservation */}
              <FieldGroup
                title="Contraintes de réservation"
                description="Durées minimum/maximum, délais et plages horaires"
              >
                <EditableListingField
                  label={tCreate('minRentalDuration') || 'Durée minimum (heures)'}
                  value={availabilityBookingRules.minRentalDurationHours}
                  fieldKey="availability.minRentalDurationHours"
                  fieldType="number"
                  onSave={(value) => handleSaveField('availability.minRentalDurationHours', value)}
                />
                <EditableListingField
                  label={tCreate('maxRentalDuration') || 'Durée maximum (jours)'}
                  value={availabilityBookingRules.maxRentalDurationDays}
                  fieldKey="availability.maxRentalDurationDays"
                  fieldType="number"
                  onSave={(value) => handleSaveField('availability.maxRentalDurationDays', value)}
                />
                <EditableListingField
                  label={tCreate('minBookingNotice') || 'Délai de réservation minimum (heures)'}
                  value={availabilityBookingRules.minBookingNoticeHours}
                  fieldKey="availability.minBookingNoticeHours"
                  fieldType="number"
                  onSave={(value) => handleSaveField('availability.minBookingNoticeHours', value)}
                />
                <EditableListingField
                  label={tCreate('maxBookingAdvance') || "Réservation maximum à l'avance (jours)"}
                  value={availabilityBookingRules.maxBookingAdvanceDays}
                  fieldKey="availability.maxBookingAdvanceDays"
                  fieldType="number"
                  onSave={(value) => handleSaveField('availability.maxBookingAdvanceDays', value)}
                />
              </FieldGroup>

              {/* Champs avancés (collapsible) */}
              <CollapsibleSection
                title="Options avancées"
                description="Paramètres supplémentaires pour la gestion des disponibilités"
              >
                <FieldGroup>
                  <EditableListingField
                    label={tCreate('bufferHours') || 'Heures de buffer'}
                    value={availabilityBookingRules.bufferHours}
                    fieldKey="availability.bufferHours"
                    fieldType="number"
                    onSave={(value) => handleSaveField('availability.bufferHours', value)}
                  />
                  <EditableListingField
                    label={tCreate('rejectIsolatedGaps') || 'Rejeter les créneaux isolés'}
                    value={availabilityBookingRules.rejectIsolatedGaps}
                    fieldKey="availability.rejectIsolatedGaps"
                    fieldType="boolean"
                    onSave={(value) => handleSaveField('availability.rejectIsolatedGaps', value)}
                  />
                  <EditableListingField
                    label={tCreate('allowedTimeSlots') || 'Plages horaires autorisées'}
                    value={availabilityBookingRules.allowedTimeSlots}
                    fieldKey="availability.allowedTimeSlots"
                    fieldType="timeSlots"
                    onSave={(value) => handleSaveField('availability.allowedTimeSlots', value)}
                  />
                  <EditableListingField
                    label={tCreate('forbiddenDepartureDays') || 'Jours de départ interdits'}
                    value={availabilityBookingRules.forbiddenDepartureDays}
                    fieldKey="availability.forbiddenDepartureDays"
                    fieldType="forbiddenDays"
                    onSave={(value) => handleSaveField('availability.forbiddenDepartureDays', value)}
                  />
                  <EditableListingField
                    label={tCreate('autoUnavailableAfterDays') || 'Indisponibilité automatique après X jours'}
                    value={availabilityBookingRules.autoUnavailableAfterDays}
                    fieldKey="availability.autoUnavailableAfterDays"
                    fieldType="number"
                    onSave={(value) => handleSaveField('availability.autoUnavailableAfterDays', value)}
                    showCondition={availabilityBookingRules.autoUnavailableAfterDays !== null || true}
                  />
                </FieldGroup>
              </CollapsibleSection>
              
              {/* Calendrier de disponibilité */}
              <div className="rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{t('availabilityCalendar') || 'Calendrier de disponibilité'}</h2>
                  <p className="text-sm text-neutral-600">
                    Cliquez sur un jour pour le rendre disponible / indisponible
                  </p>
                </div>
                <HostAvailabilityCalendar listingId={listing.id} />
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              {insuranceOptions.usePlatformInsurance && insuranceOptions.policyIds.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Les critères (âge minimum, années de permis, caution, conducteur secondaire) peuvent être imposés par les polices d&apos;assurance sélectionnées. Si une police fixe une valeur, ce champ ne sera pas modifiable.
                </div>
              )}
              {/* Options supplémentaires (caution, jeune conducteur, conducteur secondaire) */}
              <FieldGroup title="Options supplémentaires">
                <EditableListingField
                  label={tCreate('caution') || 'Caution'}
                  value={pricing.caution}
                  fieldKey="pricing.caution"
                  fieldType="number"
                  onSave={(value) => handleSaveField('pricing.caution', value)}
                />
                <EditableListingField
                  label={tCreate('youngDriverFee') || 'Frais jeune conducteur'}
                  value={pricing.youngDriverFee}
                  fieldKey="pricing.youngDriverFee"
                  fieldType="number"
                  onSave={(value) => handleSaveField('pricing.youngDriverFee', value)}
                  showCondition={pricing.youngDriverFee !== null || true}
                />
                <EditableListingField
                  label={tCreate('secondDriverAllowed') || 'Conducteur secondaire autorisé'}
                  value={secondDriver.available}
                  fieldKey="secondDriver.available"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('secondDriver.available', value)}
                />
                {secondDriver.available && (
                  <EditableListingField
                    label={tCreate('secondDriverPrice') || 'Tarif conducteur secondaire (€)'}
                    value={secondDriver.price}
                    fieldKey="secondDriver.price"
                    fieldType="number"
                    onSave={(value) => handleSaveField('secondDriver.price', value)}
                  />
                )}
              </FieldGroup>

              {/* Règles d'usage */}
              <FieldGroup title="Règles d'usage">
                <EditableListingField
                  label={tCreate('smokingAllowed') || 'Fumer autorisé'}
                  value={rulesConditions.smokingAllowed}
                  fieldKey="rules.smokingAllowed"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('rules.smokingAllowed', value)}
                />
                <EditableListingField
                  label={tCreate('petsAllowed') || 'Animaux autorisés'}
                  value={rulesConditions.petsAllowed}
                  fieldKey="rules.petsAllowed"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('rules.petsAllowed', value)}
                />
                <EditableListingField
                  label={tCreate('musicAllowed') || 'Musique autorisée'}
                  value={rulesConditions.musicAllowed}
                  fieldKey="rules.musicAllowed"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('rules.musicAllowed', value)}
                />
                <EditableListingField
                  label={tCreate('tollsIncluded') || 'Péages inclus'}
                  value={rulesConditions.tollsIncluded}
                  fieldKey="rules.tollsIncluded"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('rules.tollsIncluded', value)}
                />
              </FieldGroup>

              {/* Carburant & kilométrage */}
              <FieldGroup title="Carburant & kilométrage">
                <EditableListingField
                  label={tCreate('fuelPolicy') || 'Politique de carburant'}
                  value={rulesConditions.fuelPolicy}
                  fieldKey="rules.fuelPolicy"
                  fieldType="fuelPolicy"
                  onSave={(value) => handleSaveField('rules.fuelPolicy', value)}
                />
                <EditableListingField
                  label={tCreate('maxMileagePerDay') || 'Kilométrage journalier (km)'}
                  value={rulesConditions.maxMileagePerDay}
                  fieldKey="rules.maxMileagePerDay"
                  fieldType="number"
                  onSave={(value) => handleSaveField('rules.maxMileagePerDay', value)}
                  showCondition={rulesConditions.maxMileagePerDay !== null || true}
                />
                <EditableListingField
                  label={tCreate('excessMileagePricePerKm') || 'Montant par km en cas de dépassement (€)'}
                  value={rulesConditions.excessMileagePricePerKm}
                  fieldKey="rules.excessMileagePricePerKm"
                  fieldType="number"
                  onSave={(value) => handleSaveField('rules.excessMileagePricePerKm', value)}
                  showCondition={rulesConditions.excessMileagePricePerKm !== null || true}
                />
              </FieldGroup>

              {/* Conditions conducteur */}
              <FieldGroup title="Conditions conducteur">
                <EditableListingField
                  label={tCreate('minDriverAge') || 'Âge minimum'}
                  value={rulesConditions.minDriverAge}
                  fieldKey="rules.minDriverAge"
                  fieldType="number"
                  onSave={(value) => handleSaveField('rules.minDriverAge', value)}
                />
                <EditableListingField
                  label={tCreate('minLicenseYears') || 'Années de permis minimum'}
                  value={rulesConditions.minLicenseYears}
                  fieldKey="rules.minLicenseYears"
                  fieldType="number"
                  onSave={(value) => handleSaveField('rules.minLicenseYears', value)}
                />
              </FieldGroup>

              {/* Conditions de retour */}
              <FieldGroup title="Conditions de retour">
                <EditableListingField
                  label={tCreate('returnFuelLevel') || 'Niveau de carburant au retour'}
                  value={rulesConditions.returnFuelLevel}
                  fieldKey="rules.returnFuelLevel"
                  fieldType="select"
                  onSave={(value) => handleSaveField('rules.returnFuelLevel', value)}
                  options={[
                    { value: 'full', label: tCreate('fuelFull') || 'Plein' },
                    { value: 'same', label: tCreate('fuelSame') || 'Même niveau' },
                    { value: 'any', label: tCreate('fuelAny') || 'N\'importe quel niveau' },
                  ]}
                />
                <EditableListingField
                  label={tCreate('returnCleaningRequired') || 'Nettoyage requis'}
                  value={rulesConditions.returnCleaningRequired}
                  fieldKey="rules.returnCleaningRequired"
                  fieldType="boolean"
                  onSave={(value) => handleSaveField('rules.returnCleaningRequired', value)}
                />
              </FieldGroup>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              <FieldGroup title={tCreate('description') || 'Description'}>
                <EditableListingField
                  label={tCreate('description') || 'Description'}
                  value={pricing.description}
                  fieldKey="pricing.description"
                  fieldType="textarea"
                  onSave={(value) => handleSaveField('pricing.description', value)}
                />
              </FieldGroup>
              <Step7Photos
                listingId={listing.id}
                onComplete={handlePhotosAdded}
                onBack={() => {}}
                apiBasePath="/admin/listings"
              />
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
