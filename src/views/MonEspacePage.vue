<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mon espace</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <span class="logout-text">déconnexion</span>
            <ion-icon slot="end" :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="espace-placeholder">
        <ion-icon :icon="personOutline" size="large" />
        <p>Mon espace personnel</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/vue';
import { logOutOutline, personOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.replace('/login');
};
</script>

<style scoped>
.espace-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}

.logout-text {
  font-size: 0.85rem;
}
</style>
