-- Approuve le KYC pour les utilisateurs de test
-- Usage: psql $DATABASE_URL -f scripts/approve-test-kyc.sql

-- Host de test
INSERT INTO "KycVerification" (id, "userId", status, "verifiedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  u.id,
  'APPROVED',
  NOW(),
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'host@example.com'
ON CONFLICT ("userId") 
DO UPDATE SET 
  status = 'APPROVED',
  "verifiedAt" = NOW(),
  "updatedAt" = NOW();

-- Client de test (optionnel, pour les tests de réservation)
INSERT INTO "KycVerification" (id, "userId", status, "verifiedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  u.id,
  'APPROVED',
  NOW(),
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'client@example.com'
ON CONFLICT ("userId") 
DO UPDATE SET 
  status = 'APPROVED',
  "verifiedAt" = NOW(),
  "updatedAt" = NOW();

-- Afficher le résultat
SELECT 
  u.email,
  k.status as kyc_status,
  k."verifiedAt"
FROM "User" u
LEFT JOIN "KycVerification" k ON k."userId" = u.id
WHERE u.email IN ('host@example.com', 'client@example.com');
