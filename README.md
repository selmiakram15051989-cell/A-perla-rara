# A Perla Rara - PWA Fidelisation

Application web mobile-first (PWA) de fidelisation pour un centre facialiste expert.

## Stack

- React + Vite
- Tailwind CSS v4
- Donnees locales JSON (localStorage) pour demarrage rapide
- Service worker + manifest pour mode PWA
- Import CSV via PapaParse

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

## Lancer le projet

```bash
npm install
npm run dev
```

## Verification qualite

```bash
npm run lint
npm run build
```
