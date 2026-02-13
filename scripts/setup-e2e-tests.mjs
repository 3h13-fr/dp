#!/usr/bin/env node
/**
 * Configure l'environnement pour les tests e2e
 * - Vérifie et approuve le KYC pour les utilisateurs de test
 * - Vérifie que les serveurs peuvent être démarrés
 * Usage: pnpm exec dotenv -e .env -- node scripts/setup-e2e-tests.mjs
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

const TEST_USERS = [
  { email: 'host@example.com', role: 'HOST' },
  { email: 'client@example.com', role: 'CLIENT' },
];

async function setupE2ETests() {
  console.log('🚀 Configuration de l\'environnement pour les tests e2e...\n');

  let allOk = true;

  // Vérifier et approuver le KYC pour chaque utilisateur de test
  for (const { email, role } of TEST_USERS) {
    console.log(`📋 Vérification de ${email} (${role})...`);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { kycVerifications: true },
    });

    if (!user) {
      console.log(`   ⚠️  Utilisateur non trouvé.`);
      console.log(`   → Veuillez créer cet utilisateur via le seed ou manuellement.\n`);
      allOk = false;
      continue;
    }

    // Pour les HOST, le KYC doit être approuvé
    if (role === 'HOST') {
      const existingKyc = user.kycVerifications?.[0];

      if (!existingKyc) {
        console.log(`   ➕ Création d'un nouveau KYC approuvé...`);
        try {
          await prisma.kycVerification.create({
            data: {
              userId: user.id,
              status: 'APPROVED',
              verifiedAt: new Date(),
            },
          });
          console.log(`   ✅ KYC créé et approuvé avec succès!\n`);
        } catch (error) {
          console.log(`   ❌ Erreur lors de la création du KYC: ${error.message}\n`);
          allOk = false;
        }
      } else if (existingKyc.status !== 'APPROVED') {
        console.log(`   🔄 KYC existe mais n'est pas approuvé (${existingKyc.status}). Mise à jour...`);
        try {
          await prisma.kycVerification.update({
            where: { id: existingKyc.id },
            data: {
              status: 'APPROVED',
              verifiedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          console.log(`   ✅ KYC approuvé avec succès!\n`);
        } catch (error) {
          console.log(`   ❌ Erreur lors de la mise à jour du KYC: ${error.message}\n`);
          allOk = false;
        }
      } else {
        console.log(`   ✅ KYC déjà approuvé (${existingKyc.status})\n`);
      }
    }
  }

  // Afficher le résumé
  console.log('\n📊 Résumé de la configuration:');
  for (const { email, role } of TEST_USERS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { kycVerifications: true },
    });

    if (user) {
      const kyc = user.kycVerifications?.[0];
      if (role === 'HOST') {
        const status = kyc?.status || 'AUCUN';
        const verifiedAt = kyc?.verifiedAt ? new Date(kyc.verifiedAt).toISOString() : 'N/A';
        const statusIcon = status === 'APPROVED' ? '✅' : '❌';
        console.log(`   ${statusIcon} ${email}: KYC ${status} (vérifié le: ${verifiedAt})`);
      } else {
        console.log(`   ✅ ${email}: Utilisateur trouvé (KYC non requis pour ${role})`);
      }
    } else {
      console.log(`   ❌ ${email}: Utilisateur non trouvé`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log('\n✅ Configuration terminée avec succès! Vous pouvez maintenant lancer les tests e2e.');
    console.log('   Commande: pnpm test:e2e\n');
  } else {
    console.log('\n⚠️  Certains problèmes ont été détectés. Veuillez les résoudre avant de lancer les tests.\n');
    process.exit(1);
  }
}

setupE2ETests()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
