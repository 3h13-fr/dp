'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { VehicleAutocomplete } from '@/components/host/VehicleAutocomplete';
import { PickupMethodEditor } from './field-editors/PickupMethodEditor';
import { ReturnMethodEditor } from './field-editors/ReturnMethodEditor';
import { TimeSlotsEditor } from './field-editors/TimeSlotsEditor';
import { ForbiddenDaysEditor } from './field-editors/ForbiddenDaysEditor';
import { FuelPolicyEditor } from './field-editors/FuelPolicyEditor';
import { ToggleSwitch } from './ToggleSwitch';

export type EditableListingFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'address'
  | 'select'
  | 'boolean'
  | 'pickupMethod'
  | 'returnMethod'
  | 'fuelPolicy'
  | 'timeSlots'
  | 'forbiddenDays'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'country';

type EditableListingFieldProps = {
  label: string;
  value: any;
  fieldKey: string;
  fieldType: EditableListingFieldType;
  onSave: (value: any) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  // For conditional fields
  showCondition?: boolean;
  // For address fields - callback when address is selected
  onAddressSelect?: (suggestion: AddressSuggestion) => void | Promise<void>;
  // For return method - need to know if returnMethod is 'different'
  returnMethod?: 'same' | 'different';
  // For delivery fields - need to know if deliveryAvailable is true
  deliveryAvailable?: boolean;
  // For vehicle model - need makeId
  makeId?: string;
  // For pickupMethod when keybox - keybox code
  keyboxCode?: string;
  onKeyboxCodeChange?: (code: string) => void;
};

