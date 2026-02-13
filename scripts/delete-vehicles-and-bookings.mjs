#!/usr/bin/env node
/**
 * Supprime tous les véhicules (CAR_RENTAL) et leurs réservations associées
 * Usage: pnpm exec dotenv -e .env -- node scripts/delete-vehicles-and-bookings.mjs
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function deleteVehiclesAndBookings() {
  console.log('🔍 Recherche des listings de type CAR_RENTAL...\n');

  // Trouver tous les listings de type CAR_RENTAL
  const carRentalListings = await prisma.listing.findMany({
    where: {
      type: 'CAR_RENTAL',
    },
    include: {
      bookings: true,
      vehicle: true,
    },
  });

  console.log(`📊 Trouvé ${carRentalListings.length} listing(s) de type CAR_RENTAL`);

  if (carRentalListings.length === 0) {
    console.log('✅ Aucun véhicule à supprimer.');
    return;
  }

  // Compter les réservations
  const totalBookings = carRentalListings.reduce((sum, listing) => sum + listing.bookings.length, 0);
  console.log(`📊 Trouvé ${totalBookings} réservation(s) associée(s)\n`);

  // Confirmation
  console.log('⚠️  ATTENTION: Cette opération va supprimer:');
  console.log(`   - ${carRentalListings.length} listing(s) de type CAR_RENTAL`);
  console.log(`   - ${totalBookings} réservation(s)`);
  console.log(`   - Les véhicules associés (si aucun autre listing ne les utilise)\n`);

  // Supprimer les réservations d'abord (à cause des contraintes de clé étrangère)
  console.log('🗑️  Suppression des réservations...');
  let deletedBookings = 0;
  for (const listing of carRentalListings) {
    if (listing.bookings.length > 0) {
      const bookingIds = listing.bookings.map((b) => b.id);
      // Supprimer les paiements associés
      await prisma.payment.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      // Supprimer les messages associés
      await prisma.message.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      // Supprimer les reviews associées
      await prisma.review.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      // Supprimer les host payouts associés
      await prisma.hostPayout.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      // Supprimer les réservations
      await prisma.booking.deleteMany({
        where: { listingId: listing.id },
      });
      deletedBookings += listing.bookings.length;
    }
  }
  console.log(`   ✅ ${deletedBookings} réservation(s) supprimée(s)\n`);

  // Supprimer les listings
  console.log('🗑️  Suppression des listings...');
  const listingIds = carRentalListings.map((l) => l.id);
  
  // Supprimer les photos associées
  await prisma.listingPhoto.deleteMany({
    where: { listingId: { in: listingIds } },
  });
  
  // Supprimer les disponibilités associées
  await prisma.listingAvailability.deleteMany({
    where: { listingId: { in: listingIds } },
  });
  
  // Supprimer les politiques d'assurance associées
  await prisma.listingInsurancePolicy.deleteMany({
    where: { listingId: { in: listingIds } },
  });
  
  // Supprimer les listings
  await prisma.listing.deleteMany({
    where: { id: { in: listingIds } },
  });
  console.log(`   ✅ ${carRentalListings.length} listing(s) supprimé(s)\n`);

  // Supprimer les véhicules orphelins (qui n'ont plus de listings)
  console.log('🗑️  Suppression des véhicules orphelins...');
  const vehicleIds = carRentalListings
    .map((l) => l.vehicleId)
    .filter((id) => id !== null);

  if (vehicleIds.length > 0) {
    // Vérifier quels véhicules n'ont plus de listings
    const vehiclesWithoutListings = await prisma.vehicle.findMany({
      where: {
        id: { in: vehicleIds },
        listings: { none: {} },
      },
    });

    if (vehiclesWithoutListings.length > 0) {
      const orphanVehicleIds = vehiclesWithoutListings.map((v) => v.id);
      
      // Supprimer les métadonnées de spécifications
      await prisma.vehicleSpecMeta.deleteMany({
        where: { vehicleId: { in: orphanVehicleIds } },
      });
      
      // Supprimer les audits de champs
      await prisma.vehicleFieldAudit.deleteMany({
        where: { vehicleId: { in: orphanVehicleIds } },
      });
      
      // Supprimer les disponibilités de véhicules
      await prisma.vehicleAvailability.deleteMany({
        where: { vehicleId: { in: orphanVehicleIds } },
      });
      
      // Supprimer les véhicules
      await prisma.vehicle.deleteMany({
        where: { id: { in: orphanVehicleIds } },
      });
      
      console.log(`   ✅ ${vehiclesWithoutListings.length} véhicule(s) orphelin(s) supprimé(s)\n`);
    } else {
      console.log('   ℹ️  Aucun véhicule orphelin trouvé\n');
    }
  } else {
    console.log('   ℹ️  Aucun véhicule associé aux listings supprimés\n');
  }

  console.log('✅ Suppression terminée avec succès!');
  console.log(`\n📊 Résumé:`);
  console.log(`   - ${deletedBookings} réservation(s) supprimée(s)`);
  console.log(`   - ${carRentalListings.length} listing(s) supprimé(s)`);
}

deleteVehiclesAndBookings()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
