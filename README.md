# DrivePark

Monorepo **TypeScript** pour DrivePark, une plateforme de location de véhicules, d'expériences motorisées et de chauffeur.

## Stack

| Couche        | Techno                    |
|---------------|---------------------------|
| Frontend Web  | Next.js 14 (React) + TypeScript, Tailwind CSS, next-intl |
| Backend API   | NestJS + TypeScript       |
| Base de données | PostgreSQL + Prisma    |
| Cache / Jobs  | Redis + BullMQ            |
| Paiements     | Stripe (PaymentIntent, caution, webhook) |
| Fichiers      | S3-compatible (presigned URLs) |
| Temps réel    | Socket.IO (chat, statut résa) |
| Geo           | PostGIS (recherche par rayon) |

## Structure

```
apps/
  api/          # NestJS — auth, users, listings, bookings, payments, messages, reviews,
                # notifications, admin, upload (S3), queue (BullMQ), events (WebSocket), stripe
  web/          # Next.js — découverte, fiches annonces, recherche, checkout, paiement Stripe,
                # Mes voyages, login, back-office admin (users, listings, audit), i18n (en/fr)
packages/
  database/     # Prisma schema + migrations (init + PostGIS)
```

## Prérequis

- Node.js ≥ 20
- pnpm 9
- Docker (optionnel, pour PostgreSQL et Redis)

## Démarrage rapide

### 1. Installer les dépendances

```bash
pnpm install
```

### 2. Base de données (Docker)

```bash
docker compose up -d
```

Puis définir l'URL dans `.env` à la racine ou dans `apps/api` :

```env
DATABASE_URL="postgresql://mobility:mobility@localhost:5432/mobility"
```

### 3. Migrations Prisma

```bash
pnpm db:generate
pnpm db:migrate
```

