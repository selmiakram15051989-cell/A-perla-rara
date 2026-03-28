# A Perla Rara - Application mobile iOS & Android

Application de fidelisation pour un centre facialiste expert, developpee en React et packagee en application native iOS/Android avec Capacitor.

## Stack

- React + Vite
- Tailwind CSS v4
- Donnees locales JSON (localStorage) pour demarrage rapide
- Service worker + manifest pour mode PWA
- Import CSV via PapaParse
- Capacitor pour generation d'apps mobiles natives iOS/Android

## Fonctionnalites livrees

### Authentification

- Role `ADMIN` (gerante): acces total au dashboard.
- Role `USER` (client): acces a son propre espace client.

### Interface ADMIN

- CRUD complet Clients
- CRUD complet Soins
- Module "Ajouter une visite":
  - selection client + soin
  - enregistrement visite
  - incrementation automatique visites + points client
- Import CSV Clients et Soins:
  - mapping de colonnes automatique (aliases FR/EN)
- Configuration:
  - remise anniversaire (%)
  - URL de reservation externe
- Gestion des acces depuis l'UI:
  - creation utilisateurs
  - edition role et lien client
  - invitations clients (simulation acceptation)

### Interface CLIENT (mobile first)

- Carte de fidelite digitale
- Barre de progression vers le prochain palier
- Historique des soins recus
- Catalogue des soins actifs
- Bouton "Reserver" (lien externe)
- Affichage remise anniversaire automatique (jour J)

## Theme design

- Esprit luxe epure
- Palette beige/dore:
  - `#E8DDD1`
  - `#C4A77D`
- Titres en Serif (`Playfair Display` fallback `Times New Roman`)

## Comptes demo

- ADMIN
  - Email: `admin@aperlarara.com`
  - Mot de passe: `admin123`
- CLIENT
  - Email: `camille@example.com`
  - Mot de passe: `client123`

## Lancer le projet (web)

```bash
npm install
npm run dev
```

## Build mobile (iOS / Android)

1. Generer le build web et synchroniser les plateformes natives:

```bash
npm run mobile:build
```

2. Ouvrir Android Studio:

```bash
npm run mobile:android
```

3. Ouvrir Xcode (macOS requis):

```bash
npm run mobile:ios
```

Les dossiers natifs sont deja inclus dans ce repo:

- `android/`
- `ios/`

## Verification qualite

```bash
npm run lint
npm run build
```

## Reponse courte pour l'hebergeur / partenaire technique

- Application frontend: **JavaScript (React)**
- Packaging mobile: **Capacitor (iOS + Android natif)**
- Resultat: **application compatible iPhone et Android**
