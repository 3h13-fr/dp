import { Injectable } from '@nestjs/common';
import { normalizeForSlug } from './utils/slug.util';

export type VehicleWithMakeModel = {
  id: string;
  vin: string;
  modelYear: number;
  trimLabel: string | null;
  make: { name: string; slug: string };
  model: { name: string; slug: string };
};

/**
 * Canonical display name and slug components for SEO.
 * No variable specs in the name.
 */
@Injectable()
export class VehicleDisplayService {
  canonicalDisplayName(vehicle: VehicleWithMakeModel): string {
    const parts = [vehicle.make.name, vehicle.model.name, String(vehicle.modelYear)];
    if (vehicle.trimLabel?.trim()) {
      parts.push(vehicle.trimLabel.trim());
    }
    return parts.join(' ');
  }

  canonicalSlugComponents(vehicle: VehicleWithMakeModel): string[] {
    const parts = [
      vehicle.make.slug,
      vehicle.model.slug,
      String(vehicle.modelYear),
    ];
    if (vehicle.trimLabel?.trim()) {
      parts.push(normalizeForSlug(vehicle.trimLabel));
    }
    return parts;
  }

  /**
   * Generate a unique listing slug from vehicle + suffix (e.g. city slug or short id).
   */
  listingSlugFromVehicle(vehicle: VehicleWithMakeModel, suffix: string): string {
    const components = this.canonicalSlugComponents(vehicle);
    const base = components.join('-');
    const safeSuffix = normalizeForSlug(suffix) || 'listing';
    return `${base}-${safeSuffix}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
}