export function EditableListingField({
  label,
  value,
  fieldKey,
  fieldType,
  onSave,
  disabled = false,
  placeholder,
  options = [],
  showCondition = true,
  onAddressSelect,
  returnMethod,
  deliveryAvailable,
  makeId,
  keyboxCode,
  onKeyboxCodeChange,
  countries = [],
  locale = 'fr',
}: EditableListingFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const t = useTranslations('hostNav');
  const tCommon = useTranslations('common');
  const tCreate = useTranslations('createListing');

  useEffect(() => {
    if (isEditing) {
      setTempValue(value);
    }
  }, [isEditing, value]);

  // Don't render if condition is not met
  if (!showCondition) {
    return null;
  }

  // Boolean: always show toggle, save on change (no Modify button)
  if (fieldType === 'boolean' && !disabled) {
    const handleToggle = async (checked: boolean) => {
      setError('');
      setSaving(true);
      try {
        await onSave(checked);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorSaving') || 'Error saving');
      } finally {
        setSaving(false);
      }
    };
    return (
      <div className="border-b border-neutral-200 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-black">{label}</p>
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={!!value}
              onChange={handleToggle}
              disabled={saving}
              showLabel={true}
              aria-label={label}
            />
            {saving && <span className="text-xs text-neutral-500">{t('saving') || tCommon('saving') || 'Saving...'}</span>}
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue(value);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving') || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    setTempValue(suggestion.address);
    if (onAddressSelect) {
      // onAddressSelect will handle saving with additional data (city, country, lat, lng)
      // We call it and wait for it to complete, then close the editor
      try {
        await onAddressSelect(suggestion);
        // Close editor after successful save
        setIsEditing(false);
      } catch (err) {
        // If save fails, keep editor open
        console.error('Failed to save address:', err);
        setError(err instanceof Error ? err.message : 'Failed to save address');
      }
    } else {
      // If no onAddressSelect, just save the address normally
      setTempValue(suggestion.address);
    }
  };

  const getDisplayValue = (): string => {
    if (value === null || value === undefined || value === '') {
      return tCreate('notSet') || 'Non défini';
    }

    switch (fieldType) {
      case 'boolean':
        return value ? (tCreate('yes') || 'Oui') : (tCreate('no') || 'Non');
      case 'pickupMethod':
        if (value === 'handover') return tCreate('pickupHandover') || 'Remise en main propre';
        if (value === 'keybox') return tCreate('pickupKeybox') || 'Boîte à clés';
        return String(value);
      case 'returnMethod':
        if (value === 'same') return tCreate('returnSame') || 'Même lieu';
        if (value === 'different') return tCreate('returnDifferent') || 'Lieu flexible';
        return String(value);
      case 'fuelPolicy':
        if (value === 'full_to_full') return tCreate('fuelFullToFull') || 'Plein/plein';
        if (value === 'full_to_empty') return tCreate('fuelFullToEmpty') || 'Plein/vide';
        if (value === 'same_level') return tCreate('fuelSameLevel') || 'Même niveau';
        return String(value);
      case 'select':
        const option = options.find((opt) => opt.value === value);
        return option ? option.label : String(value);
      case 'number':
        return typeof value === 'number' ? value.toString() : String(value);
      case 'address':
        return String(value || '');
      case 'timeSlots':
        if (Array.isArray(value) && value.length > 0) {
          return value.map((slot: { start: string; end: string }) => `${slot.start}-${slot.end}`).join(', ');
        }
        return tCreate('none') || 'Aucun';
      case 'forbiddenDays':
        if (Array.isArray(value) && value.length > 0) {
          const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
          return value.map((day: number) => tCreate(dayNames[day] as any) || dayNames[day]).join(', ');
        }
        return tCreate('none') || 'Aucun';
      default:
        return String(value);
    }
  };

  const renderEditor = () => {
    switch (fieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={tempValue || ''}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder={placeholder || label}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={tempValue ?? ''}
            onChange={(e) => setTempValue(e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder={placeholder || label}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={tempValue || ''}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            rows={3}
            placeholder={placeholder || label}
          />
        );
      case 'address':
        return (
          <AddressAutocomplete
            value={tempValue || ''}
            onChange={(address) => setTempValue(address)}
            onSelect={handleAddressSelect}
            placeholder={placeholder || label}
            className="mt-1"
          />
        );
      case 'select':
        return (
          <select
            value={tempValue || ''}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">{tCreate('selectOption') || 'Sélectionner...'}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <ToggleSwitch
            checked={!!tempValue}
            onChange={(checked) => setTempValue(checked)}
            showLabel={true}
            aria-label={label}
          />
        );
      case 'pickupMethod':
        return (
          <PickupMethodEditor
            value={tempValue}
            onChange={setTempValue}
            keyboxCode={keyboxCode}
            onKeyboxCodeChange={onKeyboxCodeChange}
          />
        );
      case 'returnMethod':
        return (
          <ReturnMethodEditor
            value={tempValue}
            onChange={setTempValue}
            returnAddress={returnMethod === 'different' ? (fieldKey.includes('returnAddress') ? tempValue : undefined) : undefined}
            onReturnAddressChange={(address) => {
              if (fieldKey.includes('returnAddress')) {
                setTempValue(address);
              }
            }}
          />
        );
      case 'fuelPolicy':
        return (
          <FuelPolicyEditor
            value={tempValue}
            onChange={setTempValue}
          />
        );
      case 'timeSlots':
        return (
          <TimeSlotsEditor
            value={tempValue || []}
            onChange={setTempValue}
          />
        );
      case 'forbiddenDays':
        return (
          <ForbiddenDaysEditor
            value={tempValue || []}
            onChange={setTempValue}
          />
        );
      case 'vehicleMake':
        return (
          <VehicleAutocomplete
            type="make"
            value={tempValue || ''}
            onChange={(id) => setTempValue(id)}
            placeholder={placeholder || label}
            label=""
            className="mt-1"
          />
        );
      case 'vehicleModel':
        return (
          <VehicleAutocomplete
            type="model"
            value={tempValue || ''}
            onChange={(id) => setTempValue(id)}
            makeId={makeId}
            placeholder={placeholder || label}
            label=""
            disabled={!makeId}
            className="mt-1"
          />
        );
      case 'country':
        const filteredCountries = countrySearch
          ? countries.filter((c) =>
              c.code.toLowerCase().includes(countrySearch.toLowerCase()) ||
              (c.name as Record<string, string>)?.[locale]?.toLowerCase().includes(countrySearch.toLowerCase())
            )
          : countries;
        return (
          <div className="relative">
            <input
              type="text"
              value={countrySearch || (tempValue ? countries.find(c => c.code === tempValue)?.name?.[locale] || tempValue : '')}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setTempValue('');
              }}
              onFocus={() => setCountrySearch(tempValue ? countries.find(c => c.code === tempValue)?.name?.[locale] || tempValue : '')}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder={placeholder || label}
            />
            {countrySearch && filteredCountries.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-xl">
                {filteredCountries.slice(0, 10).map((c) => (
                  <li
                    key={c.code}
                    onClick={() => {
                      setTempValue(c.code);
                      setCountrySearch((c.name as Record<string, string>)?.[locale] || c.code);
                    }}
                    className="cursor-pointer px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                  >
                    <div className="font-medium text-foreground">{(c.name as Record<string, string>)?.[locale] || c.code}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-between border-b border-neutral-200 py-4">
        <div>
          <p className="text-sm font-semibold text-black">{label}</p>
          <p className="mt-0.5 text-sm text-neutral-700">{getDisplayValue()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200">
      <div className={`flex items-center justify-between py-4 ${isEditing ? 'pb-2' : ''}`}>
        <div>
          <p className="text-sm font-semibold text-black">{label}</p>
          {!isEditing && <p className="mt-0.5 text-sm text-neutral-700">{getDisplayValue()}</p>}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-black underline hover:no-underline"
          >
            {t('modify') || tCommon('modify') || 'Modifier'}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="pb-4 transition-all duration-200">
          {renderEditor()}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
            >
              {saving ? t('saving') || tCommon('saving') || 'Saving...' : t('save') || tCommon('save') || 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {tCommon('cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
