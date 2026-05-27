# FitTogether+

Réseau social sportif avec défis, badges et communauté.

## Présentation

FitTogether+ est un réseau social sportif qui combine défis, motivation entre amis, partage d'activités et progression gamifiée. Les utilisateurs peuvent relever des challenges sportifs, publier leurs entraînements sur un feed social, gagner des badges et interagir avec leur communauté.

## Membres du groupe

- **Ryan Berthoud**
- **Cyril Heimann**

## Stack technique

- **Frontend** : Ionic + Vue.js
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Mobile** : Capacitor (Android)

## Fonctionnalités principales

- Défis sportifs entre amis (course, steps, vélo, muscu...)
- Feed social : publications, photos, stats d'activité
- Likes, commentaires, interactions sociales
- Badges, trophées et gamification
- Profil utilisateur avec historique et statistiques
- Système d'amis et notifications
- Stories éphémères (24h)
- Messagerie privée

## Structure du projet

```
FitTogetherPlus/
├── docs/              # Documentation et MCD
│   └── mcd/           # Modèles conceptuels de données (Looping)
├── supabase/          # Scripts SQL pour Supabase
│   ├── 01_schema.sql  # Création de la base de données
│   └── 02_seed.sql    # Données de test
├── src/               # Code source (Ionic + Vue)
└── ...
```

## Installation

### Prérequis

- Node.js (v18+)
- npm
- Ionic CLI (`npm install -g @ionic/cli`)
- Android Studio (pour le build mobile)

### Mise en place

```bash
# Cloner le repo
git clone https://github.com/heimcyr/FitTogetherPlus.git
cd FitTogetherPlus

# Installer les dépendances
npm install

# Lancer en mode développement
ionic serve
```

### Base de données

1. Créer un projet sur [Supabase](https://supabase.com)
2. Exécuter `supabase/01_schema.sql` dans le SQL Editor
3. Exécuter `supabase/02_seed.sql` pour les données de test

### Build Android

```bash
npm run build
npx cap sync
npx cap open android
```

## Branches

- `main` : version stable, prête à être démontrée
- `develop` : version en cours de développement
- `feature/*` : branches par fonctionnalité

## Conventions de commits

```
[feat]: ajout de la page de profil
[fix]: correction du bug de login
[docs]: mise à jour du README
[style]: formatage du code
[refactor]: restructuration du composant Feed
[test]: ajout de tests unitaires
```
