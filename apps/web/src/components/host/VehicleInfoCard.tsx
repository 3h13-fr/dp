'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useLocale } from 'next-intl';

type VehicleInfo = {
  id: string;
  make: { name: string };
  model: { name: string };
  modelYear: number;
  trimLabel?: string | null;
};

type VehicleInfoCardProps = {
  listingId: string;
  vehicle?: VehicleInfo | null;
  vehicleId?: string | null;
  listingType: string;
  status: string;
  onEdit?: () => void;
};

export function VehicleInfoCard({ listingId, vehicle, vehicleId, listingType, status, onEdit }: VehicleInfoCardProps) {
  const t = useTranslations('hostNav');
  const tCreate = useTranslations('createListing');
  const locale = useLocale();
  const [isActive, setIsActive] = useState(status === 'ACTIVE');
  const [updating, setUpdating] = useState(false);

  const handleToggleActive = async () => {
    setUpdating(true);
    try {
      const newStatus = isActive ? 'SUSPENDED' : 'ACTIVE';
      const res = await apiFetch(`/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setIsActive(!isActive);
        // Trigger page refresh to update status display
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getListingTypeBadge = () => {
    if (listingType === 'CAR_RENTAL') {
      return { label: t('locationAlone'), color: 'bg-blue-100 text-blue-800' };
    }
    if (listingType === 'CHAUFFEUR') {
      return { label: t('locationWithDriver'), color: 'bg-green-100 text-green-800' };
    }
    if (listingType === 'MOTORIZED_EXPERIENCE') {
      return { label: t('experiences'), color: 'bg-purple-100 text-purple-800' };
    }
    return null;
  };

  if (!vehicle && !vehicleId) {
    return null; // Pas de véhicule associé
  }

  const badge = getListingTypeBadge();

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">{t('vehicleInfo') || 'Informations du véhicule'}</h2>
            {badge && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>

          {vehicle ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{tCreate('make') || 'Constructeur'}:</span>
                <span className="text-sm">{vehicle.make.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{tCreate('model') || 'Modèle'}:</span>
                <span className="text-sm">{vehicle.model.name}</span>
              </div>
              {vehicle.trimLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{tCreate('trim') || 'Finition'}:</span>
                  <span className="text-sm">{vehicle.trimLabel}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{tCreate('year') || 'Année'}:</span>
                <span className="text-sm">{vehicle.modelYear}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noVehicleInfo') || 'Aucune information de véhicule disponible'}</p>
          )}

          {onEdit && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onEdit}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('editVehicleInfo') || 'Modifier les informations'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('status')}:</span>
            <span className={`text-sm font-medium ${
              status === 'ACTIVE' ? 'text-green-600' :
              status === 'DRAFT' ? 'text-gray-600' :
              status === 'PENDING' ? 'text-amber-600' :
              'text-red-600'
            }`}>
              {status}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!isActive}
              onChange={handleToggleActive}
              disabled={updating}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm font-medium">{t('setOff') || 'Mettre l\'annonce en OFF'}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
