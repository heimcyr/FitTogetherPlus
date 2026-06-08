<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { App } from '@capacitor/app';
import { notifyReady, checkForUpdate } from '@/services/app-updater';
import { startPedometer, stopPedometer, savePedometerNow } from '@/services/pedometer';
import { supabase } from '@/services/supabase';

onMounted(async () => {
  await notifyReady();
  await checkForUpdate();

  // Start pedometer if user is already logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await startPedometer();
  }

  // Start/stop pedometer on auth state changes (login/logout)
  supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN') {
      await startPedometer();
    } else if (event === 'SIGNED_OUT') {
      await stopPedometer();
    }
  });

  // Save steps when app goes to background
  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) {
      await savePedometerNow();
    }
  });
});
</script>
