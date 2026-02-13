'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, API_URL } from '@/lib/api';
import { VehicleAutocomplete } from '@/components/host/VehicleAutocomplete';

type Step3VehicleIdentifyProps = {
  vehicleId: string | null;
  onComplete: (vehicleId: string, seats: number, doors: number, luggage: number) => void;
  onBack: () => void;
};

type Step = 'vin' | 'tech' | 'specs' | 'capacity' | 'admin';

type VinSpecs = {
  makeId?: string;
  modelId?: string;
  modelYear?: number;
  trimLabel?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  powerKw?: number;
  topSpeedKmh?: number;
  zeroTo100S?: number;
};

function generatePlaceholderVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let out = 'MANUAL';
  for (let i = 0; i < 11; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function Step3VehicleIdentify({ vehicleId, onComplete, onBack }: Step3VehicleIdentifyProps) {
  const t = useTranslations('createListing');
  const [step, setStep] = useState<Step>(vehicleId ? 'tech' : 'vin');
  const [useVin, setUseVin] = useState<boolean | null>(vehicleId ? null : null);
  const [vin, setVin] = useState('');
  const [vinValid, setVinValid] = useState<boolean | null>(null);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [specsFetched, setSpecsFetched] = useState(false);
  const [vinSpecs, setVinSpecs] = useState<VinSpecs | null>(null);
  
  // VIN step states
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [modelYear, setModelYear] = useState(new Date().getFullYear());
  const [trimLabel, setTrimLabel] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Tech specs states
  const [fuelType, setFuelType] = useState<string>('');
  const [transmissionType, setTransmissionType] = useState<string>('');
  const [driveType, setDriveType] = useState<string>('');
  const [savingTech, setSavingTech] = useState(false);
  
  // Performance specs states
  const [powerKw, setPowerKw] = useState<number | null>(null);
  const [powerCv, setPowerCv] = useState<number | null>(null);
  const [batteryKwh, setBatteryKwh] = useState<number | null>(null);
  const [topSpeedKmh, setTopSpeedKmh] = useState<number | null>(null);
  const [zeroTo100S, setZeroTo100S] = useState<number | null>(null);
  const [savingPerformance, setSavingPerformance] = useState(false);
  
  // Capacity states
  const [seats, setSeats] = useState(5);
  const [doors, setDoors] = useState(4);
  const [luggage, setLuggage] = useState(2);
  
  // Admin info states
  const [registrationCountry, setRegistrationCountry] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [fiscalPower, setFiscalPower] = useState<number | null>(null);
  const [ownerType, setOwnerType] = useState<'PARTICULAR' | 'PROFESSIONAL' | ''>('');
  const [savingAdmin, setSavingAdmin] = useState(false);
  
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(vehicleId);

  const validateVin = async () => {
    if (!vin.trim()) return;
    setVinValid(null);
    setFetchingSpecs(false);
    setSpecsFetched(false);
    
    try {
      const validateRes = await fetch(API_URL + '/vehicles/onboarding/validate-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: vin.trim().toUpperCase() }),
      });
      const validateData: { valid?: boolean } = await validateRes.json();
      const isValid = !!validateData?.valid;
      setVinValid(isValid);

      // If VIN is valid, try to fetch specs automatically
      if (isValid) {
        setFetchingSpecs(true);
        try {
          const specsRes = await fetch(API_URL + '/vehicles/onboarding/fetch-vin-specs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vin: vin.trim().toUpperCase() }),
          });
          const specsData = await specsRes.json();
          
          if (specsData && specsData.makeId && specsData.modelId && specsData.modelYear) {
            // Store all specs for later use
            setVinSpecs(specsData);
            // Pre-fill the form with fetched data
            setMakeId(specsData.makeId);
            setModelId(specsData.modelId);
            setModelYear(specsData.modelYear);
            if (specsData.trimLabel) {
              setTrimLabel(specsData.trimLabel);
            }
            // Pre-fill tech specs if available
            if (specsData.fuelType) setFuelType(specsData.fuelType);
            if (specsData.transmissionType) setTransmissionType(specsData.transmissionType);
            if (specsData.driveType) setDriveType(specsData.driveType);
            // Pre-fill performance specs if available
            if (specsData.powerKw) setPowerKw(specsData.powerKw);
            if (specsData.topSpeedKmh) setTopSpeedKmh(specsData.topSpeedKmh);
            if (specsData.zeroTo100S) setZeroTo100S(specsData.zeroTo100S);
            setSpecsFetched(true);
          }
        } catch (err) {
          // Silently fail - user can still enter manually
          console.debug('Could not fetch VIN specs:', err);
        } finally {
          setFetchingSpecs(false);
        }
      }
    } catch {
      setVinValid(false);
      setFetchingSpecs(false);
    }
  };

  const createVehicle = async () => {
    setError('');
    setCreating(true);
    const vinToUse = useVin ? vin.trim().toUpperCase() : generatePlaceholderVin();
    const payload = {
      vin: vinToUse,
      makeId,
      modelId,
      modelYear: Number(modelYear) || new Date().getFullYear(),
      ...(trimLabel.trim() ? { trimLabel: trimLabel.trim() } : {}),
    };
    try {
      const res = await apiFetch('/vehicles/onboarding/vehicle', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create vehicle');
      setCreatedId(data.id);
      setStep('tech');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const saveTechSpecs = async () => {
    if (!createdId) return;
    setError('');
    setSavingTech(true);
    try {
      await apiFetch('/vehicles/onboarding/confirm-specs', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: createdId,
          fuelType: fuelType || undefined,
          transmissionType: transmissionType || undefined,
          driveType: driveType || undefined,
          source: 'host_confirmed',
        }),
      });
      setStep('specs');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving tech specs');
    } finally {
      setSavingTech(false);
    }
  };

  const savePerformanceSpecs = async () => {
    if (!createdId) return;
    setError('');
    setSavingPerformance(true);
    try {
      await apiFetch(`/vehicles/${createdId}/performance-specs`, {
        method: 'PATCH',
        body: JSON.stringify({
          powerKw: powerKw || null,
          powerCv: powerCv || null,
          batteryKwh: batteryKwh || null,
          topSpeedKmh: topSpeedKmh || null,
          zeroTo100S: zeroTo100S || null,
        }),
      });
      setStep('capacity');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving performance specs');
    } finally {
      setSavingPerformance(false);
    }
  };

  const saveCapacitySpecs = () => {
    // Capacity specs are stored in listing, not vehicle, so just move to next step
    setStep('admin');
  };

  const saveAdminInfoAndComplete = async () => {
    if (!createdId) return;
    setError('');
    setSavingAdmin(true);
    try {
      await apiFetch(`/vehicles/${createdId}/admin-info`, {
        method: 'PATCH',
        body: JSON.stringify({
          registrationCountry: registrationCountry || null,
          licensePlate: licensePlate || null,
          fiscalPower: fiscalPower || null,
          ownerType: ownerType || null,
        }),
      });
      onComplete(createdId, seats, doors, luggage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving admin info');
      // Still complete even if admin info fails
      onComplete(createdId, seats, doors, luggage);
    } finally {
      setSavingAdmin(false);
    }
  };

  // Step 0: Choose VIN or Manual
  if (useVin === null && !vehicleId) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('step3Title')}</h2>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setUseVin(true)}
            className="flex-1 rounded-xl border-2 border-border p-4 font-medium hover:border-primary/50"
          >
            {t('step3UseVin')}
          </button>
          <button
            type="button"
            onClick={() => setUseVin(false)}
            className="flex-1 rounded-xl border-2 border-border p-4 font-medium hover:border-primary/50"
          >
            {t('step3Manual')}
          </button>
        </div>
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={onBack} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <div></div>
        </div>
      </div>
    );
  }

  // Step 1: VIN / Manual entry
  if (step === 'vin') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{useVin ? t('step3VinTitle') : t('step3ManualTitle')}</h2>
        {useVin && (
          <div>
            <label className="block text-sm font-medium">{t('vin')}</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
                placeholder="17 characters"
                maxLength={17}
                className="flex-1 rounded-lg border border-border px-3 py-2 font-mono"
              />
              <button type="button" onClick={validateVin} className="rounded-lg border border-border px-4 py-2">
                {t('validate')}
              </button>
            </div>
            {fetchingSpecs && <p className="mt-1 text-sm text-muted-foreground">{t('fetchingVinSpecs')}</p>}
            {vinValid === false && <p className="mt-1 text-sm text-red-600">{t('vinInvalid')}</p>}
            {vinValid === true && !fetchingSpecs && !specsFetched && <p className="mt-1 text-sm text-green-600">{t('vinValid')}</p>}
            {specsFetched && <p className="mt-1 text-sm text-green-600">{t('vinSpecsFetched')}</p>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <VehicleAutocomplete
              type="make"
              value={makeId}
              onChange={(id) => {
                setMakeId(id);
                setModelId('');
              }}
              placeholder={t('selectMake') || 'Rechercher une marque...'}
              label={t('make')}
              required
            />
          </div>
          <div>
            <VehicleAutocomplete
              type="model"
              value={modelId}
              onChange={setModelId}
              makeId={makeId}
              placeholder={t('selectModel') || 'Rechercher un modèle...'}
              label={t('model')}
              disabled={!makeId}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">{t('year')}</span>
            <input
              type="number"
              min={1990}
              max={new Date().getFullYear() + 1}
              value={modelYear}
              onChange={(e) => setModelYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('trim')}</span>
            <input
              type="text"
              value={trimLabel}
              onChange={(e) => setTrimLabel(e.target.value)}
              placeholder={t('trimOptional')}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('trimHelp')}</p>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={() => setUseVin(null)} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <div className="flex flex-col items-end gap-2">
            {(!makeId || !modelId || (useVin && (!vin || vin.length !== 17 || vinValid !== true))) && (
              <p className="text-xs text-red-600">
                {useVin && (!vin || vin.length !== 17 || vinValid !== true)
                  ? t('vinRequired') || 'VIN valide requis'
                  : t('makeModelRequired') || 'Constructeur et modèle requis'}
              </p>
            )}
            <button
              type="button"
              onClick={createVehicle}
              disabled={creating || !makeId || !modelId || (useVin && (!vin || vin.length !== 17 || vinValid !== true))}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? t('creating') : t('next')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Caractéristiques techniques
  if (step === 'tech') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('techSpecsTitle') || 'Caractéristiques techniques'}</h2>
        <p className="text-sm text-muted-foreground">{t('techSpecsDesc') || 'Indiquez la boite de vitesse, la motorisation et la transmission'}</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium">{t('transmissionType') || 'Boite de vitesse'}</span>
            <select
              value={transmissionType}
              onChange={(e) => setTransmissionType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">{t('select') || 'Sélectionner...'}</option>
              <option value="manual">{t('transmissionManual') || 'Manuelle'}</option>
              <option value="automatic">{t('transmissionAuto') || 'Automatique'}</option>
              <option value="semi_automatic">{t('transmissionSemiAuto') || 'Semi-automatique'}</option>
              <option value="cvt">{t('transmissionCvt') || 'CVT'}</option>
              <option value="other">{t('other') || 'Autre'}</option>
            </select>
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('fuelType') || 'Motorisation'}</span>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">{t('select') || 'Sélectionner...'}</option>
              <option value="petrol">{t('fuelPetrol') || 'Essence'}</option>
              <option value="diesel">{t('fuelDiesel') || 'Diesel'}</option>
              <option value="electric">{t('fuelElectric') || 'Électrique'}</option>
              <option value="hybrid">{t('fuelHybrid') || 'Hybride'}</option>
              <option value="lpg">{t('fuelLpg') || 'LPG'}</option>
              <option value="other">{t('other') || 'Autre'}</option>
            </select>
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('driveType') || 'Transmission'}</span>
            <select
              value={driveType}
              onChange={(e) => setDriveType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">{t('select') || 'Sélectionner...'}</option>
              <option value="fwd">{t('driveFwd') || 'Traction avant'}</option>
              <option value="rwd">{t('driveRwd') || 'Propulsion arrière'}</option>
              <option value="awd">{t('driveAwd') || 'Intégrale'}</option>
              <option value="other">{t('other') || 'Autre'}</option>
            </select>
          </label>
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={() => setStep('vin')} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={saveTechSpecs}
            disabled={savingTech}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingTech ? t('saving') || 'Enregistrement...' : t('next')}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Spécificités techniques
  if (step === 'specs') {
    const isElectric = fuelType === 'electric';
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('performanceSpecsTitle') || 'Spécificités techniques'}</h2>
        <p className="text-sm text-muted-foreground">{t('performanceSpecsDesc') || 'Indiquez la puissance, la vitesse maximum et l\'accélération'}</p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {isElectric ? (
            <label className="block">
              <span className="text-sm font-medium">{t('batteryKwh') || 'Capacité batterie (KWh)'}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={batteryKwh || ''}
                onChange={(e) => setBatteryKwh(e.target.value ? parseFloat(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                placeholder="Ex: 50"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium">{t('powerCv') || 'Puissance (CV)'}</span>
              <input
                type="number"
                min={0}
                value={powerCv || ''}
                onChange={(e) => setPowerCv(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                placeholder="Ex: 150"
              />
            </label>
          )}
          
          <label className="block">
            <span className="text-sm font-medium">{t('powerKw') || 'Puissance (kW)'} <span className="text-xs text-muted-foreground">({t('optional') || 'optionnel'})</span></span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={powerKw || ''}
              onChange={(e) => setPowerKw(e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Ex: 110"
            />
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('topSpeedKmh') || 'Vitesse maximum (km/h)'}</span>
            <input
              type="number"
              min={0}
              value={topSpeedKmh || ''}
              onChange={(e) => setTopSpeedKmh(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Ex: 200"
            />
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('zeroTo100S') || 'Accélération 0-100 (s)'}</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={zeroTo100S || ''}
              onChange={(e) => setZeroTo100S(e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Ex: 8.5"
            />
          </label>
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={() => setStep('tech')} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={savePerformanceSpecs}
            disabled={savingPerformance}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingPerformance ? t('saving') || 'Enregistrement...' : t('next')}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Capacités
  if (step === 'capacity') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('capacityTitle') || 'Capacités'}</h2>
        <p className="text-sm text-muted-foreground">{t('capacityDesc') || 'Indiquez le nombre de places, portes et la capacité du coffre'}</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium">{t('seats')}</span>
            <input
              type="number"
              min={1}
              max={9}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('doors')}</span>
            <input
              type="number"
              min={2}
              max={5}
              value={doors}
              onChange={(e) => setDoors(parseInt(e.target.value, 10) || 2)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('luggage') || 'Capacité bagage/coffre'}</span>
            <input
              type="number"
              min={0}
              value={luggage}
              onChange={(e) => setLuggage(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Nombre de valises"
            />
          </label>
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={() => setStep('specs')} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={saveCapacitySpecs}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
          >
            {t('next')}
          </button>
        </div>
      </div>
    );
  }

  // Step 5: Informations administratives
  if (step === 'admin') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('adminInfoTitle') || 'Informations administratives'}</h2>
        <p className="text-sm text-muted-foreground">{t('adminInfoDesc') || 'Indiquez les informations administratives du véhicule'}</p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">{t('registrationCountry') || 'Pays d\'immatriculation'}</span>
            <select
              value={registrationCountry}
              onChange={(e) => setRegistrationCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">{t('select') || 'Sélectionner...'}</option>
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="LU">Luxembourg</option>
              <option value="DE">Allemagne</option>
              <option value="ES">Espagne</option>
              <option value="IT">Italie</option>
              <option value="GB">Royaume-Uni</option>
            </select>
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('licensePlate') || 'Plaque d\'immatriculation'}</span>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Ex: AB-123-CD"
            />
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('fiscalPower') || 'Puissance fiscale'}</span>
            <input
              type="number"
              min={0}
              value={fiscalPower || ''}
              onChange={(e) => setFiscalPower(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              placeholder="Ex: 7"
            />
          </label>
          
          <label className="block">
            <span className="text-sm font-medium">{t('ownerType') || 'Propriétaire'}</span>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ownerType"
                  value="PARTICULAR"
                  checked={ownerType === 'PARTICULAR'}
                  onChange={(e) => setOwnerType(e.target.value as 'PARTICULAR')}
                />
                <span>{t('ownerParticular') || 'Particulier'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ownerType"
                  value="PROFESSIONAL"
                  checked={ownerType === 'PROFESSIONAL'}
                  onChange={(e) => setOwnerType(e.target.value as 'PROFESSIONAL')}
                />
                <span>{t('ownerProfessional') || 'Professionnel'}</span>
              </label>
            </div>
          </label>
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={() => setStep('capacity')} 
            className="rounded-lg border border-border px-6 py-2.5 font-medium"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={saveAdminInfoAndComplete}
            disabled={savingAdmin}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingAdmin ? t('saving') || 'Enregistrement...' : t('complete') || 'Terminer'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
