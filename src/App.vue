<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { notifyReady, checkForUpdate } from '@/services/app-updater';

onMounted(async () => {
  await notifyReady();
  await checkForUpdate();
});
</script>
