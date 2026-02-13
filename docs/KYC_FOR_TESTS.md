# Configuration KYC pour les tests e2e

## Problème

Les tests e2e de création de listing échouent avec l'erreur :
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
```

Cela se produit généralement parce que le **KYC n'est pas approuvé** pour l'utilisateur host de test.

## Solution

### 1. Vérifier le statut KYC

Connectez-vous à votre base de données PostgreSQL et exécutez :

```sql
-- Vérifier le statut KYC du host de test
SELECT 
  u.email,
  u.id as user_id,
  k.id as kyc_id,
  k.status as kyc_status,
  k."verifiedAt",
  k."createdAt"
FROM "User" u
LEFT JOIN "KycVerification" k ON k."userId" = u.id
WHERE u.email = 'host@example.com';
```

### 2. Approuver le KYC si nécessaire

Si le KYC n'existe pas ou n'est pas approuvé, exécutez :

```sql
-- Créer ou mettre à jour le KYC pour le host de test
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
```

### 3. Vérifier que ça fonctionne

Après avoir approuvé le KYC, relancez les tests :

```bash
pnpm test:e2e
```

## Script automatique

Vous pouvez créer un script SQL pour automatiser cette opération :

```sql
-- scripts/approve-test-kyc.sql
-- Approuve le KYC pour tous les utilisateurs de test

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
WHERE u.email IN ('host@example.com', 'client@example.com')
ON CONFLICT ("userId") 
DO UPDATE SET 
  status = 'APPROVED',
  "verifiedAt" = NOW(),
  "updatedAt" = NOW();
```

Exécutez-le avec :

```bash
psql $DATABASE_URL -f scripts/approve-test-kyc.sql
```

## Utilisation avec Prisma Studio

Vous pouvez aussi utiliser Prisma Studio pour approuver le KYC manuellement :

```bash
pnpm db:studio
```

1. Ouvrez la table `KycVerification`
2. Trouvez l'entrée pour `host@example.com` (ou créez-en une)
3. Définissez `status` à `APPROVED`
4. Définissez `verifiedAt` à la date actuelle

## Vérification dans les tests

Les tests vérifient maintenant automatiquement le statut KYC et affichent un message d'erreur clair si le KYC n'est pas approuvé :

```
KYC verification is required before creating listings.
The host user (host@example.com) must have APPROVED KYC status.
Please ensure the test host has approved KYC before running tests.
```

## Notes

- Le KYC doit être `APPROVED` (pas `PENDING`, `PENDING_REVIEW`, ou `REJECTED`)
- Le champ `verifiedAt` doit être défini (généralement `NOW()`)
- Si vous utilisez un seed de base de données, assurez-vous qu'il crée des utilisateurs avec KYC approuvé
