<template>
  <ion-page>
    <ion-content :fullscreen="true" class="enregistrer-content">

      <!-- Header -->
      <div class="header-bar">
        <button class="back-btn" @click="handleBack">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">{{ headerTitle }}</h1>
      </div>

      <!-- STEP 1 : Choix de l'activité -->
      <div v-if="step === 1 && !showDefiList" class="step-container">
        <p class="step-instruction">Choisissez votre activité</p>
        <div class="activity-grid">
          <button
            v-for="a in activities"
            :key="a.value"
            class="activity-card"
            @click="selectActivity(a.value)"
          >
            <ion-icon :icon="a.icon" class="activity-icon" />
            <span>{{ a.label }}</span>
          </button>
        </div>

        <button class="defi-btn" @click="openDefiList">
          <ion-icon :icon="trophyOutline" class="defi-btn-icon" />
          <span>Réaliser un défi</span>
        </button>
      </div>

      <!-- Sélection d'un défi -->
      <div v-if="step === 1 && showDefiList" class="step-container">
        <p class="step-instruction">Sélectionnez un défi</p>
        <div v-if="loadingDefis" class="loading-defis">
          <ion-spinner name="crescent" color="primary" />
        </div>
        <div v-else-if="mesDefis.length === 0" class="empty-defis">
          <p>Aucun défi en cours</p>
          <button class="btn-back-list" @click="showDefiList = false">Retour</button>
        </div>
        <div v-else class="defi-list">
          <button
            v-for="d in mesDefis"
            :key="d.id_defi"
            class="defi-card"
            @click="selectDefi(d)"
          >
            <div class="defi-card-header">
              <ion-icon :icon="trophyOutline" class="defi-card-icon" />
              <span class="defi-card-title">{{ d.defi.titre }}</span>
            </div>
            <div class="defi-card-meta">
              <span class="defi-card-type">{{ d.defi.type_activite }}</span>
              <span v-if="d.defi.distance_cible_km" class="defi-card-progress">
                {{ d.progression || 0 }} / {{ d.defi.distance_cible_km }} km
              </span>
            </div>
          </button>
          <button class="btn-back-list" @click="showDefiList = false">Retour</button>
        </div>
      </div>

      <!-- STEP 2 : Tracking en temps réel -->
      <div v-if="step === 2" class="step-container step-tracking">
        <!-- Bandeau défi -->
        <div v-if="selectedDefi" class="defi-banner">
          <ion-icon :icon="trophyOutline" />
          <span>{{ selectedDefi.defi.titre }}</span>
        </div>

        <!-- Carte (activités outdoor) -->
        <div v-if="isOutdoor" id="map-container" class="map-container"></div>

        <!-- Chrono -->
        <div class="chrono-display">{{ formattedTime }}</div>

        <!-- Stats live -->
        <div class="live-stats">
          <div class="stat-item">
            <span class="stat-value">{{ isNatation ? Math.round(state.distanceKm * 1000) : state.steps }}</span>
            <span class="stat-label">{{ isNatation ? 'Mètres' : 'Pas' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ state.distanceKm.toFixed(2) }}</span>
            <span class="stat-label">Km</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ state.calories }}</span>
            <span class="stat-label">Kcal</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ state.laps }}</span>
            <span class="stat-label">Tours</span>
          </div>
        </div>

        <!-- Contrôles -->
        <div class="controls">
          <!-- Avant démarrage -->
          <button v-if="state.status === 'idle'" class="btn-start" @click="handleStart">
            Démarrer
          </button>

          <!-- En cours -->
          <template v-if="state.status === 'running'">
            <button class="btn-lap" @click="addLap">Tour</button>
            <button class="btn-pause" @click="pause">Pause</button>
            <button class="btn-stop" @click="confirmStop">Arrêter</button>
          </template>

          <!-- En pause -->
          <template v-if="state.status === 'paused'">
            <button class="btn-resume" @click="resume">Reprendre</button>
            <button class="btn-stop" @click="confirmStop">Arrêter</button>
          </template>
        </div>
      </div>

      <!-- STEP 3 : Résumé + Sauvegarde -->
      <div v-if="step === 3" class="step-container">
        <div class="summary-stats">
          <div class="summary-cell">
            <span class="summary-value">{{ formattedTime }}</span>
            <span class="summary-label">Durée</span>
          </div>
          <div class="summary-cell">
            <span class="summary-value">{{ isNatation ? Math.round(state.distanceKm * 1000) : state.steps }}</span>
            <span class="summary-label">{{ isNatation ? 'Mètres' : 'Pas' }}</span>
          </div>
          <div class="summary-cell">
            <span class="summary-value">{{ state.distanceKm.toFixed(2) }}</span>
            <span class="summary-label">Km</span>
          </div>
          <div class="summary-cell">
            <span class="summary-value">{{ state.calories }}</span>
            <span class="summary-label">Kcal</span>
          </div>
          <div class="summary-cell">
            <span class="summary-value">{{ state.laps }}</span>
            <span class="summary-label">Tours</span>
          </div>
        </div>

        <!-- Défi associé -->
        <div v-if="selectedDefi" class="summary-defi-banner">
          <ion-icon :icon="trophyOutline" />
          <span>Défi : {{ selectedDefi.defi.titre }}</span>
          <span v-if="selectedDefi.defi.distance_cible_km" class="summary-defi-progress">
            +{{ state.distanceKm.toFixed(2) }} km
          </span>
        </div>

        <!-- Mini carte du parcours -->
        <div v-if="isOutdoor && state.path.length > 1" id="map-summary" class="map-summary"></div>

        <div class="save-form">
          <div class="field-group">
            <label class="field-label">Nom de l'entraînement</label>
            <input v-model="workoutName" type="text" class="field-input" placeholder="Ex: Course matinale" />
          </div>

          <div class="toggle-row">
            <span class="toggle-label">Publier sur le feed</span>
            <ion-toggle v-model="publier" :checked="publier" />
          </div>

          <div v-if="publier" class="field-group">
            <label class="field-label">Description</label>
            <textarea v-model="description" class="field-textarea" placeholder="Décrivez votre entraînement..." rows="2"></textarea>
          </div>

          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

          <button class="btn-save" :disabled="saving" @click="handleSave">
            <ion-spinner v-if="saving" name="crescent" />
            <span v-else>Enregistrer</span>
          </button>
        </div>
      </div>

      <!-- STEP 4 : Confirmation -->
      <div v-if="step === 4" class="step-container step-done">
        <div class="done-circle">
          <ion-icon :icon="checkmarkOutline" class="done-icon" />
        </div>
        <p class="done-text">Entraînement enregistré !</p>
        <p v-if="defiUpdateMsg" class="done-defi-msg">{{ defiUpdateMsg }}</p>
        <button class="btn-back-home" @click="$router.back()">Retour</button>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner, IonToggle, alertController, toastController } from '@ionic/vue';
