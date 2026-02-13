import { SetMetadata } from '@nestjs/common';

export enum AdminPermission {
  PAYMENTS_VIEW = 'payments:view',
  PAYMENTS_REFUND = 'payments:refund',
  PAYMENTS_OVERRIDE = 'payments:override',
  PAYOUTS_VIEW = 'payouts:view',
  PAYOUTS_PROCESS = 'payouts:process',
  PAYOUTS_REVERSE = 'payouts:reverse',
  BOOKINGS_VIEW = 'bookings:view',
  BOOKINGS_APPROVE_FORCE = 'bookings:approve_force',
  BOOKINGS_OVERRIDE = 'bookings:override',
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MODIFY = 'settings:modify',
  DEPOSITS_VIEW = 'deposits:view',
  DEPOSITS_CAPTURE = 'deposits:capture',
  DEPOSITS_RELEASE = 'deposits:release',
  CLAIMS_VIEW = 'claims:view',
  CLAIMS_DECIDE = 'claims:decide',
  INSPECTIONS_VIEW = 'inspection:view',
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
