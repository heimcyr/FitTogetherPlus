<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Messages</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="messages-placeholder">
        <ion-icon :icon="chatbubblesOutline" size="large" />
        <p>Vos conversations</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/vue';
import { chatbubblesOutline } from 'ionicons/icons';
</script>

<style scoped>
.messages-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}
</style>