import {
  chevronBackOutline, walkOutline, bicycleOutline, waterOutline,
  footstepsOutline, checkmarkOutline, trophyOutline
} from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/services/supabase';
import { checkAndAwardBadges } from '@/services/badges';
import { useWorkoutTracker } from '@/services/workout-tracker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const router = useRouter();
const step = ref(1);
const activityType = ref('');
const workoutName = ref('');
const publier = ref(false);
const description = ref('');
const saving = ref(false);
const errorMessage = ref('');

// Défi
const showDefiList = ref(false);
const loadingDefis = ref(false);
const mesDefis = ref<any[]>([]);
const selectedDefi = ref<any>(null);
const defiUpdateMsg = ref('');

const { state, start, pause, resume, stop, addLap, cleanup, formattedTime } = useWorkoutTracker();

let map: L.Map | null = null;
let polyline: L.Polyline | null = null;
let positionMarker: L.CircleMarker | null = null;

const activities = [
  { value: 'course', label: 'Course', icon: walkOutline },
  { value: 'velo', label: 'Vélo', icon: bicycleOutline },
  { value: 'natation', label: 'Natation', icon: waterOutline },
  { value: 'marche', label: 'Marche', icon: footstepsOutline },
];

const isOutdoor = computed(() => ['course', 'velo', 'marche', 'natation'].includes(activityType.value));
const isNatation = computed(() => activityType.value === 'natation');

