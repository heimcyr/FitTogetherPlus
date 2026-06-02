<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/feed" />
        </ion-buttons>
        <ion-title>{{ defi?.titre || 'Défi' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="defi" class="detail-container">
        <!-- Hero photo -->
        <div class="hero-section">
          <img v-if="defi.photo_url" :src="defi.photo_url" alt="Photo du défi" class="hero-img" />
          <div v-else class="hero-placeholder">
            <ion-icon :icon="trophyOutline" />
          </div>
          <div class="hero-overlay">
            <span class="hero-type">{{ defi.type_activite }}</span>
          </div>
        </div>

        <!-- Infos -->
        <div class="info-section">
          <div class="info-row">
            <div class="info-item">
              <ion-icon :icon="personOutline" />
              <span>{{ classement.length }} participant{{ classement.length > 1 ? 's' : '' }}</span>
            </div>
            <div v-if="defi.distance_cible_km" class="info-item">
              <ion-icon :icon="navigateOutline" />
              <span>Objectif : {{ defi.distance_cible_km }} km</span>
            </div>
            <div v-if="defi.duree_cible && defi.duree_cible !== '00:00:00'" class="info-item">
              <ion-icon :icon="timeOutline" />
              <span>Durée : {{ defi.duree_cible }}</span>
            </div>
          </div>

          <p v-if="defi.description" class="description-text">{{ defi.description }}</p>

          <div class="createur-info">
            <span>Créé par <strong>{{ defi.createur?.pseudo || 'Inconnu' }}</strong></span>
            <span class="date-creation">{{ formatDate(defi.date_creation) }}</span>
          </div>
        </div>

        <!-- Progression globale -->
        <div class="progress-section">
          <div class="progress-header">
            <h3>Progression</h3>
            <span v-if="defi.distance_cible_km" class="progress-pct">{{ globalProgressPct }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: globalProgressPct + '%' }" />
          </div>
        </div>

        <!-- Classement -->
        <div class="classement-section">
          <h3>Classement</h3>
          <div v-if="classement.length === 0" class="empty-classement">
            <p>Aucun participant</p>
          </div>
          <div v-for="(p, index) in classement" :key="p.id" class="classement-row">
            <div class="rank-badge" :class="{ 'rank-1': index === 0, 'rank-2': index === 1, 'rank-3': index === 2 }">
              {{ index + 1 }}
            </div>
            <span class="classement-name" :class="{ 'is-me': p.id_utilisateur === currentUserId }">
              {{ p.id_utilisateur === currentUserId ? 'Toi' : p.utilisateur?.pseudo || 'Inconnu' }}
            </span>
            <span class="classement-prog">{{ p.progression || 0 }}{{ defi.distance_cible_km ? ' km' : '' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-section">
          <!-- Pas encore participant -->
          <button v-if="!userParticipation" class="btn-primary" @click="rejoindreDefi">
            Rejoindre le défi
          </button>

          <!-- Participant actif -->
          <div v-else-if="userParticipation.statut === 'en_cours'" class="update-section">
            <h3>Ma progression</h3>
            <div class="update-row">
              <input
                v-model="newProgression"
                type="number"
                min="0"
                step="0.1"
                :placeholder="String(userParticipation.progression || 0)"
                class="progression-input"
              />
              <span v-if="defi.distance_cible_km" class="unit-label">km</span>
              <button class="btn-primary btn-update" @click="updateProgression">
                Mettre à jour
              </button>
            </div>
            <button class="btn-danger" @click="abandonner">Abandonner le défi</button>
          </div>

          <!-- A abandonné -->
          <div v-else class="abandoned-notice">
            <p>Vous avez abandonné ce défi.</p>
            <button class="btn-primary" @click="rejoindreDefi">Reprendre</button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSpinner, alertController, toastController
} from '@ionic/vue';
import { trophyOutline, personOutline, navigateOutline, timeOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const defi = ref<any>(null);
const classement = ref<any[]>([]);
const currentUserId = ref('');
const userParticipation = ref<any>(null);
const newProgression = ref('');

const globalProgressPct = computed(() => {
  if (!defi.value?.distance_cible_km || classement.value.length === 0) return 0;
  const total = classement.value.reduce((sum: number, p: any) => sum + (p.progression || 0), 0);
  const avg = total / classement.value.length;
  return Math.min(Math.round((avg / defi.value.distance_cible_km) * 100), 100);
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const loadDefi = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const defiId = route.params.id as string;

  const { data, error } = await supabase
    .from('defi')
    .select('id, titre, description, type_activite, distance_cible_km, duree_cible, photo_url, date_creation, id_utilisateur, createur:utilisateur!id_utilisateur(pseudo)')
    .eq('id', defiId)
    .single();

  if (error || !data) {
    loading.value = false;
    return;
  }

  defi.value = data;

  const { data: participants } = await supabase
    .from('participation_defi')
    .select('id, id_utilisateur, progression, statut, utilisateur:utilisateur!id_utilisateur(pseudo)')
    .eq('id_defi', defiId)
    .order('progression', { ascending: false });

  classement.value = (participants || []).filter((p: any) => p.statut !== 'abandonne');

  if (currentUserId.value) {
    const found = (participants || []).find((p: any) => p.id_utilisateur === currentUserId.value);
    userParticipation.value = found || null;
    if (found) newProgression.value = String(found.progression || 0);
  }

  loading.value = false;
};

const rejoindreDefi = async () => {
  if (!currentUserId.value || !defi.value) return;

  if (userParticipation.value) {
    await supabase
      .from('participation_defi')
      .update({ statut: 'en_cours' })
      .eq('id', userParticipation.value.id);
    userParticipation.value.statut = 'en_cours';
  } else {
    const { data, error } = await supabase
      .from('participation_defi')
      .insert({
        id_defi: defi.value.id,
        id_utilisateur: currentUserId.value,
        progression: 0,
        statut: 'en_cours'
      })
      .select('id, id_utilisateur, progression, statut')
      .single();

    if (!error && data) {
      userParticipation.value = data;
      newProgression.value = '0';
    }
  }

  const toast = await toastController.create({ message: 'Défi rejoint !', duration: 1500, color: 'success' });
  await toast.present();
  await loadDefi();
};

const updateProgression = async () => {
  if (!userParticipation.value) return;

  const prog = parseFloat(newProgression.value) || 0;

  const { error } = await supabase
    .from('participation_defi')
    .update({ progression: prog })
    .eq('id', userParticipation.value.id);

  if (!error) {
    const toast = await toastController.create({ message: 'Progression mise à jour !', duration: 1500, color: 'success' });
    await toast.present();
    await loadDefi();
  }
};

const abandonner = async () => {
  const alert = await alertController.create({
    header: 'Abandonner le défi',
    message: 'Êtes-vous sûr de vouloir abandonner ce défi ?',
    buttons: [
      { text: 'Non', role: 'cancel' },
      {
        text: 'Oui, abandonner',
        role: 'destructive',
        handler: async () => {
          if (!userParticipation.value) return;
          await supabase
            .from('participation_defi')
            .update({ statut: 'abandonne' })
            .eq('id', userParticipation.value.id);
          userParticipation.value.statut = 'abandonne';
          await loadDefi();
        }
      }
    ]
  });
  await alert.present();
};

onMounted(() => loadDefi());
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.detail-container {
  padding-bottom: 30px;
}

/* Hero */
.hero-section {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #e0e0e0;
  overflow: hidden;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4ECDC4, #2bada5);
  color: rgba(255, 255, 255, 0.4);
  font-size: 80px;
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 15px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.hero-type {
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
  background: rgba(78, 205, 196, 0.8);
  padding: 3px 10px;
  border-radius: 12px;
}

/* Infos */
.info-section {
  padding: 15px 20px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #555555;
  background: #f5f5f5;
  padding: 5px 10px;
  border-radius: 15px;
}

.info-item ion-icon {
  font-size: 16px;
  color: #4ECDC4;
}

.description-text {
  font-size: 14px;
  color: #333333;
  line-height: 1.5;
  margin: 0 0 12px;
}

.createur-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #888888;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.createur-info strong {
  color: #4ECDC4;
}

.date-creation {
  font-size: 12px;
}

/* Progress */
.progress-section {
  padding: 0 20px 15px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0;
}

.progress-pct {
  font-size: 16px;
  font-weight: 700;
  color: #4ECDC4;
}

.progress-track {
  height: 12px;
  background: #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ECDC4, #2bada5);
  border-radius: 6px;
  transition: width 0.5s ease;
  min-width: 0;
}

/* Classement */
.classement-section {
  padding: 0 20px 15px;
}

.classement-section h3 {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 12px;
}

.empty-classement {
  text-align: center;
  color: #999999;
  font-size: 14px;
}

.classement-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f9f9f9;
  border-radius: 10px;
  margin-bottom: 6px;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #666666;
  flex-shrink: 0;
}

.rank-badge.rank-1 {
  background: #FFD700;
  color: #ffffff;
}

.rank-badge.rank-2 {
  background: #C0C0C0;
  color: #ffffff;
}

.rank-badge.rank-3 {
  background: #CD7F32;
  color: #ffffff;
}

.classement-name {
  flex: 1;
  font-size: 14px;
  color: #333333;
}

.classement-name.is-me {
  font-weight: 700;
  color: #4ECDC4;
}

.classement-prog {
  font-size: 14px;
  font-weight: 600;
  color: #555555;
}

/* Actions */
.actions-section {
  padding: 10px 20px;
}

.btn-primary {
  display: block;
  width: 100%;
  padding: 14px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.update-section h3 {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 10px;
}

.update-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.progression-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  outline: none;
  text-align: center;
}

.progression-input:focus {
  border-color: #4ECDC4;
}

.unit-label {
  font-size: 16px;
  font-weight: 600;
  color: #888888;
}

.btn-update {
  width: auto;
  padding: 12px 20px;
  border-radius: 10px;
  white-space: nowrap;
}

.btn-danger {
  display: block;
  width: 100%;
  padding: 12px;
  background: transparent;
  color: #eb445a;
  border: 1.5px solid #eb445a;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.abandoned-notice {
  text-align: center;
}

.abandoned-notice p {
  color: #888888;
  font-size: 14px;
  margin: 0 0 12px;
}
</style>
