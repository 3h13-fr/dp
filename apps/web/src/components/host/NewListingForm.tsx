'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useKycModal } from '@/contexts/KycModalContext';
import {
  Step1OfferType,
  Step2VehicleMode,
  Step3VehicleIdentify,
  Step4VehicleOptions,
  Step7Photos,
} from '@/components/host/create-listing';
import { ListingEditTabs } from '@/components/host/ListingEditTabs';
import { FieldGroup } from '@/components/host/FieldGroup';
import { CollapsibleSection } from '@/components/host/CollapsibleSection';
import { DiscountGroup } from '@/components/host/pricing/DiscountGroup';
import { CreateListingField } from './CreateListingField';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { AddressMapPicker } from '@/components/AddressMapPicker';
import type { OfferType } from '@/components/host/create-listing';
import type { VehicleMode } from '@/components/host/create-listing';
import type { EquipmentKey } from '@/components/host/create-listing';
import type { LocationPickupData } from '@/components/host/create-listing';
import type { AvailabilityBookingRulesData } from '@/components/host/create-listing';
import type { RulesConditionsData } from '@/components/host/create-listing';

type Tab = 'location' | 'pricing' | 'availability' | 'rules' | 'photos';

type NewListingFormProps = {
  onSuccess: (listingId: string) => void;
  onCancel: () => void;
};

// New pricing structure with percentage-based discounts
type NewPricingData = {
  pricePerDay: number;
  caution: number | null;
  description: string;
  discount3Days: { enabled: boolean; percentage: number | null };
  discount7Days: { enabled: boolean; percentage: number | null };
  discount30Days: { enabled: boolean; percentage: number | null };
  youngDriverFee?: number | null;
};

