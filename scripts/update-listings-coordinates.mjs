#!/usr/bin/env node

/**
 * Script pour mettre à jour les listings existants avec les coordonnées de Paris
 * si elles ne sont pas déjà définies
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Mise à jour des coordonnées des listings...');

  // Coordonnées de Paris par défaut
  const parisLat = 48.8566;
  const parisLng = 2.3522;

  // Mettre à jour tous les listings qui n'ont pas de coordonnées mais qui sont à Paris
  const result = await prisma.listing.updateMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
      city: 'Paris',
    },
    data: {
      latitude: parisLat,
      longitude: parisLng,
    },
  });

  console.log(`✅ ${result.count} listings mis à jour avec les coordonnées de Paris (${parisLat}, ${parisLng})`);

  // Afficher les listings qui n'ont toujours pas de coordonnées
  const listingsWithoutCoords = await prisma.listing.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
    },
    select: {
      id: true,
      slug: true,
      displayName: true,
      city: true,
      country: true,
    },
  });

  if (listingsWithoutCoords.length > 0) {
    console.log(`\n⚠️  ${listingsWithoutCoords.length} listings sans coordonnées:`);
    listingsWithoutCoords.forEach((l) => {
      console.log(`  - ${l.displayName || l.slug} (${l.city || 'N/A'}, ${l.country || 'N/A'})`);
    });
  } else {
    console.log('\n✅ Tous les listings ont maintenant des coordonnées');
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
