#!/usr/bin/env node
/**
 * Script de diagnostic pour vérifier l'état des listings dans la base de données
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Vérification des listings...\n');

  // Compter les listings par statut
  const statusCounts = await prisma.listing.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('📊 Répartition par statut:');
  statusCounts.forEach(({ status, _count }) => {
    console.log(`  - ${status}: ${_count}`);
  });

  // Compter les listings ACTIVE avec coordonnées
  const activeWithCoords = await prisma.listing.count({
    where: {
      status: 'ACTIVE',
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  console.log(`\n✅ Listings ACTIVE avec coordonnées: ${activeWithCoords}`);

  // Compter les listings ACTIVE par type
  const byType = await prisma.listing.groupBy({
    by: ['type', 'status'],
    where: { status: 'ACTIVE' },
    _count: true,
  });

  console.log('\n📋 Listings ACTIVE par type:');
  byType.forEach(({ type, _count }) => {
    console.log(`  - ${type}: ${_count}`);
  });

  // Vérifier si la colonne location existe et est peuplée
  try {
    const locationCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Listing"
      WHERE status = 'ACTIVE' AND location IS NOT NULL
    `;
    console.log(`\n🗺️  Listings ACTIVE avec colonne location (PostGIS): ${locationCount[0]?.count || 0}`);
  } catch (error) {
    console.log('\n⚠️  Erreur lors de la vérification de la colonne location:', error.message);
    console.log('   La migration PostGIS n\'a peut-être pas été exécutée.');
  }

  // Afficher quelques exemples de listings ACTIVE
  const examples = await prisma.listing.findMany({
    where: { status: 'ACTIVE' },
    take: 5,
    select: {
      id: true,
      slug: true,
      title: true,
      displayName: true,
      type: true,
      status: true,
      latitude: true,
      longitude: true,
      city: true,
      country: true,
    },
  });

  if (examples.length > 0) {
    console.log('\n📝 Exemples de listings ACTIVE:');
    examples.forEach((listing) => {
      console.log(`  - ${listing.slug || listing.id}: ${listing.displayName || listing.title || '—'}`);
      console.log(`    Type: ${listing.type}, Ville: ${listing.city || '—'}, Coordonnées: ${listing.latitude ? `${listing.latitude}, ${listing.longitude}` : 'Aucune'}`);
    });
  } else {
    console.log('\n⚠️  Aucun listing ACTIVE trouvé !');
    console.log('   Pour que les recherches fonctionnent, vous devez avoir des listings avec status = "ACTIVE"');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