const headerTitle = computed(() => {
  if (step.value === 1) return 'Nouvel entraînement';
  if (step.value === 2) {
    const a = activities.find(x => x.value === activityType.value);
    return a ? a.label : 'Entraînement';
  }
  if (step.value === 3) return 'Résumé';
  return 'Terminé';
});

// --- Step 1 ---
async function selectActivity(type: string) {
  activityType.value = type;
  step.value = 2;
  if (isOutdoor.value) {
    await nextTick();
    await initMap();
  }
}

// --- Défi selection ---
async function openDefiList() {
  showDefiList.value = true;
  loadingDefis.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { loadingDefis.value = false; return; }

  const { data } = await supabase
    .from('participation_defi')
    .select('id, id_defi, progression, statut, defi:defi!id_defi(id, titre, type_activite, distance_cible_km, duree_cible)')
    .eq('id_utilisateur', user.id)
    .eq('statut', 'en_cours');

  mesDefis.value = data || [];
  loadingDefis.value = false;
}

async function selectDefi(participation: any) {
  selectedDefi.value = participation;
  showDefiList.value = false;
  const type = participation.defi.type_activite;
  activityType.value = type;
  step.value = 2;
  if (isOutdoor.value) {
    await nextTick();
    await initMap();
  }
}

// --- Map ---
async function initMap() {
  await nextTick();
  const container = document.getElementById('map-container');
  if (!container || map) return;

  let center: [number, number] = [46.52, 6.63];
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
    center = [pos.coords.latitude, pos.coords.longitude];
  } catch { /* fallback */ }

  map = L.map('map-container', { zoomControl: false }).setView(center, 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM',
    maxZoom: 19,
  }).addTo(map);

  polyline = L.polyline([], { color: '#4ECDC4', weight: 4, opacity: 0.8 }).addTo(map);

  positionMarker = L.circleMarker(center, {
    radius: 8,
    fillColor: '#4ECDC4',
    fillOpacity: 1,
    color: '#ffffff',
    weight: 3,
  }).addTo(map);
}

function initSummaryMap() {
  nextTick(() => {
    const container = document.getElementById('map-summary');
    if (!container || state.path.length < 2) return;

    const summaryMap = L.map('map-summary', { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView(state.path[0], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19,
    }).addTo(summaryMap);

    const line = L.polyline(state.path, { color: '#4ECDC4', weight: 4 }).addTo(summaryMap);
    summaryMap.fitBounds(line.getBounds(), { padding: [20, 20] });
  });
}

// Update map en temps réel
watch(
  () => state.path.length,
  () => {
    if (!polyline || !map) return;
    polyline.setLatLngs(state.path);
    if (state.currentPosition) {
      const pos: L.LatLngExpression = [state.currentPosition.lat, state.currentPosition.lng];
      positionMarker?.setLatLng(pos);
      map.panTo(pos);
    }
  }
);

// --- Step 2 controls ---
async function handleStart() {
  await start(activityType.value);
}

async function confirmStop() {
  const alert = await alertController.create({
    header: 'Arrêter l\'entraînement ?',
    message: 'Votre progression sera sauvegardée.',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      {
        text: 'Arrêter',
        role: 'destructive',
        handler: () => {
          stop();
          // Cleanup map
          if (map) {
            map.remove();
            map = null;
            polyline = null;
            positionMarker = null;
          }
          step.value = 3;
          if (isOutdoor.value && state.path.length > 1) {
            initSummaryMap();
          }
        },
      },
    ],
  });
  await alert.present();
}

