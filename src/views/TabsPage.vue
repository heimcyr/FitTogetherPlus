<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="feed" href="/tabs/feed">
          <ion-icon aria-hidden="true" :icon="homeOutline" />
        </ion-tab-button>

        <ion-tab-button tab="recherche" href="/tabs/recherche">
          <ion-icon aria-hidden="true" :icon="searchOutline" />
        </ion-tab-button>

        <ion-tab-button tab="messages" href="/tabs/messages">
          <ion-icon aria-hidden="true" :icon="sendOutline" />
        </ion-tab-button>

        <ion-tab-button tab="espace" href="/tabs/espace">
          <ion-icon aria-hidden="true" :icon="personOutline" />
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { homeOutline, searchOutline, sendOutline, personOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-bar {
  --background: #ffffff;
  --border: 1px solid #e0e0e0;
}

ion-tab-button {
  --color: #999999;
  --color-selected: #4ECDC4;
}
</style>
