<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Recherche</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-searchbar placeholder="Champ recherche" />
      <div class="recherche-placeholder">
        <ion-icon :icon="searchOutline" size="large" />
        <p>Rechercher des utilisateurs, défis, publications...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonIcon } from '@ionic/vue';
import { searchOutline } from 'ionicons/icons';
</script>

<style scoped>
.recherche-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60%;
  color: var(--ion-color-medium);
}
</style>
