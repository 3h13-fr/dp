'use client';

import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { PickupMethodEditor } from './field-editors/PickupMethodEditor';
import { ReturnMethodEditor } from './field-editors/ReturnMethodEditor';
import { TimeSlotsEditor } from './field-editors/TimeSlotsEditor';
import { ForbiddenDaysEditor } from './field-editors/ForbiddenDaysEditor';
import { FuelPolicyEditor } from './field-editors/FuelPolicyEditor';
import { ToggleSwitch } from './ToggleSwitch';

export type CreateListingFieldType =
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
  | 'forbiddenDays';

type CreateListingFieldProps = {
  label: string;
  value: any;
  fieldType: CreateListingFieldType;
  onChange: (value: any) => void;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  showCondition?: boolean;
  onAddressSelect?: (suggestion: AddressSuggestion) => void | Promise<void>;
  returnMethod?: 'same' | 'different';
  deliveryAvailable?: boolean;
};

export function CreateListingField({
  label,
  value,
  fieldType,
  onChange,
  placeholder,
  options = [],
  showCondition = true,
  onAddressSelect,
  returnMethod,
  deliveryAvailable,
}: CreateListingFieldProps) {
  const tCreate = useTranslations('createListing');

  if (!showCondition) {
    return null;
  }

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    onChange(suggestion.address);
    if (onAddressSelect) {
      await onAddressSelect(suggestion);
    }
  };

  const renderField = () => {
    switch (fieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder={placeholder || label}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder={placeholder || label}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            rows={3}
            placeholder={placeholder || label}
          />
        );
      case 'address':
        return (
          <AddressAutocomplete
            value={value || ''}
            onChange={(address) => onChange(address)}
            onSelect={handleAddressSelect}
            placeholder={placeholder || label}
            className="mt-1"
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
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
            checked={!!value}
            onChange={onChange}
            showLabel={true}
            aria-label={label}
          />
        );
      case 'pickupMethod':
        return (
          <PickupMethodEditor
            value={value}
            onChange={onChange}
          />
        );
      case 'returnMethod':
        return (
          <ReturnMethodEditor
            value={value}
            onChange={onChange}
            returnAddress={returnMethod === 'different' ? value : undefined}
            onReturnAddressChange={onChange}
          />
        );
      case 'fuelPolicy':
        return (
          <FuelPolicyEditor
            value={value}
            onChange={onChange}
          />
        );
      case 'timeSlots':
        return (
          <TimeSlotsEditor
            value={value || []}
            onChange={onChange}
          />
        );
      case 'forbiddenDays':
        return (
          <ForbiddenDaysEditor
            value={value || []}
            onChange={onChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-b border-neutral-200 py-4">
      <label className="block text-sm font-semibold text-black mb-2">{label}</label>
      {renderField()}
    </div>
  );
}
