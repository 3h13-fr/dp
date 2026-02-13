import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminPaymentSettingsController } from './admin-settings.controller';
import { AdminInsuranceController } from './admin-insurance.controller';
import { AdminInsuranceService } from './admin-insurance.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminMarketsController } from './admin-markets.controller';
import { AdminMarketsService } from './admin-markets.service';
import { AdminDepositsController } from './admin-deposits.controller';
import { AdminClaimsController } from './admin-claims.controller';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { KycModule } from '../kyc/kyc.module';
import { QueueModule } from '../queue/queue.module';
import { PaymentsModule } from '../payments/payments.module';
import { BookingsModule } from '../bookings/bookings.module';
import { StripeModule } from '../stripe/stripe.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [KycModule, QueueModule, PaymentsModule, BookingsModule, StripeModule, VehiclesModule],
  providers: [AdminService, AdminPaymentsService, AdminInsuranceService, AdminCategoriesService, AdminMarketsService, AdminPermissionsGuard, AdminAuditInterceptor],
  controllers: [
    AdminController,
    AdminMarketsController,
    AdminPaymentsController,
    AdminPayoutsController,
    AdminBookingsController,
    AdminPaymentSettingsController,
    AdminInsuranceController,
    AdminCategoriesController,
    AdminDepositsController,
    AdminClaimsController,
  ],
})
export class AdminModule {}
