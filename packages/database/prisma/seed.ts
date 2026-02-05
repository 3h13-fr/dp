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

  // ——— Geo (source of truth for SEO) ———
  const france = await prisma.country.upsert({
    where: { code: 'FR' },
    update: {},
    create: {
      code: 'FR',
      slug: 'france',
      name: { en: 'France', fr: 'France' },
    },
  });
  const paris = await prisma.city.upsert({
    where: { countryId_slug: { countryId: france.id, slug: 'paris' } },
    update: { seoPriority: 1 },
    create: {
      countryId: france.id,
      slug: 'paris',
      name: { en: 'Paris', fr: 'Paris' },
      latitude: 48.8566,
      longitude: 2.3522,
      seoPriority: 1,
    },
  });
  console.log('Geo: France, Paris (seoPriority=1)');

  // ——— Vehicle Identity (makes/models seed) ———
  const makesData = [
    { name: 'Renault', slug: 'renault' },
    { name: 'Peugeot', slug: 'peugeot' },
    { name: 'Citroën', slug: 'citroen' },
    { name: 'Volkswagen', slug: 'volkswagen' },
    { name: 'BMW', slug: 'bmw' },
    { name: 'Mercedes-Benz', slug: 'mercedes-benz' },
  ];
  const makes: { id: string; name: string; slug: string }[] = [];
  for (const m of makesData) {
    const make = await prisma.make.upsert({
      where: { slug: m.slug },
      update: {},
      create: { name: m.name, slug: m.slug, status: 'verified' },
    });
    makes.push(make);
  }
  const renault = makes.find((m) => m.slug === 'renault')!;
  const volkswagen = makes.find((m) => m.slug === 'volkswagen')!;
  await prisma.makeAlias.upsert({
    where: {
      makeId_normalizedAlias: { makeId: volkswagen.id, normalizedAlias: 'vw' },
    },
    update: {},
    create: { makeId: volkswagen.id, alias: 'VW', normalizedAlias: 'vw' },
  });
  const clio = await prisma.model.upsert({
    where: { makeId_slug: { makeId: renault.id, slug: 'clio' } },
    update: {},
    create: { makeId: renault.id, name: 'Clio', slug: 'clio', status: 'verified' },
  });
  const peugeot = makes.find((m) => m.slug === 'peugeot')!;
  const bmw = makes.find((m) => m.slug === 'bmw')!;
  const mercedes = makes.find((m) => m.slug === 'mercedes-benz')!;
  const model5008 = await prisma.model.upsert({
    where: { makeId_slug: { makeId: peugeot.id, slug: '5008' } },
    update: {},
    create: { makeId: peugeot.id, name: '5008', slug: '5008', status: 'verified' },
  });
  const model508 = await prisma.model.upsert({
    where: { makeId_slug: { makeId: peugeot.id, slug: '508' } },
    update: {},
    create: { makeId: peugeot.id, name: '508', slug: '508', status: 'verified' },
  });
  const modelZoe = await prisma.model.upsert({
    where: { makeId_slug: { makeId: renault.id, slug: 'zoe' } },
    update: {},
    create: { makeId: renault.id, name: 'Zoe', slug: 'zoe', status: 'verified' },
  });
  const modelSerie3 = await prisma.model.upsert({
    where: { makeId_slug: { makeId: bmw.id, slug: 'serie-3' } },
    update: {},
    create: { makeId: bmw.id, name: 'Série 3', slug: 'serie-3', status: 'verified' },
  });
  const modelSerie5 = await prisma.model.upsert({
    where: { makeId_slug: { makeId: bmw.id, slug: 'serie-5' } },
    update: {},
    create: { makeId: bmw.id, name: 'Série 5', slug: 'serie-5', status: 'verified' },
  });
  const modelClasseE = await prisma.model.upsert({
    where: { makeId_slug: { makeId: mercedes.id, slug: 'classe-e' } },
    update: {},
    create: { makeId: mercedes.id, name: 'Classe E', slug: 'classe-e', status: 'verified' },
  });
  const modelClasseS = await prisma.model.upsert({
    where: { makeId_slug: { makeId: mercedes.id, slug: 'classe-s' } },
    update: {},
    create: { makeId: mercedes.id, name: 'Classe S', slug: 'classe-s', status: 'verified' },
  });
  const golfModel = await prisma.model.upsert({
    where: { makeId_slug: { makeId: volkswagen.id, slug: 'golf' } },
    update: {},
    create: { makeId: volkswagen.id, name: 'Golf', slug: 'golf', status: 'verified' },
  });
  console.log('Vehicle Identity: makes/models seeded');

  // ——— 4 listings voitures (Vehicle Identity : vehicleId + displayName) ———
  // Helper: update existing listing by old slug to new vehicle-based slug, or create
  async function upsertCarListing(
    oldSlug: string,
    newSlug: string,
    vehicleId: string,
    displayName: string,
    data: {
      description: string;
      pricePerDay: number;
      category: string;
      transmission: string;
      fuelType: string;
      seats: number;
      doors: number;
      luggage: number;
    },
  ) {
    const existing = await prisma.listing.findFirst({ where: { slug: oldSlug } });
    const payload = {
      type: 'CAR_RENTAL' as const,
      hostId: host.id,
      title: null,
      displayName,
      slug: newSlug,
      description: data.description,
      status: 'ACTIVE' as const,
      vehicleId,
      cityId: paris.id,
      city: 'Paris',
      country: 'France',
      pricePerDay: data.pricePerDay,
      currency: 'EUR',
      caution: 500,
      category: data.category,
      transmission: data.transmission,
      fuelType: data.fuelType,
      seats: data.seats,
      doors: data.doors,
      luggage: data.luggage,
    };
    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: { ...payload, slug: newSlug },
      });
    } else {
      const byNew = await prisma.listing.findUnique({ where: { slug: newSlug } });
      if (!byNew) {
        await prisma.listing.create({ data: payload });
      } else {
        await prisma.listing.update({
          where: { id: byNew.id },
          data: payload,
        });
      }
    }
  }

  async function upsertRideListing(
    oldSlug: string,
    newSlug: string,
    vehicleId: string,
    displayName: string,
    data: {
      description: string;
      pricePerDay: number;
      seats: number;
      doors?: number;
      luggage?: number;
    },
  ) {
    const existing = await prisma.listing.findFirst({ where: { slug: oldSlug } });
    const payload = {
      type: 'CHAUFFEUR' as const,
      hostId: host.id,
      driverId: host.id,
      title: null,
      displayName,
      slug: newSlug,
      description: data.description,
      status: 'ACTIVE' as const,
      vehicleId,
      cityId: paris.id,
      city: 'Paris',
      country: 'France',
      pricePerDay: data.pricePerDay,
      currency: 'EUR',
      seats: data.seats,
      doors: data.doors ?? 4,
      luggage: data.luggage ?? 3,
    };
    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: { ...payload, slug: newSlug },
      });
    } else {
      const byNew = await prisma.listing.findUnique({ where: { slug: newSlug } });
      if (!byNew) {
        await prisma.listing.create({ data: payload });
      } else {
        await prisma.listing.update({
          where: { id: byNew.id },
          data: payload,
        });
      }
    }
  }

  const vehicleClio = await prisma.vehicle.upsert({
    where: { vin: 'VF1RFA00065345601' },
    update: {},
    create: {
      vin: 'VF1RFA00065345601',
      makeId: renault.id,
      modelId: clio.id,
      modelYear: 2019,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'manual',
      driveType: 'fwd',
      powerKw: 66,
      topSpeedKmh: 185,
      zeroTo100S: 12.2,
    },
  });
  await upsertCarListing(
    'citadine-paris-1',
    'renault-clio-2019-paris',
    vehicleClio.id,
    'Renault Clio 2019',
    {
      description: 'Voiture économique idéale pour la ville. Climatisation, Bluetooth.',
      pricePerDay: 45,
      category: 'economy',
      transmission: 'manual',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (vehicle): Renault Clio 2019');

  const vehicle5008 = await prisma.vehicle.upsert({
    where: { vin: 'VR3UHZKX2NM123401' },
    update: {},
    create: {
      vin: 'VR3UHZKX2NM123401',
      makeId: peugeot.id,
      modelId: model5008.id,
      modelYear: 2021,
      trimLabel: null,
      fuelType: 'diesel',
      transmissionType: 'automatic',
      driveType: 'fwd',
      powerKw: 96,
      topSpeedKmh: 205,
      zeroTo100S: 11.2,
    },
  });
  await upsertCarListing(
    'suv-famille-paris',
    'peugeot-5008-2021-paris',
    vehicle5008.id,
    'Peugeot 5008 2021',
    {
      description: 'Grand SUV pour famille ou groupe. Climatisation, coffre spacieux.',
      pricePerDay: 85,
      category: 'suv',
      transmission: 'automatic',
      fuelType: 'diesel',
      seats: 7,
      doors: 5,
      luggage: 4,
    },
  );
  console.log('Listing ACTIVE (vehicle): Peugeot 5008 2021');

  const vehicleZoe = await prisma.vehicle.upsert({
    where: { vin: 'VF1ZOE20220000001' },
    update: {},
    create: {
      vin: 'VF1ZOE20220000001',
      makeId: renault.id,
      modelId: modelZoe.id,
      modelYear: 2022,
      trimLabel: null,
      fuelType: 'electric',
      transmissionType: 'automatic',
      driveType: 'fwd',
      powerKw: 100,
      topSpeedKmh: 140,
      zeroTo100S: 9.5,
    },
  });
  await upsertCarListing(
    'compacte-electrique-paris',
    'renault-zoe-2022-paris',
    vehicleZoe.id,
    'Renault Zoe 2022',
    {
      description: 'Véhicule électrique en centre-ville. Idéal pour petits trajets.',
      pricePerDay: 55,
      category: 'economy',
      transmission: 'automatic',
      fuelType: 'electric',
      seats: 4,
      doors: 4,
      luggage: 2,
    },
  );
  console.log('Listing ACTIVE (vehicle): Renault Zoe 2022');

  const vehicleSerie3 = await prisma.vehicle.upsert({
    where: { vin: 'WBA3B1C50EK123401' },
    update: {},
    create: {
      vin: 'WBA3B1C50EK123401',
      makeId: bmw.id,
      modelId: modelSerie3.id,
      modelYear: 2020,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'automatic',
      driveType: 'rwd',
      powerKw: 135,
      topSpeedKmh: 250,
      zeroTo100S: 6.2,
    },
  });
  await upsertCarListing(
    'berline-confort-paris',
    'bmw-serie-3-2020-paris',
    vehicleSerie3.id,
    'BMW Série 3 2020',
    {
      description: 'Berline récente, climatisation, régulateur. Idéal longue distance.',
      pricePerDay: 65,
      category: 'luxury',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (vehicle): BMW Série 3 2020');

  const vehicleGolf = await prisma.vehicle.upsert({
    where: { vin: 'WVWZZZ3CZWE123456' },
    update: {},
    create: {
      vin: 'WVWZZZ3CZWE123456',
      makeId: volkswagen.id,
      modelId: golfModel.id,
      modelYear: 2020,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'manual',
      driveType: 'fwd',
      powerKw: 81,
      topSpeedKmh: 200,
      zeroTo100S: 9.2,
    },
  });
  await prisma.listing.upsert({
    where: { slug: 'volkswagen-golf-2020-paris' },
    update: { status: 'ACTIVE', hostId: host.id, cityId: paris.id, vehicleId: vehicleGolf.id },
    create: {
      type: 'CAR_RENTAL',
      hostId: host.id,
      title: null,
      displayName: 'Volkswagen Golf 2020',
      slug: 'volkswagen-golf-2020-paris',
      description: 'Golf 1.5 TSI en location. Économique et agréable.',
      status: 'ACTIVE',
      vehicleId: vehicleGolf.id,
      cityId: paris.id,
      city: 'Paris',
      country: 'France',
      pricePerDay: 52,
      currency: 'EUR',
      caution: 600,
      category: 'economy',
      transmission: 'manual',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 3,
    },
  });
  console.log('Listing ACTIVE (vehicle): Volkswagen Golf 2020');

  // ——— Véhicules ride (CHAUFFEUR) ———
  const vehicleSerie5Ride = await prisma.vehicle.upsert({
    where: { vin: 'WBA5E1C50L123402' },
    update: {},
    create: {
      vin: 'WBA5E1C50L123402',
      makeId: bmw.id,
      modelId: modelSerie5.id,
      modelYear: 2020,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'automatic',
      driveType: 'rwd',
      powerKw: 185,
      topSpeedKmh: 250,
      zeroTo100S: 6.1,
    },
  });
  const vehicleClasseERide = await prisma.vehicle.upsert({
    where: { vin: 'WDD2130421A123403' },
    update: {},
    create: {
      vin: 'WDD2130421A123403',
      makeId: mercedes.id,
      modelId: modelClasseE.id,
      modelYear: 2021,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'automatic',
      driveType: 'rwd',
      powerKw: 220,
      topSpeedKmh: 250,
      zeroTo100S: 5.9,
    },
  });
  const vehicleClasseSRide = await prisma.vehicle.upsert({
    where: { vin: 'WDD2221231B123404' },
    update: {},
    create: {
      vin: 'WDD2221231B123404',
      makeId: mercedes.id,
      modelId: modelClasseS.id,
      modelYear: 2022,
      trimLabel: null,
      fuelType: 'petrol',
      transmissionType: 'automatic',
      driveType: 'rwd',
      powerKw: 270,
      topSpeedKmh: 250,
      zeroTo100S: 5.0,
    },
  });
  const vehicle508Ride = await prisma.vehicle.upsert({
    where: { vin: 'VR3UHZKX2NM123405' },
    update: {},
    create: {
      vin: 'VR3UHZKX2NM123405',
      makeId: peugeot.id,
      modelId: model508.id,
      modelYear: 2021,
      trimLabel: null,
      fuelType: 'diesel',
      transmissionType: 'automatic',
      driveType: 'fwd',
      powerKw: 130,
      topSpeedKmh: 230,
      zeroTo100S: 8.9,
    },
  });

  await upsertRideListing(
    'voiture-avec-chauffeur-paris',
    'mercedes-classe-e-2021-paris',
    vehicleClasseERide.id,
    'Mercedes-Benz Classe E 2021',
    {
      description: 'Berline confort avec chauffeur professionnel. Transferts aéroport, événements, journée sur mesure.',
      pricePerDay: 250,
      seats: 4,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (ride): Mercedes-Benz Classe E 2021');

  await upsertRideListing(
    'transfert-aeroport-cdg',
    'bmw-serie-5-2020-transfert-cdg',
    vehicleSerie5Ride.id,
    'BMW Série 5 2020',
    {
      description: 'Transfert privé CDG ↔ Paris. Berline ou van selon nombre de passagers.',
      pricePerDay: 90,
      seats: 4,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (ride): BMW Série 5 2020 - Transfert CDG');

  await upsertRideListing(
    'mariage-events-paris',
    'mercedes-classe-s-2022-mariage-events',
    vehicleClasseSRide.id,
    'Mercedes-Benz Classe S 2022',
    {
      description: 'Voiture de prestige pour mariage, gala ou événement. Disponible journée ou soirée.',
      pricePerDay: 350,
      seats: 4,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (ride): Mercedes-Benz Classe S 2022 - Mariage & événements');

  await upsertRideListing(
    'navette-affaires-paris',
    'peugeot-508-2021-navette-affaires',
    vehicle508Ride.id,
    'Peugeot 508 2021',
    {
      description: 'Navette professionnelle pour déplacements d\'affaires. Ponctualité garantie.',
      pricePerDay: 180,
      seats: 3,
      doors: 4,
      luggage: 3,
    },
  );
  console.log('Listing ACTIVE (ride): Peugeot 508 2021 - Navette affaires');

  // Photo placeholder pour les annonces véhicules (CAR_RENTAL + CHAUFFEUR)
  const PLACEHOLDER_PHOTO = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800';
  const vehicleListings = await prisma.listing.findMany({
    where: {
      hostId: host.id,
      vehicleId: { not: null },
      type: { in: ['CAR_RENTAL', 'CHAUFFEUR'] },
    },
    include: { photos: true },
  });
  for (const l of vehicleListings) {
    if (l.photos.length === 0) {
      await prisma.listingPhoto.create({
        data: { listingId: l.id, url: PLACEHOLDER_PHOTO, order: 0 },
      });
    }
  }
  console.log('Vehicle listings: placeholder photos added');

  const slugExperience = 'balade-2cv-paris';
  const listingExperience = await prisma.listing.upsert({
    where: { slug: slugExperience },
    update: { status: 'ACTIVE', hostId: host.id, cityId: paris.id },
    create: {
      type: 'MOTORIZED_EXPERIENCE',
      hostId: host.id,
      title: 'Balade en 2CV dans Paris',
      slug: slugExperience,
      description: 'Découverte de Paris en Citroën 2CV avec guide. Parcours des quais, Montmartre et monuments.',
      status: 'ACTIVE',
      cityId: paris.id,
      city: 'Paris',
      country: 'France',
      pricePerDay: 120,
      currency: 'EUR',
      durationMinutes: 120,
      maxParticipants: 4,
    },
  });
  console.log('Listing ACTIVE (expérience):', listingExperience.title, '(', listingExperience.slug, ')');

  // ——— 3 more experiences (MOTORIZED_EXPERIENCE) ———
  const experiences = [
    { slug: 'scooter-tour-paris', title: 'Tour de Paris en scooter', description: 'Visite des incontournables en scooter 125cc. Casque fourni, parcours 2h.', pricePerDay: 75, durationMinutes: 120, maxParticipants: 2 },
    { slug: 'conduite-sportive-circuit', title: 'Conduite sportive sur circuit', description: 'Session pilotage sur circuit privé. Voiture sport, moniteur pro.', pricePerDay: 199, durationMinutes: 90, maxParticipants: 1 },
    { slug: 'road-trip-vignobles', title: 'Road trip vignobles Île-de-France', description: 'Journée en cabriolet à la découverte des vignobles. Déjeuner inclus.', pricePerDay: 180, durationMinutes: 480, maxParticipants: 4 },
  ];
  for (const exp of experiences) {
    await prisma.listing.upsert({
      where: { slug: exp.slug },
      update: { status: 'ACTIVE', hostId: host.id, cityId: paris.id },
      create: {
        type: 'MOTORIZED_EXPERIENCE',
        hostId: host.id,
        title: exp.title,
        slug: exp.slug,
        description: exp.description,
        status: 'ACTIVE',
        cityId: paris.id,
        city: 'Paris',
        country: 'France',
        pricePerDay: exp.pricePerDay,
        currency: 'EUR',
        durationMinutes: exp.durationMinutes,
        maxParticipants: exp.maxParticipants,
      },
    });
    console.log('Listing ACTIVE (expérience):', exp.title);
  }

}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