// --- Step 3 save ---
async function handleSave() {
  if (!workoutName.value.trim()) {
    errorMessage.value = 'Le nom est obligatoire.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { saving.value = false; return; }

  const totalSec = Math.floor(state.elapsedMs / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  const duree = `${h}:${m}:${s}`;

  const insertData: any = {
    id_utilisateur: user.id,
    nom: workoutName.value.trim(),
    categorie: activityType.value,
    type_activite: activityType.value,
    nb_tours: state.laps || null,
    nb_pas: state.steps || null,
    distance_km: state.distanceKm > 0 ? Math.round(state.distanceKm * 100) / 100 : null,
    calories: state.calories || null,
    duree: duree !== '00:00:00' ? duree : null,
    date_enregistrement: new Date().toISOString(),
  };
  if (selectedDefi.value) {
    insertData.id_defi = selectedDefi.value.defi.id;
  }

  const { data: entrainement, error } = await supabase
    .from('entrainement')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    errorMessage.value = 'Erreur lors de l\'enregistrement.';
    saving.value = false;
    return;
  }

  if (publier.value && entrainement) {
    await supabase.from('publication').insert({
      id_utilisateur: user.id,
      id_entrainement: entrainement.id,
      description: description.value.trim() || null,
    });
  }

  // Upsert historique_pas
  if (state.steps > 0) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('historique_pas')
      .select('id, nb_pas, calories')
      .eq('id_utilisateur', user.id)
      .eq('jour', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('historique_pas')
        .update({
          nb_pas: existing.nb_pas + state.steps,
          calories: existing.calories + state.calories,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('historique_pas').insert({
        id_utilisateur: user.id,
        jour: today,
        nb_pas: state.steps,
        calories: state.calories,
      });
    }
  }

  await checkAndAwardBadges(user.id);

  // Update défi progression
  if (selectedDefi.value) {
    const defi = selectedDefi.value.defi;
    const currentProg = selectedDefi.value.progression || 0;
    let increment = 0;

    if (defi.distance_cible_km) {
      increment = state.distanceKm > 0 ? Math.round(state.distanceKm * 100) / 100 : 0;
    } else if (defi.duree_cible) {
      // Convert elapsed ms to minutes for duration-based défis
      increment = Math.round(state.elapsedMs / 60000 * 100) / 100;
    }

    if (increment > 0) {
      const newProg = Math.round((currentProg + increment) * 100) / 100;
      const updateData: any = { progression: newProg };

      // Check if défi is completed
      if (defi.distance_cible_km && newProg >= defi.distance_cible_km) {
        updateData.statut = 'termine';
        defiUpdateMsg.value = `Défi "${defi.titre}" terminé ! Bravo !`;
      } else {
        defiUpdateMsg.value = `Défi "${defi.titre}" : +${increment}${defi.distance_cible_km ? ' km' : ' min'}`;
      }

      await supabase
        .from('participation_defi')
        .update(updateData)
        .eq('id', selectedDefi.value.id);

      const toast = await toastController.create({
        message: defiUpdateMsg.value,
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    }
  }

  saving.value = false;
  step.value = 4;
}

// --- Navigation ---
async function handleBack() {
  if (step.value === 1 && showDefiList.value) {
    showDefiList.value = false;
    return;
  }
  if (step.value === 2 && (state.status === 'running' || state.status === 'paused')) {
    const alert = await alertController.create({
      header: 'Quitter ?',
      message: 'L\'entraînement en cours sera perdu.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Quitter',
          role: 'destructive',
          handler: () => {
            cleanup();
            if (map) { map.remove(); map = null; }
            router.back();
          },
        },
      ],
    });
    await alert.present();
    return;
  }
  if (step.value === 2 && state.status === 'idle') {
    if (map) { map.remove(); map = null; polyline = null; positionMarker = null; }
    step.value = 1;
    return;
  }
  router.back();
}

onUnmounted(() => {
  cleanup();
  if (map) { map.remove(); map = null; }
});
</script>

<style scoped>
.enregistrer-content {
  --background: #ffffff;
}

.header-bar {
  background: #4ECDC4;
  display: flex;
  align-items: center;
  padding: 15px 15px 18px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
}

.page-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
  padding-right: 30px;
}

.step-container {
  padding: 20px 15px;
}

/* Step 1 - Sélection activité */
.step-instruction {
  text-align: center;
  font-size: 16px;
  color: #666666;
  margin: 0 0 20px;
}

.activity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.activity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.activity-card:active {
  border-color: #4ECDC4;
  background: rgba(78, 205, 196, 0.08);
}

.activity-icon {
  font-size: 36px;
  color: #4ECDC4;
}

.activity-card span {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

/* Step 2 - Tracking */
.step-tracking {
  padding: 0 15px 20px;
}

.map-container {
  width: 100%;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  margin: 15px 0 10px;
  z-index: 0;
}

.chrono-display {
  text-align: center;
  font-size: 52px;
  font-weight: 700;
  color: #333333;
  padding: 15px 0 10px;
  font-variant-numeric: tabular-nums;
}

.live-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 25px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: rgba(78, 205, 196, 0.1);
  border-radius: 12px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #333333;
}

.stat-label {
  font-size: 13px;
  color: #888888;
  margin-top: 2px;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-start {
  width: 100%;
  padding: 16px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  min-height: 54px;
}

.btn-lap {
  flex: 1;
  padding: 14px;
  border: 2px solid #4ECDC4;
  background: transparent;
  color: #4ECDC4;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
}

.btn-pause {
  flex: 1;
  padding: 14px;
  background: #ffc409;
  color: #333333;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
}

.btn-resume {
  flex: 1;
  padding: 14px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
}

.btn-stop {
  flex: 1;
  padding: 14px;
  background: #eb445a;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
}

/* Step 3 - Résumé */
.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.summary-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 6px;
  border: 1.5px solid #4ECDC4;
  border-radius: 12px;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
}

.summary-label {
  font-size: 12px;
  color: #888888;
  margin-top: 3px;
}

.map-summary {
  width: 100%;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  z-index: 0;
}

.save-form {
  padding-top: 5px;
}

.field-group {
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 6px;
}

.field-input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  color: #333333;
  outline: none;
  background: #ffffff;
  box-sizing: border-box;
}

