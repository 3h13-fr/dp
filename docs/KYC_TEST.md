# Test KYC au complet

## Vue d’ensemble

Le flux KYC couvre :

1. **Côté partenaire (host)** : soumission de l’identité sur `/profil/kyc` (formulaire + upload document).
2. **Traitement** : après soumission, statut `PENDING` → OCR optionnel → `PENDING_REVIEW` (si OCR absent ou doute) ou `APPROVED` (si OCR valide).
3. **Côté admin** : liste des KYC en attente (`/admin/kyc`), détail par utilisateur, **Approuver** / **Refuser**.
4. **Propagation** : `GET /auth/me` renvoie `kycStatus` ; le dashboard host et la création d’annonce bloquent si `kycStatus !== 'APPROVED'`.

## Prérequis

- API démarrée : `pnpm run dev:api` (depuis la racine).
- Web démarré : `pnpm dev` (depuis `apps/web`).
- Base de données migrée et **seed exécuté** pour avoir un KYC en `PENDING_REVIEW` pour le host de test.

## Seed (KYC pour E2E)

Le seed crée un enregistrement KYC en **PENDING_REVIEW** pour `host@example.com` :

```bash
pnpm db:seed
```

Après le seed, le host a un KYC avec `status: 'PENDING_REVIEW'` et `reviewReason: 'DOUBTFUL'` (simulation sans OCR).

## Tests E2E (Playwright)

Fichier : `apps/web/e2e/kyc.spec.ts`.

1. **Host ouvre la page KYC** : connexion en host → `/profil/kyc` → titre « Identity verification » et formulaire ou message de statut (Pending / Pending review / Identity verified).
2. **Admin ouvre la liste KYC** : connexion en admin → `/admin/kyc` → titre « Identity review » et tableau (ou « No KYC pending »).
3. **Admin approuve → host voit « Identity verified »** : admin va sur la liste, clique « View » sur le premier KYC, puis « Approve » ; reconnexion en host → `/profil/kyc` → texte « Identity verified ».

Exécution :

```bash
cd apps/web
pnpm exec playwright test e2e/kyc.spec.ts
```

À faire avant : lancer l’API (et éventuellement le web si vous n’utilisez pas le webServer de Playwright). Pour un run complet avec seed frais :

```bash
# Terminal 1
pnpm run dev:api

# Terminal 2
pnpm db:seed   # une fois
cd apps/web && pnpm dev

# Terminal 3
cd apps/web && pnpm exec playwright test e2e/kyc.spec.ts
```

## Test manuel rapide

1. **Host** : se connecter avec `host@example.com` / `demodemo` → Menu → Profil → « Vérification d’identité » (ou aller sur `/en/profil/kyc`).  
   - Sans KYC ou rejeté : formulaire.  
   - Avec KYC en attente : « Verification in progress » ou « Pending review ».  
   - Après approbation admin : « Identity verified ».

2. **Admin** : se connecter avec `mohamedsakho@drivepark.net` / `demodemo` → Sidebar « KYC review » → liste des KYC en `PENDING_REVIEW`.  
   - Cliquer « View » sur une ligne → page détail (identité, document recto/verso).  
   - « Approve » → retour à la liste ; le host concerné a alors `kycStatus: 'APPROVED'` dans `/auth/me`.

3. **Vérifier le blocage création d’annonce** : en host, si KYC non approuvé, aller sur `/host/listings/new` → message « Action required » + lien vers la vérification KYC.

## API concernée

- `GET /kyc` : KYC de l’utilisateur connecté.
- `POST /kyc` : soumission (firstName, lastName, dateOfBirth, nationality, documentType, idDocUrl, idDocBackUrl optionnel). Nécessite upload préalable (presign S3) si vous testez avec de vrais fichiers.
- `GET /auth/me` : inclut `kycStatus` (`null` | `PENDING` | `PENDING_REVIEW` | `APPROVED` | `REJECTED`).
- Admin : `GET /admin/kyc-review`, `GET /admin/kyc/:userId`, `PATCH /admin/kyc/:userId/status` (body : `{ status: 'APPROVED' | 'REJECTED', rejectionReason?: string }`).

## Upload (soumission complète depuis l’UI)

La soumission depuis l’interface nécessite un stockage S3 configuré (`AWS_*` dans `.env`) pour le presign. Sans S3, le bouton de soumission échouera à l’étape « get upload URL ». Les tests E2E ci‑dessus ne font pas d’upload ; ils s’appuient sur le seed (KYC déjà en PENDING_REVIEW) et sur l’approbation admin.
