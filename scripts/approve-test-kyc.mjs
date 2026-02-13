#!/usr/bin/env node
/**
 * Approuve le KYC pour les utilisateurs de test
 * Usage: pnpm exec dotenv -e .env -- node scripts/approve-test-kyc.mjs
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

const TEST_USERS = ['host@example.com', 'client@example.com'];

async function approveKycForTestUsers() {
  console.log('🔍 Vérification du statut KYC pour les utilisateurs de test...\n');

  for (const email of TEST_USERS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { kycVerifications: true },
    });

    if (!user) {
      console.log(`⚠️  Utilisateur ${email} non trouvé. Création...`);
      // Note: La création d'utilisateur nécessite un mot de passe hashé, donc on skip pour l'instant
      console.log(`   → Veuillez créer cet utilisateur manuellement ou via le seed.\n`);
      continue;
    }

    const existingKyc = user.kycVerifications?.[0];

    if (existingKyc) {
      if (existingKyc.status === 'APPROVED') {
        console.log(`✅ ${email}: KYC déjà approuvé (${existingKyc.status})`);
      } else {
        console.log(`🔄 ${email}: KYC existe mais n'est pas approuvé (${existingKyc.status}). Mise à jour...`);
        await prisma.kycVerification.update({
          where: { id: existingKyc.id },
          data: {
            status: 'APPROVED',
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log(`   → KYC approuvé avec succès!\n`);
      }
    } else {
      console.log(`➕ ${email}: Création d'un nouveau KYC approuvé...`);
      await prisma.kycVerification.create({
        data: {
          userId: user.id,
          status: 'APPROVED',
          verifiedAt: new Date(),
        },
      });
      console.log(`   → KYC créé et approuvé avec succès!\n`);
    }
  }

  // Afficher le résumé
  console.log('\n📊 Résumé du statut KYC:');
  for (const email of TEST_USERS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { kycVerifications: true },
    });

    if (user) {
      const kyc = user.kycVerifications?.[0];
      const status = kyc?.status || 'AUCUN';
      const verifiedAt = kyc?.verifiedAt ? new Date(kyc.verifiedAt).toISOString() : 'N/A';
      console.log(`   ${email}: ${status} (vérifié le: ${verifiedAt})`);
    } else {
      console.log(`   ${email}: Utilisateur non trouvé`);
    }
  }
}

approveKycForTestUsers()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
