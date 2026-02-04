import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo'; // même mot de passe pour tous les comptes de test

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'mohamedsakho@drivepark.net' },
    update: { role: 'ADMIN', passwordHash },
    create: {
      email: 'mohamedsakho@drivepark.net',
      role: 'ADMIN',
      passwordHash,
    },
  });
  console.log('Admin:', admin.email);

  const host = await prisma.user.upsert({
    where: { email: 'host@example.com' },
    update: { role: 'HOST', passwordHash, firstName: 'Marie', lastName: 'Dupont' },
    create: {
      email: 'host@example.com',
      role: 'HOST',
      passwordHash,
      firstName: 'Marie',
      lastName: 'Dupont',
    },
  });
  console.log('Host (partner):', host.email);

  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: { role: 'CLIENT', passwordHash, firstName: 'Jean', lastName: 'Martin' },
    create: {
      email: 'client@example.com',
      role: 'CLIENT',
      passwordHash,
      firstName: 'Jean',
      lastName: 'Martin',
    },
  });
  console.log('Client:', client.email);

  const slug = 'citadine-paris-1';
  const listing = await prisma.listing.upsert({
    where: { slug },
    update: { status: 'ACTIVE', hostId: host.id },
    create: {
      type: 'CAR_RENTAL',
      hostId: host.id,
      title: 'Citadine centre Paris',
      slug,
      description: 'Voiture économique idéale pour la ville. Climatisation, Bluetooth.',
      status: 'ACTIVE',
      city: 'Paris',
      country: 'France',
      pricePerDay: 45,
      currency: 'EUR',
      caution: 500,
      category: 'economy',
      transmission: 'manual',
      fuelType: 'petrol',
      seats: 5,
    },
  });
  console.log('Listing ACTIVE:', listing.title, '(', listing.slug, ')');

  const slugExperience = 'balade-2cv-paris';
  const listingExperience = await prisma.listing.upsert({
    where: { slug: slugExperience },
    update: { status: 'ACTIVE', hostId: host.id },
    create: {
      type: 'MOTORIZED_EXPERIENCE',
      hostId: host.id,
      title: 'Balade en 2CV dans Paris',
      slug: slugExperience,
      description: 'Découverte de Paris en Citroën 2CV avec guide. Parcours des quais, Montmartre et monuments.',
      status: 'ACTIVE',
      city: 'Paris',
      country: 'France',
      pricePerDay: 120,
      currency: 'EUR',
      durationMinutes: 120,
      maxParticipants: 4,
    },
  });
  console.log('Listing ACTIVE (expérience):', listingExperience.title, '(', listingExperience.slug, ')');

  const slugChauffeur = 'voiture-avec-chauffeur-paris';
  const listingChauffeur = await prisma.listing.upsert({
    where: { slug: slugChauffeur },
    update: { status: 'ACTIVE', hostId: host.id, driverId: host.id },
    create: {
      type: 'CHAUFFEUR',
      hostId: host.id,
      driverId: host.id,
      title: 'Voiture avec chauffeur - Paris et région',
      slug: slugChauffeur,
      description: 'Berline confort avec chauffeur professionnel. Transferts aéroport, événements, journée sur mesure.',
      status: 'ACTIVE',
      city: 'Paris',
      country: 'France',
      pricePerDay: 250,
      currency: 'EUR',
      seats: 4,
    },
  });
  console.log('Listing ACTIVE (chauffeur):', listingChauffeur.title, '(', listingChauffeur.slug, ')');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
