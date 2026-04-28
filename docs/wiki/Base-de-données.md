# Base de données

## Modèle Conceptuel de Données (MCD)

Le MCD est disponible au format Looping dans `docs/mcd/MCDFittogether+Version finale.loo`.

### Entités (17 tables)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `utilisateur` | Profil utilisateur | `id` → `auth.users(id)` |
| `badge` | Badges disponibles | - |
| `badge_obtenu` | Attribution des badges | `id_utilisateur`, `id_badge` |
| `defi` | Défis sportifs | `id_utilisateur` (créateur) |
| `participation_defi` | Participations aux défis | `id_utilisateur`, `id_defi` |
| `story` | Stories éphémères | `id_utilisateur` |
| `vue_story` | Vues des stories | `id_utilisateur`, `id_story` |
| `amitie` | Relations d'amitié | `id_demandeur`, `id_receveur` |
| `conversation` | Conversations | - |
| `participe_conversation` | Membres d'une conversation | `id_utilisateur`, `id_conversation` |
| `message` | Messages | `id_utilisateur`, `id_conversation` |
| `entrainement` | Entraînements | `id_utilisateur` |
| `notification` | Notifications | `id_utilisateur` |
| `historique_pas` | Pas quotidiens | `id_utilisateur` |
| `publication` | Publications feed | `id_utilisateur`, `id_entrainement`, `id_publication_originale` |
| `reaction` | Réactions | `id_utilisateur`, `id_publication` |
| `commentaire` | Commentaires | `id_utilisateur`, `id_publication` |

### Relations principales

- **Utilisateur ↔ Auth** : `utilisateur.id` = `auth.users.id` (trigger automatique à l'inscription)
- **Amitié** : relation réflexive (demandeur ↔ receveur) avec statuts : `en_attente`, `acceptee`, `refusee`, `bloquee`
- **Publication** : peut être liée à un entraînement et/ou être un partage d'une autre publication
- **Réaction** : 4 types possibles : `like`, `bravo`, `force`, `feu`

## Fonctions et triggers

| Fonction | Description |
|----------|-------------|
| `update_updated_at()` | Met à jour automatiquement le champ `updated_at` |
| `update_conversation_activite()` | Met à jour `derniere_activite` d'une conversation lors d'un nouveau message |
| `handle_new_user()` | Crée automatiquement un profil `utilisateur` à l'inscription via Supabase Auth |
| `creer_notification()` | Fonction utilitaire pour insérer une notification |
| `nettoyer_stories_expirees()` | Supprime les stories de plus de 24h |
| `compter_amis()` | Retourne le nombre d'amis acceptés d'un utilisateur |

## Scripts SQL

- `supabase/01_schema.sql` : Création complète (DROP + tables + fonctions + triggers + RLS)
- `supabase/02_seed.sql` : Données de test (6 utilisateurs avec toutes les relations)
