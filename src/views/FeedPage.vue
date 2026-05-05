<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mon Profil</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/notifications">
            <ion-icon slot="icon-only" :icon="notificationsOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="feed-placeholder">
        <ion-icon :icon="newspaperOutline" size="large" />
        <p>Feed social</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/vue';
import { notificationsOutline, newspaperOutline } from 'ionicons/icons';
</script>

<style scoped>
.feed-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}
</style>
