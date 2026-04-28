# Architecture technique

## Stack

| Composant | Technologie |
|-----------|-------------|
| Framework frontend | Ionic 8 + Vue.js 3 |
| Langage | TypeScript |
| Backend / BDD | Supabase (PostgreSQL) |
| Authentification | Supabase Auth |
| Stockage fichiers | Supabase Storage |
| Build mobile | Capacitor (Android) |

## Structure du projet

```
FitTogetherPlus/
├── public/                  # Fichiers statiques
├── src/
│   ├── components/          # Composants réutilisables
│   ├── views/               # Pages de l'application
│   ├── router/              # Configuration des routes
│   ├── stores/              # State management
│   ├── services/            # Logique métier et appels Supabase
│   ├── composables/         # Composables Vue (hooks)
│   ├── types/               # Interfaces TypeScript
│   └── assets/              # Images, icônes, etc.
├── supabase/                # Scripts SQL
│   ├── 01_schema.sql        # Schéma complet de la BDD
│   └── 02_seed.sql          # Données de test
├── docs/                    # Documentation et MCD
│   └── mcd/                 # Fichiers Looping (.loo)
└── android/                 # Projet Android (Capacitor)
```

## Base de données

La base de données est gérée par Supabase (PostgreSQL). Elle contient **17 tables** :

- `utilisateur` - Profils utilisateurs (lié à `auth.users`)
- `badge` - Badges disponibles
- `badge_obtenu` - Badges obtenus par les utilisateurs
- `defi` - Défis sportifs
- `participation_defi` - Participations aux défis
- `story` - Stories éphémères (24h)
- `vue_story` - Vues des stories
- `amitie` - Relations d'amitié
- `conversation` - Conversations de messagerie
- `participe_conversation` - Participants aux conversations
- `message` - Messages
- `entrainement` - Entraînements enregistrés
- `notification` - Notifications
- `historique_pas` - Historique quotidien des pas
- `publication` - Publications du feed
- `reaction` - Réactions aux publications
- `commentaire` - Commentaires sur les publications

## Sécurité

- **Row Level Security (RLS)** activée sur toutes les tables
- Authentification via **Supabase Auth** (email/password)
- Les politiques RLS utilisent `auth.uid()` pour filtrer les données
- Le trigger `handle_new_user()` crée automatiquement le profil à l'inscription

## Stratégie de branches Git

```
main ← develop ← feature/*
```

- `main` : version stable
- `develop` : développement en cours
- `feature/*` : branches par fonctionnalité (merge dans develop via PR)
