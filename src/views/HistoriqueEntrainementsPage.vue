<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/espace" />
        </ion-buttons>
        <ion-title>Historique entraînements</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="entrainements.length === 0" class="empty-container">
        <ion-icon :icon="fitnessOutline" size="large" />
        <p>Aucun entraînement enregistré</p>
      </div>

      <div v-else class="list-container">
        <div
          v-for="e in entrainements"
          :key="e.id"
          class="entrainement-card"
          @click="selectedEntrainement = e; showDetail = true"
        >
          <div class="card-header">
            <span class="card-nom">{{ e.nom }}</span>
            <span class="card-date">{{ formatDate(e.date_enregistrement) }}</span>
          </div>
          <div class="card-categorie">
            <ion-icon :icon="fitnessOutline" />
            <span>{{ e.categorie || e.type_activite }}</span>
          </div>
          <div class="card-metrics">
            <span v-if="e.distance_km"><strong>{{ e.distance_km }}</strong> km</span>
            <span v-if="e.duree"><strong>{{ e.duree }}</strong></span>
            <span v-if="e.calories"><strong>{{ e.calories }}</strong> kcal</span>
            <span v-if="e.nb_pas"><strong>{{ e.nb_pas }}</strong> pas</span>
          </div>
        </div>
      </div>

      <!-- Modal détail -->
      <ion-modal :is-open="showDetail" @didDismiss="showDetail = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-buttons slot="start">
              <ion-button @click="showDetail = false">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>Détail entraînement</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content v-if="selectedEntrainement" class="detail-content">
          <div class="detail-container">
            <h2 class="detail-nom">{{ selectedEntrainement.nom }}</h2>
            <span class="detail-categorie">{{ selectedEntrainement.categorie || selectedEntrainement.type_activite }}</span>
            <span class="detail-date">{{ formatDateFull(selectedEntrainement.date_enregistrement) }}</span>

            <div class="detail-grid">
              <div v-if="selectedEntrainement.nb_tours" class="detail-cell">
                <span class="detail-value">{{ selectedEntrainement.nb_tours }}</span>
                <span class="detail-label">Tours</span>
              </div>
              <div v-if="selectedEntrainement.nb_pas" class="detail-cell">
                <span class="detail-value">{{ selectedEntrainement.nb_pas }}</span>
                <span class="detail-label">Pas</span>
              </div>
              <div v-if="selectedEntrainement.distance_km" class="detail-cell">
                <span class="detail-value">{{ selectedEntrainement.distance_km }}</span>
                <span class="detail-label">Km</span>
              </div>
              <div v-if="selectedEntrainement.duree" class="detail-cell">
                <span class="detail-value">{{ selectedEntrainement.duree }}</span>
                <span class="detail-label">Durée</span>
              </div>
              <div v-if="selectedEntrainement.calories" class="detail-cell">
                <span class="detail-value">{{ selectedEntrainement.calories }}</span>
                <span class="detail-label">Kcal</span>
              </div>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner, IonModal
} from '@ionic/vue';
import { fitnessOutline, closeOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const entrainements = ref<any[]>([]);
const showDetail = ref(false);
const selectedEntrainement = ref<any>(null);

const loadEntrainements = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('entrainement')
    .select('*')
    .eq('id_utilisateur', user.id)
    .order('date_enregistrement', { ascending: false });

  if (data) {
    entrainements.value = data;
  }

  loading.value = false;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const formatDateFull = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

onMounted(loadEntrainements);
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: var(--ion-color-medium);
}

.list-container {
  padding: 15px;
}

.entrainement-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.card-nom {
  font-weight: 700;
  font-size: 16px;
  color: #333333;
}

.card-date {
  font-size: 12px;
  color: #999999;
}

.card-categorie {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #4ECDC4;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.card-metrics {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.card-metrics span {
  font-size: 13px;
  color: #666666;
}

.card-metrics strong {
  color: #333333;
}

/* Détail modal */
.detail-content {
  --background: #ffffff;
}

.detail-container {
  padding: 25px 20px;
  text-align: center;
}

.detail-nom {
  font-size: 22px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 5px;
}

.detail-categorie {
  display: inline-block;
  background: #e0f7f5;
  color: #4ECDC4;
  padding: 4px 14px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.detail-date {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-bottom: 25px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.detail-cell {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-value {
  font-size: 24px;
  font-weight: 700;
  color: #4ECDC4;
}

.detail-label {
  font-size: 12px;
  color: #999999;
  margin-top: 3px;
}
</style>