export function NewListingForm({ onSuccess, onCancel }: NewListingFormProps) {
  const t = useTranslations('hostNav');
  const tCreate = useTranslations('createListing');
  const tKyc = useTranslations('kyc');
  const { openKyc } = useKycModal();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [offerType, setOfferType] = useState<OfferType | null>(null);
  const [vehicleMode, setVehicleMode] = useState<VehicleMode | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [seats, setSeats] = useState(5);
  const [doors, setDoors] = useState(4);
  const [luggage, setLuggage] = useState(2);
  const [equipment, setEquipment] = useState<EquipmentKey[]>([]);
  const [experienceTitle, setExperienceTitle] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('location');

  // Form data states
  const [locationPickup, setLocationPickup] = useState<LocationPickupData>({
    address: '',
    pickupMethod: 'handover',
    returnMethod: 'same',
    deliveryAvailable: false,
    deliveryRadiusKm: 50,
    deliveryPricePerKm: 0,
    keyboxCode: '',
    hourlyDeliveryAvailable: false,
    deliveryPricePerHour: null,
  });

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u?.kycStatus ?? null)
      .catch(() => null)
      .then(setKycStatus)
      .finally(() => setLoading(false));
  }, []);

  // Check if wizard steps are complete to show tabs
  const canShowTabs = () => {
    if (offerType === 'experience') {
      return wizardStep >= 5 && experienceTitle.trim() !== '';
    }
    if (offerType === 'vehicle') {
      return wizardStep >= 5 && vehicleId !== null;
    }
    return false;
  };

  const buildOptions = () => {
    const opt: Record<string, unknown> = {};
    if (equipment.length) opt.equipment = equipment;
    opt.delivery = {
      available: locationPickup.deliveryAvailable,
      radiusKm: locationPickup.deliveryRadiusKm,
      pricePerKm: locationPickup.deliveryPricePerKm,
      hourlyDeliveryAvailable: locationPickup.hourlyDeliveryAvailable ?? false,
      deliveryPricePerHour: locationPickup.deliveryPricePerHour ?? null,
    };
    opt.pickup = {
      method: locationPickup.pickupMethod,
      returnMethod: locationPickup.returnMethod,
      returnAddress: locationPickup.returnAddress,
      returnCity: locationPickup.returnCity,
      returnCountry: locationPickup.returnCountry,
      keyboxCode: locationPickup.keyboxCode || undefined,
      returnMaxDistanceKm: locationPickup.returnMaxDistanceKm,
      returnPricePerKm: locationPickup.returnPricePerKm,
    };
    opt.pricing = {
      durationDiscount3Days: pricing.discount3Days.enabled ? pricing.discount3Days.percentage : null,
      durationDiscount7Days: pricing.discount7Days.enabled ? pricing.discount7Days.percentage : null,
      durationDiscount30Days: pricing.discount30Days.enabled ? pricing.discount30Days.percentage : null,
      youngDriverFee: pricing.youngDriverFee,
    };
    opt.availability = {
      bufferHours: availabilityBookingRules.bufferHours,
      autoUnavailableAfterDays: availabilityBookingRules.autoUnavailableAfterDays,
      rejectIsolatedGaps: availabilityBookingRules.rejectIsolatedGaps,
      allowedTimeSlots: availabilityBookingRules.allowedTimeSlots,
      forbiddenDepartureDays: availabilityBookingRules.forbiddenDepartureDays,
    };
    opt.usageConditions = {
      smokingAllowed: rulesConditions.smokingAllowed,
      petsAllowed: rulesConditions.petsAllowed,
      musicAllowed: rulesConditions.musicAllowed,
      tollsIncluded: rulesConditions.tollsIncluded,
      fuelPolicy: rulesConditions.fuelPolicy,
      maxMileagePerDay: rulesConditions.maxMileagePerDay,
      excessMileagePricePerKm: rulesConditions.excessMileagePricePerKm,
    };
    opt.returnRules = {
      returnFuelLevel: rulesConditions.returnFuelLevel,
      returnCleaningRequired: rulesConditions.returnCleaningRequired,
      returnChecklist: rulesConditions.returnChecklist,
    };
    if (secondDriver.available) {
      opt.secondDriver = { available: true, price: secondDriver.price };
    }
    return opt;
  };

  const createDraftListing = useCallback(async () => {
    if (createdListingId) return;

    try {
      if (offerType === 'experience') {
        const res = await apiFetch('/listings', {
          method: 'POST',
          body: JSON.stringify({
            type: 'MOTORIZED_EXPERIENCE',
            title: experienceTitle.trim() || `Experience ${locationPickup.city || 'listing'}`,
            city: locationPickup.city || undefined,
            country: locationPickup.country || undefined,
            status: 'DRAFT',
          }),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setCreatedListingId(data.id);
        }
      } else if (offerType === 'vehicle' && vehicleId) {
        const res = await apiFetch('/listings', {
          method: 'POST',
          body: JSON.stringify({
            type: vehicleMode === 'chauffeur' ? 'CHAUFFEUR' : 'CAR_RENTAL',
            vehicleId,
            seats,
            doors,
            luggage,
            status: 'DRAFT',
          }),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setCreatedListingId(data.id);
        }
      }
    } catch (error) {
      console.error('Failed to create draft listing:', error);
    }
  }, [createdListingId, offerType, vehicleId, vehicleMode, seats, doors, luggage, experienceTitle, locationPickup.city, locationPickup.country]);

  useEffect(() => {
    if (offerType === 'vehicle' && wizardStep === 4 && vehicleId && !createdListingId) {
      createDraftListing();
    }
    if (offerType === 'experience' && wizardStep >= 1 && !createdListingId && experienceTitle) {
      createDraftListing();
    }
  }, [wizardStep, offerType, vehicleId, createdListingId, experienceTitle, createDraftListing]);

  const submitListing = async () => {
    setSubmitError('');
    setSubmitting(true);
    const options = buildOptions();
    const basePayload = {
      city: locationPickup.city || undefined,
      country: locationPickup.country || undefined,
      address: locationPickup.address || undefined,
      latitude: locationPickup.latitude,
      longitude: locationPickup.longitude,
      pricePerDay: pricing.pricePerDay || undefined,
      currency: 'EUR',
      caution: pricing.caution ?? undefined,
      description: pricing.description || undefined,
      status: 'DRAFT',
      options,
      minBookingNoticeHours: availabilityBookingRules.minBookingNoticeHours,
      maxBookingAdvanceDays: availabilityBookingRules.maxBookingAdvanceDays,
      instantBooking: availabilityBookingRules.instantBooking,
      manualApprovalRequired: availabilityBookingRules.manualApprovalRequired,
      minRentalDurationHours: availabilityBookingRules.minRentalDurationHours,
      maxRentalDurationDays: availabilityBookingRules.maxRentalDurationDays,
      autoAcceptBookings: availabilityBookingRules.instantBooking && !availabilityBookingRules.manualApprovalRequired,
      minDriverAge: rulesConditions.minDriverAge,
      minLicenseYears: rulesConditions.minLicenseYears,
    };

    try {
      if (createdListingId) {
        const res = await apiFetch(`/listings/${createdListingId}`, {
          method: 'PATCH',
          body: JSON.stringify(basePayload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.message || 'Failed to update listing');
        }
        onSuccess(createdListingId);
        return;
      }

      if (offerType === 'experience') {
        const res = await apiFetch('/listings', {
          method: 'POST',
          body: JSON.stringify({
            type: 'MOTORIZED_EXPERIENCE',
            title: experienceTitle.trim() || `Experience ${locationPickup.city || 'listing'}`,
            ...basePayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to create listing');
        onSuccess(data.id);
        return;
      }

      const types: ('CAR_RENTAL' | 'CHAUFFEUR')[] =
        vehicleMode === 'both' ? ['CAR_RENTAL', 'CHAUFFEUR'] : vehicleMode === 'chauffeur' ? ['CHAUFFEUR'] : ['CAR_RENTAL'];

      const payloadWithVehicle = {
        ...basePayload,
        type: types[0],
        vehicleId: vehicleId!,
        seats,
        doors,
        luggage,
      };
      const res1 = await apiFetch('/listings', { method: 'POST', body: JSON.stringify(payloadWithVehicle) });
      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1?.message || 'Failed to create listing');

      if (types.length === 2) {
        const res2 = await apiFetch('/listings', {
          method: 'POST',
          body: JSON.stringify({
            ...basePayload,
            type: 'CHAUFFEUR',
            vehicleId: vehicleId!,
            seats,
            doors,
            luggage,
          }),
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2?.message || 'Failed to create second listing');
      }
      onSuccess(data1.id);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">{t('loading')}</p>;

  if (kycStatus !== 'APPROVED') {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
        <h1 className="text-2xl font-bold">{t('kycReminder')}</h1>
        <p className="mt-2 font-medium text-amber-800">{tKyc('requiredToCreateListing')}</p>
        <button
          type="button"
          onClick={() => openKyc(true)}
          className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white"
        >
          {tKyc('goToKyc')}
        </button>
      </div>
    );
  }

  // Show wizard steps if not complete
  if (!canShowTabs()) {
    return (
      <div className="space-y-6">
        {wizardStep === 1 && (offerType === null || offerType === 'vehicle') && (
          <Step1OfferType
            value={offerType}
            onChange={(v) => {
              setOfferType(v);
              // For experience, automatically show the title field
              if (v === 'experience') {
                // Stay on step 1 but offerType is now 'experience', so the title field will show
              }
            }}
            onNext={() => {
              if (offerType === 'vehicle') {
                setWizardStep(2);
              }
            }}
          />
        )}
        {wizardStep === 1 && offerType === 'experience' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{tCreate('step1Title')}</h2>
            <label className="block">
              <span className="text-sm font-medium">Titre de l'expérience</span>
              <input
                type="text"
                placeholder="e.g. Balade en 2CV"
                value={experienceTitle}
                onChange={(e) => setExperienceTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setOfferType(null);
                  setWizardStep(1);
                }}
                className="rounded-lg border border-border px-6 py-2.5 font-medium"
              >
                {tCreate('back')}
              </button>
              <div className="flex flex-col items-end gap-2">
                {!experienceTitle.trim() && (
                  <p className="text-xs text-red-600">{tCreate('titleRequired') || 'Le titre est requis'}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (experienceTitle.trim()) {
                      setWizardStep(5);
                    }
                  }}
                  disabled={!experienceTitle.trim()}
                  className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tCreate('next')}
                </button>
              </div>
            </div>
          </div>
        )}
        {wizardStep === 2 && offerType === 'vehicle' && (
          <Step2VehicleMode
            value={vehicleMode}
            onChange={setVehicleMode}
            onNext={() => setWizardStep(3)}
            onBack={() => setWizardStep(1)}
          />
        )}
        {wizardStep === 3 && offerType === 'vehicle' && (
          <Step3VehicleIdentify
            vehicleId={vehicleId}
            onComplete={(id, s, d, l) => {
              setVehicleId(id);
              setSeats(s);
              setDoors(d);
              setLuggage(l);
              setWizardStep(4);
            }}
            onBack={() => setWizardStep(2)}
          />
        )}
        {wizardStep === 4 && offerType === 'vehicle' && (
          <Step4VehicleOptions
            selected={equipment}
            onChange={setEquipment}
            onNext={() => {
              // Wizard complete, show tabs
              setWizardStep(5);
            }}
            onBack={() => setWizardStep(3)}
          />
        )}
      </div>
    );
  }

  // Show tabs and form content
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <ListingEditTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasVehicle={!!vehicleId}
      />

      {/* Tab Content */}
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      {activeTab === 'location' && (
        <div className="space-y-6">
          <FieldGroup
            title="Adresse principale"
            description="Où le véhicule est-il disponible pour la remise ?"
          >
            <CreateListingField
              label={tCreate('address') || 'Adresse'}
              value={locationPickup.address}
              fieldType="address"
              onChange={(value) => setLocationPickup((prev) => ({ ...prev, address: value }))}
              onAddressSelect={async (suggestion) => {
                setLocationPickup((prev) => ({
                  ...prev,
                  address: suggestion.address,
                  city: suggestion.city,
                  country: suggestion.country,
                  latitude: suggestion.latitude,
                  longitude: suggestion.longitude,
                }));
              }}
            />
            {locationPickup.latitude != null && locationPickup.longitude != null && (
              <div className="mt-3">
                <p className="text-xs text-neutral-600 mb-2">{tCreate('mapPreview') || 'Déplacez le marqueur pour mettre à jour l\'adresse'}</p>
                <AddressMapPicker
                  latitude={locationPickup.latitude}
                  longitude={locationPickup.longitude}
                  address={locationPickup.address}
                  onPositionChange={(lat, lng, suggestion) => {
                    setLocationPickup((prev) => ({
                      ...prev,
                      address: suggestion.address,
                      city: suggestion.city,
                      country: suggestion.country,
                      latitude: lat,
                      longitude: lng,
                    }));
                  }}
                  height={200}
                />
              </div>
            )}
          </FieldGroup>

          <FieldGroup
            title="Méthode de remise et retour"
            description="Comment le client récupère-t-il et retourne-t-il le véhicule ?"
          >
            <CreateListingField
              label={tCreate('pickupMethod') || 'Méthode de remise'}
              value={locationPickup.pickupMethod}
              fieldType="pickupMethod"
              onChange={(value) => setLocationPickup((prev) => ({ ...prev, pickupMethod: value }))}
            />
            <CreateListingField
              label={tCreate('returnMethod') || 'Méthode de retour'}
              value={locationPickup.returnMethod}
              fieldType="returnMethod"
              onChange={(value) => setLocationPickup((prev) => ({ ...prev, returnMethod: value }))}
              returnMethod={locationPickup.returnMethod}
            />
            {locationPickup.returnMethod === 'different' && (
              <CreateListingField
                label={tCreate('returnAddress') || 'Adresse de retour'}
                value={locationPickup.returnAddress || ''}
                fieldType="address"
                onChange={(value) => setLocationPickup((prev) => ({ ...prev, returnAddress: value }))}
                onAddressSelect={async (suggestion) => {
                  setLocationPickup((prev) => ({
                    ...prev,
                    returnAddress: suggestion.address,
                    returnCity: suggestion.city,
                    returnCountry: suggestion.country,
                  }));
                }}
              />
            )}
          </FieldGroup>

          <FieldGroup
            title="Livraison"
            description="Proposez-vous un service de livraison du véhicule ?"
          >
            <CreateListingField
              label={tCreate('deliveryOffer') || 'Service de livraison'}
              value={locationPickup.deliveryAvailable}
              fieldType="boolean"
              onChange={(value) => setLocationPickup((prev) => ({ ...prev, deliveryAvailable: value }))}
            />
            {locationPickup.deliveryAvailable && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    {tCreate('deliveryRadiusKm') || 'Rayon de livraison'} : {locationPickup.deliveryRadiusKm} km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={locationPickup.deliveryRadiusKm}
                    onChange={(e) => setLocationPickup((prev) => ({ ...prev, deliveryRadiusKm: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>1 km</span>
                    <span>100 km</span>
                  </div>
                </div>
                <CreateListingField
                  label={tCreate('deliveryPricePerKm') || 'Prix au km (€)'}
                  value={locationPickup.deliveryPricePerKm}
                  fieldType="number"
                  onChange={(value) => setLocationPickup((prev) => ({ ...prev, deliveryPricePerKm: value }))}
                />
              </div>
            )}
          </FieldGroup>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <FieldGroup
            title="Tarif de base"
            description="Définissez votre tarif journalier de référence"
          >
            <CreateListingField
              label={tCreate('pricePerDay') || 'Tarif journalier'}
              value={pricing.pricePerDay}
              fieldType="number"
              onChange={(value) => setPricing((prev) => ({ ...prev, pricePerDay: value }))}
            />
          </FieldGroup>

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
              onToggle={(enabled) => setPricing((prev) => ({ ...prev, discount3Days: { ...prev.discount3Days, enabled } }))}
              onPercentageChange={(percentage) => setPricing((prev) => ({ ...prev, discount3Days: { ...prev.discount3Days, percentage } }))}
              minPercentage={0}
              maxPercentage={100}
            />
          </FieldGroup>

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
              onToggle={(enabled) => setPricing((prev) => ({ ...prev, discount7Days: { ...prev.discount7Days, enabled } }))}
              onPercentageChange={(percentage) => {
                if (percentage !== null && pricing.discount3Days.enabled && pricing.discount3Days.percentage !== null) {
                  const minPct = pricing.discount3Days.percentage;
                  if (percentage < minPct) {
                    alert(`La remise J+7 doit être d'au moins ${minPct}%`);
                    return;
                  }
                }
                setPricing((prev) => ({ ...prev, discount7Days: { ...prev.discount7Days, percentage } }));
              }}
              minPercentage={pricing.discount3Days.enabled && pricing.discount3Days.percentage !== null ? pricing.discount3Days.percentage : 0}
              maxPercentage={100}
            />
          </FieldGroup>

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
              onToggle={(enabled) => setPricing((prev) => ({ ...prev, discount30Days: { ...prev.discount30Days, enabled } }))}
              onPercentageChange={(percentage) => {
                if (percentage !== null && pricing.discount7Days.enabled && pricing.discount7Days.percentage !== null) {
                  const minPct = pricing.discount7Days.percentage;
                  if (percentage < minPct) {
                    alert(`La remise J+30 doit être d'au moins ${minPct}%`);
                    return;
                  }
                }
                setPricing((prev) => ({ ...prev, discount30Days: { ...prev.discount30Days, percentage } }));
              }}
              minPercentage={pricing.discount7Days.enabled && pricing.discount7Days.percentage !== null ? pricing.discount7Days.percentage : 0}
              maxPercentage={100}
            />
          </FieldGroup>

          {locationPickup.deliveryAvailable && (
            <FieldGroup title={tCreate('hourlyDelivery') || 'Livraison à l\'heure'}>
              <CreateListingField
                label={tCreate('hourlyDeliveryAvailable') || 'Proposer la livraison à l\'heure'}
                value={locationPickup.hourlyDeliveryAvailable}
                fieldType="boolean"
                onChange={(value) => setLocationPickup((prev) => ({ ...prev, hourlyDeliveryAvailable: value }))}
              />
              {locationPickup.hourlyDeliveryAvailable && (
                <CreateListingField
                  label={tCreate('deliveryPricePerHour') || 'Tarif horaire de livraison (€)'}
                  value={locationPickup.deliveryPricePerHour}
                  fieldType="number"
                  onChange={(value) => setLocationPickup((prev) => ({ ...prev, deliveryPricePerHour: value }))}
                />
              )}
            </FieldGroup>
          )}

        </div>
      )}

      {activeTab === 'availability' && (
        <div className="space-y-6">
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
                  onChange={() => setAvailabilityBookingRules((prev) => ({ ...prev, instantBooking: true, manualApprovalRequired: false }))}
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
                  onChange={() => setAvailabilityBookingRules((prev) => ({ ...prev, instantBooking: false, manualApprovalRequired: true }))}
                  className="h-4 w-4"
                />
                <div>
                  <span className="font-medium">{tCreate('manualApproval') || 'Validation manuelle requise'}</span>
                  <p className="text-sm text-muted-foreground">{tCreate('manualApprovalDesc') || 'Chaque réservation doit être validée par vous.'}</p>
                </div>
              </label>
            </div>
          </FieldGroup>

          <FieldGroup
            title="Contraintes de réservation"
            description="Durées minimum/maximum, délais et plages horaires"
          >
            <CreateListingField
              label={tCreate('minRentalDuration') || 'Durée minimum (heures)'}
              value={availabilityBookingRules.minRentalDurationHours}
              fieldType="number"
              onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, minRentalDurationHours: value }))}
            />
            <CreateListingField
              label={tCreate('maxRentalDuration') || 'Durée maximum (jours)'}
              value={availabilityBookingRules.maxRentalDurationDays}
              fieldType="number"
              onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, maxRentalDurationDays: value }))}
            />
            <CreateListingField
              label={tCreate('minBookingNotice') || 'Délai de réservation minimum (heures)'}
              value={availabilityBookingRules.minBookingNoticeHours}
              fieldType="number"
              onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, minBookingNoticeHours: value }))}
            />
            <CreateListingField
              label={tCreate('maxBookingAdvance') || "Réservation maximum à l'avance (jours)"}
              value={availabilityBookingRules.maxBookingAdvanceDays}
              fieldType="number"
              onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, maxBookingAdvanceDays: value }))}
            />
          </FieldGroup>

          <CollapsibleSection
            title="Options avancées"
            description="Paramètres supplémentaires pour la gestion des disponibilités"
          >
            <FieldGroup>
              <CreateListingField
                label={tCreate('bufferHours') || 'Heures de buffer'}
                value={availabilityBookingRules.bufferHours}
                fieldType="number"
                onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, bufferHours: value }))}
              />
              <CreateListingField
                label={tCreate('rejectIsolatedGaps') || 'Rejeter les créneaux isolés'}
                value={availabilityBookingRules.rejectIsolatedGaps}
                fieldType="boolean"
                onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, rejectIsolatedGaps: value }))}
              />
              <CreateListingField
                label={tCreate('allowedTimeSlots') || 'Plages horaires autorisées'}
                value={availabilityBookingRules.allowedTimeSlots}
                fieldType="timeSlots"
                onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, allowedTimeSlots: value }))}
              />
              <CreateListingField
                label={tCreate('forbiddenDepartureDays') || 'Jours de départ interdits'}
                value={availabilityBookingRules.forbiddenDepartureDays}
                fieldType="forbiddenDays"
                onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, forbiddenDepartureDays: value }))}
              />
              <CreateListingField
                label={tCreate('autoUnavailableAfterDays') || 'Indisponibilité automatique après X jours'}
                value={availabilityBookingRules.autoUnavailableAfterDays}
                fieldType="number"
                onChange={(value) => setAvailabilityBookingRules((prev) => ({ ...prev, autoUnavailableAfterDays: value }))}
                showCondition={availabilityBookingRules.autoUnavailableAfterDays !== null || true}
              />
            </FieldGroup>
          </CollapsibleSection>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          <FieldGroup title="Options supplémentaires">
            <CreateListingField
              label={tCreate('caution') || 'Caution'}
              value={pricing.caution}
              fieldType="number"
              onChange={(value) => setPricing((prev) => ({ ...prev, caution: value }))}
            />
            <CreateListingField
              label={tCreate('youngDriverFee') || 'Frais jeune conducteur'}
              value={pricing.youngDriverFee}
              fieldType="number"
              onChange={(value) => setPricing((prev) => ({ ...prev, youngDriverFee: value }))}
              showCondition={pricing.youngDriverFee !== null || true}
            />
            <CreateListingField
              label={tCreate('secondDriverAllowed') || 'Conducteur secondaire autorisé'}
              value={secondDriver.available}
              fieldType="boolean"
              onChange={(value) => setSecondDriver((prev) => ({ ...prev, available: value }))}
            />
            {secondDriver.available && (
              <CreateListingField
                label={tCreate('secondDriverPrice') || 'Tarif conducteur secondaire (€)'}
                value={secondDriver.price}
                fieldType="number"
                onChange={(value) => setSecondDriver((prev) => ({ ...prev, price: value }))}
              />
            )}
          </FieldGroup>
          <FieldGroup title="Règles d'usage">
            <CreateListingField
              label={tCreate('smokingAllowed') || 'Fumer autorisé'}
              value={rulesConditions.smokingAllowed}
              fieldType="boolean"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, smokingAllowed: value }))}
            />
            <CreateListingField
              label={tCreate('petsAllowed') || 'Animaux autorisés'}
              value={rulesConditions.petsAllowed}
              fieldType="boolean"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, petsAllowed: value }))}
            />
            <CreateListingField
              label={tCreate('musicAllowed') || 'Musique autorisée'}
              value={rulesConditions.musicAllowed}
              fieldType="boolean"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, musicAllowed: value }))}
            />
            <CreateListingField
              label={tCreate('tollsIncluded') || 'Péages inclus'}
              value={rulesConditions.tollsIncluded}
              fieldType="boolean"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, tollsIncluded: value }))}
            />
          </FieldGroup>

          <FieldGroup title="Carburant & kilométrage">
            <CreateListingField
              label={tCreate('fuelPolicy') || 'Politique de carburant'}
              value={rulesConditions.fuelPolicy}
              fieldType="fuelPolicy"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, fuelPolicy: value }))}
            />
            <CreateListingField
              label={tCreate('maxMileagePerDay') || 'Kilométrage journalier (km)'}
              value={rulesConditions.maxMileagePerDay}
              fieldType="number"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, maxMileagePerDay: value }))}
              showCondition={rulesConditions.maxMileagePerDay !== null || true}
            />
            <CreateListingField
              label={tCreate('excessMileagePricePerKm') || 'Montant par km en cas de dépassement (€)'}
              value={rulesConditions.excessMileagePricePerKm}
              fieldType="number"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, excessMileagePricePerKm: value }))}
              showCondition={rulesConditions.excessMileagePricePerKm !== null || true}
            />
          </FieldGroup>

          <FieldGroup
            title="Conditions conducteur"
            description="Âge minimum et années de permis requis"
          >
            <CreateListingField
              label={tCreate('minDriverAge') || 'Âge minimum'}
              value={rulesConditions.minDriverAge}
              fieldType="number"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, minDriverAge: value }))}
            />
            <CreateListingField
              label={tCreate('minLicenseYears') || 'Années de permis minimum'}
              value={rulesConditions.minLicenseYears}
              fieldType="number"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, minLicenseYears: value }))}
            />
          </FieldGroup>

          <FieldGroup
            title="Conditions de retour"
            description="Niveau de carburant, nettoyage et inspection requis"
          >
            <CreateListingField
              label={tCreate('returnFuelLevel') || 'Niveau de carburant au retour'}
              value={rulesConditions.returnFuelLevel}
              fieldType="select"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, returnFuelLevel: value }))}
              options={[
                { value: 'full', label: tCreate('fuelFull') || 'Plein' },
                { value: 'same', label: tCreate('fuelSame') || 'Même niveau' },
                { value: 'any', label: tCreate('fuelAny') || "N'importe quel niveau" },
              ]}
            />
            <CreateListingField
              label={tCreate('returnCleaningRequired') || 'Nettoyage requis'}
              value={rulesConditions.returnCleaningRequired}
              fieldType="boolean"
              onChange={(value) => setRulesConditions((prev) => ({ ...prev, returnCleaningRequired: value }))}
            />
          </FieldGroup>
        </div>
      )}

      {activeTab === 'photos' && createdListingId && (
        <div className="space-y-6">
          <FieldGroup title={tCreate('description') || 'Description'}>
            <CreateListingField
              label={tCreate('description') || 'Description'}
              value={pricing.description}
              fieldType="textarea"
              onChange={(value) => setPricing((prev) => ({ ...prev, description: value }))}
            />
          </FieldGroup>
          <Step7Photos
            listingId={createdListingId}
            onComplete={() => {
              onSuccess(createdListingId);
            }}
            onBack={() => setActiveTab('rules')}
          />
        </div>
      )}

      {/* Footer with submit button */}
      {activeTab !== 'photos' && (
        <div className="flex justify-between border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 px-6 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {tCreate('cancel') || 'Annuler'}
          </button>
          <button
            type="button"
            onClick={submitListing}
            disabled={submitting || !pricing.pricePerDay}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (tCreate('creating') || 'Création...') : (tCreate('createListing') || 'Créer l\'annonce')}
          </button>
        </div>
      )}
    </div>
  );
}