(Si aucune migration n'existe encore : `cd packages/database && pnpm prisma migrate dev --name init`.)

### 4. Seed de la base de données (requis pour les makes/models)

Pour peupler la base avec les constructeurs (makes) et modèles de base :

```bash
pnpm db:seed
```

**Important** : Le seed est requis pour avoir la liste des constructeurs (Renault, Peugeot, Volkswagen, BMW, Mercedes-Benz, etc.) dans le formulaire de création d'annonce. Sans seed, la liste des makes sera vide.

### 5. Libérer les ports (si besoin)

Si tu as déjà lancé l'app avant, arrête d'abord les anciens processus (Ctrl+C dans le terminal où tourne `pnpm dev`). Si les ports restent pris, exécute :

```bash
# Libérer le port de l'API (4000) et du frontend (3000, 3001, 3002)
for port in 4000 3000 3001 3002; do
  PID=$(lsof -t -i :$port 2>/dev/null)
  [ -n "$PID" ] && kill -9 $PID && echo "Port $port libéré (PID $PID)" || true
done
```

### 6. Lancer l'API et le frontend

```bash
cd /Applications/DP
pnpm dev
```

- **Frontend** : http://localhost:3000 (ou 3001 / 3002 si 3000 est pris)  
- **API** : http://localhost:4000  
- **Health API** : http://localhost:4000/health  

Variables utiles pour le frontend (optionnel) :

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
```

**Mapbox** : Pour obtenir une clé API Mapbox (gratuite jusqu'à 50k requêtes/mois) :
1. Créer un compte sur https://account.mapbox.com/
2. Aller dans "Access tokens"
3. Copier votre token par défaut ou créer un nouveau token
4. Ajouter `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` dans `.env` ou `apps/web/.env.local`

**Connexion par code (OTP)** : en dev, le code à 6 chiffres est **affiché dans le terminal de l'API** à chaque envoi (ex. `[OTP] Code for xxx@example.com: 123456`). Tu peux le copier pour te connecter sans consulter ta boîte mail. Avec `SMTP_HOST=localhost` et `SMTP_PORT=1025`, les mails sont envoyés à un serveur local type Mailhog/Mailpit (interface souvent sur http://localhost:8025) et ne partent pas vers de vraies adresses. Pour recevoir les codes sur une vraie adresse, configure un SMTP réel (Gmail, SendGrid, etc.) dans le `.env` ou dans Admin → Réglages → Clés API.

### 7. Vérifier que toutes les URLs répondent correctement

Une fois `pnpm dev` lancé, exécuter le script de vérification des routes (API + frontend) :

```bash
pnpm verify:urls
```

Si le frontend tourne sur un autre port (ex. 3001 ou 3002), indique-le :

```bash
VERIFY_WEB_URL=http://localhost:3002 pnpm verify:urls
```

Le script teste chaque URL et affiche OK/FAIL. En cas d'échec, corriger les routes avant d'ajouter des fonctionnalités. Stratégie détaillée : [docs/URL_VERIFICATION_STRATEGY.md](docs/URL_VERIFICATION_STRATEGY.md).

**Workflow états des lieux complet** (URLs + listings + tests E2E) :

```bash
pnpm db:test:reset
# Démarrer API + Web (avec .env.test pour l'API)
pnpm verify:state
```

Voir [docs/WORKFLOW_ETATS_DES_LIEUX.md](docs/WORKFLOW_ETATS_DES_LIEUX.md).

## Scripts principaux

| Commande        | Description                    |
|-----------------|--------------------------------|
| `pnpm dev`      | Lance `api` + `web` en parallèle |
| `pnpm dev:api`  | Lance uniquement l'API         |
| `pnpm dev:web`  | Lance uniquement le frontend   |
| `pnpm build`    | Build de tous les packages     |
| `pnpm db:generate` | Génère le client Prisma    |
| `pnpm db:migrate`  | Applique les migrations    |
| `pnpm db:seed`     | Peuple la base avec les makes/models de base |
| `pnpm db:studio`   | Ouvre Prisma Studio        |
| `pnpm db:test:reset` | Réinitialise la base test (migrate + seed). Utilise `.env.test` si présent avec `DATABASE_URL`, sinon `.env`. Voir [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md). |
| `pnpm verify:state` | Workflow états des lieux : `verify:urls` + `verify:listings` + `test:e2e:no-server`. Prérequis : API + Web démarrés, base test. Voir [docs/WORKFLOW_ETATS_DES_LIEUX.md](docs/WORKFLOW_ETATS_DES_LIEUX.md). |
| `pnpm test:e2e`    | Lance les tests E2E Playwright (sans démarrer le serveur ; l'API et le front doivent tourner). Prévoir une base test : `pnpm db:test:reset` puis lancer l'API avec `.env.test`. |

## Fonctionnalités implémentées

- **Client** : recherche (ville, type, **géolocalisation PostGIS**), fiches annonces, **tunnel réservation** (checkout → création résa → **paiement Stripe**), **Mes voyages** et détail résa, login avec JWT.
- **Paiements** : Stripe PaymentIntent (réservation + caution en préautorisation), capture/relâche caution, webhook, remboursement.
- **Temps réel** : WebSocket (Socket.IO) — chat par réservation, mise à jour statut résa, notifications in-app.
- **Files de jobs** : BullMQ + Redis — e-mails transactionnels (confirmation résa), notifications (nouveau message).
- **Upload** : S3-compatible (presigned URLs pour listing_photo, kyc, incident).
- **Admin** : back-office Next.js (`/admin`) — utilisateurs, modération annonces (statut), journaux d'audit (rôle ADMIN).
- **i18n** : next-intl (EN/FR).
- **PostGIS** : extension + colonne `location` sur Listing, recherche par rayon (`?lat=&lng=&radius=`), tri par distance.

Le schéma Prisma couvre : `User`, `KycVerification`, `Listing`, `Booking`, `Payment`, `Message`, `Review`, `Notification`, `AuditLog`.

## Licence

Privé / usage interne.
