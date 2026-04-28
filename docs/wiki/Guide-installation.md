# Guide d'installation

## Prérequis

- **Node.js** v18 ou supérieur
- **npm** (inclus avec Node.js)
- **Ionic CLI** : `npm install -g @ionic/cli`
- **Android Studio** (pour le build mobile)
- Un compte **Supabase** (gratuit)

## 1. Cloner le projet

```bash
git clone https://github.com/heimcyr/FitTogetherPlus.git
cd FitTogetherPlus
```

## 2. Installer les dépendances

```bash
npm install
```

## 3. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter `supabase/01_schema.sql`
3. Exécuter `supabase/02_seed.sql` pour les données de test
4. Copier l'URL et la clé API (Settings > API)
5. Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

## 4. Lancer en développement

```bash
ionic serve
```

L'application sera accessible sur `http://localhost:8100`.

## 5. Build Android

```bash
# Compiler le projet
npm run build

# Synchroniser avec Capacitor
npx cap sync

# Ouvrir dans Android Studio
npx cap open android
```

Dans Android Studio :
1. Attendre la synchronisation Gradle
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. Installer l'APK sur un téléphone Android

## Comptes de test

Après exécution du seed :

| Email | Mot de passe |
|-------|-------------|
| lucie.martin@email.com | Test1234! |
| thomas.durand@email.com | Test1234! |
| clara.petit@email.com | Test1234! |
| maxime.bernard@email.com | Test1234! |
| eva.leroy@email.com | Test1234! |
| nicolas.moreau@email.com | Test1234! |
