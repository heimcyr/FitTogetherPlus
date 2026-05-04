# Conventions de code

## Commits Git

Format des messages de commit :

```
[type]: description courte
```

### Types de commit

| Type | Description |
|------|-------------|
| `[feat]` | Nouvelle fonctionnalité |
| `[fix]` | Correction de bug |
| `[docs]` | Documentation |
| `[style]` | Formatage, CSS (pas de changement de logique) |
| `[refactor]` | Restructuration du code |
| `[test]` | Ajout ou modification de tests |
| `[chore]` | Maintenance, dépendances, config |

### Exemples

```
[feat]: ajout de la page de profil
[fix]: correction du bug de login
[docs]: mise à jour du README
[style]: alignement des composants du feed
[refactor]: extraction du service Supabase
```

## Branches

- Depuis `develop`, créer une branche par fonctionnalité : `feature/nom-feature`
- Fusionner via **Pull Request** avec review du collègue
- Supprimer la branche après merge

### Nommage des branches

```
feature/auth-login
feature/feed-publications
feature/defis-creation
feature/messagerie
fix/bug-profil-photo
```

## Code Vue / TypeScript

- **Composition API** (pas Options API)
- **TypeScript** strict
- Nommage des fichiers composants : `PascalCase.vue`
- Nommage des fichiers services : `camelCase.ts`
- Utiliser les composants Ionic (`IonPage`, `IonContent`, etc.)

## Structure des pages

```vue
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Titre</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- contenu -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// imports
// logique
</script>

<style scoped>
/* styles */
</style>
```