.field-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: #333333;
  outline: none;
  resize: none;
  font-family: inherit;
  background: #ffffff;
  box-sizing: border-box;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 6px 0;
}

.toggle-label {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.error-text {
  color: #eb445a;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.btn-save {
  width: 100%;
  padding: 14px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 30px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save:disabled {
  opacity: 0.7;
}

/* Step 4 - Confirmation */
.step-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 60px;
}

.done-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #4ECDC4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.done-icon {
  font-size: 40px;
  color: #ffffff;
}

.done-text {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 30px;
}

.btn-back-home {
  padding: 14px 50px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 50px;
}

/* Défi button (Step 1) */
.defi-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.defi-btn-icon {
  font-size: 24px;
}

/* Défi list */
.loading-defis {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.empty-defis {
  text-align: center;
  padding: 30px 0;
  color: #888888;
  font-size: 14px;
}

.defi-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.defi-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 2px solid #FFD700;
  border-radius: 14px;
  background: #fffdf0;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.defi-card:active {
  background: #fff8d6;
  border-color: #FFA500;
}

.defi-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.defi-card-icon {
  font-size: 22px;
  color: #FFA500;
}

.defi-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}

.defi-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.defi-card-type {
  font-size: 13px;
  color: #888888;
  text-transform: capitalize;
}

.defi-card-progress {
  font-size: 13px;
  font-weight: 600;
  color: #4ECDC4;
}

.btn-back-list {
  padding: 12px;
  background: transparent;
  color: #888888;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

/* Défi banner (Step 2) */
.defi-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 10px 14px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #ffffff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}

.defi-banner ion-icon {
  font-size: 18px;
}

/* Défi summary banner (Step 3) */
.summary-defi-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #fffdf0;
  border: 1.5px solid #FFD700;
  border-radius: 10px;
  margin-bottom: 15px;
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}

.summary-defi-banner ion-icon {
  font-size: 20px;
  color: #FFA500;
}

.summary-defi-progress {
  margin-left: auto;
  color: #4ECDC4;
  font-weight: 700;
}

/* Défi confirmation (Step 4) */
.done-defi-msg {
  font-size: 15px;
  color: #FFA500;
  font-weight: 600;
  text-align: center;
  margin: -15px 0 25px;
}
</style>
