<template>
  <ion-page>
    <ion-content :fullscreen="true" class="detail-defi-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">{{ defi?.titre || 'Défi' }}</h1>
      </div>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="defi" class="detail-container">
        <!-- Créé par -->
        <div class="createur-badge">
          <span>Créer par : {{ defi.createur?.pseudo || 'Inconnu' }}</span>
        </div>

        <!-- Carte progression + classement -->
        <div class="progression-card">
          <h2 class="card-title">Progression du défi</h2>

          <!-- Barre de progression -->
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div
                v-for="(segment, index) in progressSegments"
                :key="index"
                class="progress-segment"
                :style="{ background: segment.color }"
              />
            </div>
          </div>

          <!-- Classement -->
          <h3 class="classement-title">Classement:</h3>
          <div class="classement-list">
            <div v-for="(participant, index) in classement" :key="participant.id" class="classement-item">
              <span class="classement-rank">{{ index + 1 }}.</span>
              <span class="classement-pseudo" :class="{ 'is-me': participant.id_utilisateur === currentUserId }">
                {{ participant.id_utilisateur === currentUserId ? 'Toi' : participant.utilisateur?.pseudo || 'Inconnu' }}
              </span>
              <span class="classement-value">
                - {{ participant.progression }} {{ defi.distance_cible ? 'km' : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Boutons actions -->
        <div class="actions-row">
          <template v-if="!userParticipation">
            <button class="btn-rejoindre" @click="rejoindreDefi">Rejoindre</button>
          </template>
          <template v-else-if="userParticipation.statut === 'en_cours'">
            <!-- Mettre à jour la progression -->
            <div class="update-progression">
              <label class="update-label">Ma progression :</label>
              <div class="update-input-row">
                <input v-model="newProgression" type="number" min="0" step="0.1" placeholder="0" class="progression-input" />
                <span class="progression-unit">{{ defi.distance_cible ? 'km' : '' }}</span>
                <button class="btn-update" @click="updateProgression">OK</button>
              </div>
            </div>
          </template>

          <div class="bottom-buttons">
            <button class="btn-retour" @click="$router.back()">Retour</button>
            <button v-if="userParticipation && userParticipation.statut === 'en_cours'" class="btn-abandonner" @click="abandonner">Abandonner</button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner, alertController } from '@ionic/vue';
import { chevronBackOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const defi = ref<any>(null);
const classement = ref<any[]>([]);
const currentUserId = ref('');
const userParticipation = ref<any>(null);
const newProgression = ref('');

const TOTAL_SEGMENTS = 10;

const progressSegments = computed(() => {
  if (!defi.value || !defi.value.distance_cible) {
    return Array(TOTAL_SEGMENTS).fill({ color: '#ffffff' });
  }

  // Calculer la progression moyenne
  const totalProg = classement.value.reduce((sum: number, p: any) => sum + (p.progression || 0), 0);
  const avgProg = classement.value.length > 0 ? totalProg / classement.value.length : 0;
  const ratio = Math.min(avgProg / defi.value.distance_cible, 1);
  const filled = Math.round(ratio * TOTAL_SEGMENTS);

  return Array(TOTAL_SEGMENTS).fill(null).map((_, i) => ({
    color: i < filled ? (i < filled / 2 ? '#2d8a4e' : '#6abf69') : '#ffffff'
  }));
});

const loadDefi = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const defiId = route.params.id as string;

  const { data, error } = await supabase
    .from('defi')
    .select('id, titre, description, type_activite, distance_cible, duree_cible, photo_url, date_creation, statut, id_createur, createur:utilisateur!id_createur(pseudo)')
    .eq('id', defiId)
    .single();

  if (error || !data) {
    console.error('Erreur chargement défi:', error?.message);
    loading.value = false;
    return;
  }

  defi.value = data;

  // Charger les participants
  const { data: participants } = await supabase
    .from('participation_defi')
    .select('id, id_utilisateur, progression, statut, utilisateur:utilisateur!id_utilisateur(pseudo)')
    .eq('id_defi', defiId)
    .order('progression', { ascending: false });

  classement.value = participants || [];

  // Vérifier la participation de l'utilisateur
  if (currentUserId.value) {
    const found = classement.value.find((p: any) => p.id_utilisateur === currentUserId.value);
    userParticipation.value = found || null;
    if (found) {
      newProgression.value = String(found.progression || 0);
    }
  }

  loading.value = false;
};

const rejoindreDefi = async () => {
  if (!currentUserId.value || !defi.value) return;

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
    classement.value.push({ ...data, utilisateur: { pseudo: 'Toi' } });
    newProgression.value = '0';
  }
};

const updateProgression = async () => {
  if (!userParticipation.value) return;

  const prog = parseFloat(newProgression.value) || 0;

  const { error } = await supabase
    .from('participation_defi')
    .update({ progression: prog })
    .eq('id', userParticipation.value.id);

  if (!error) {
    userParticipation.value.progression = prog;
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
          router.back();
        }
      }
    ]
  });
  await alert.present();
};

onMounted(() => loadDefi());
</script>

<style scoped>
.detail-defi-content {
  --background: #4ECDC4;
}

.header-bar {
  background: #4ECDC4;
  display: flex;
  align-items: center;
  padding: 15px 15px 20px;
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
}

.page-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
  padding-right: 30px;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.detail-container {
  padding: 0 20px 30px;
}

/* Créé par badge */
.createur-badge {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  text-align: center;
  margin-bottom: 20px;
}

.createur-badge span {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

/* Carte progression */
.progression-card {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 25px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 15px;
}

/* Barre de progression */
.progress-bar-container {
  margin-bottom: 20px;
}

.progress-bar {
  display: flex;
  gap: 3px;
  height: 25px;
}

.progress-segment {
  flex: 1;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Classement */
.classement-title {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 10px;
}

.classement-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.classement-item {
  font-size: 15px;
  color: #333333;
  padding: 4px 0;
}

.classement-rank {
  font-weight: 700;
  margin-right: 4px;
}

.classement-pseudo.is-me {
  font-weight: 700;
  color: #ffffff;
}

.classement-value {
  color: #333333;
}

/* Update progression */
.update-progression {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

.update-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8px;
}

.update-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progression-input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #ffffff;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  outline: none;
  text-align: center;
}

.progression-unit {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.btn-update {
  padding: 10px 20px;
  background: #ffffff;
  color: #4ECDC4;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Boutons bas */
.bottom-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn-retour {
  padding: 12px 30px;
  background: #4ECDC4;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-rejoindre {
  display: block;
  width: 100%;
  padding: 14px;
  background: #ffffff;
  color: #4ECDC4;
  border: none;
  border-radius: 25px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 20px;
  text-align: center;
}

.btn-abandonner {
  padding: 12px 30px;
  background: #eb445a;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.actions-row {
  margin-top: 10px;
}
</style>
