<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/profil" />
        </ion-buttons>
        <ion-title>Badges</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>
      <div v-else class="badges-container">
        <div class="badges-summary">
          <div class="summary-circle">
            <span class="summary-count">{{ obtainedCount }}</span>
            <span class="summary-total">/ {{ allBadges.length }}</span>
          </div>
          <p class="summary-label">Badges obtenus</p>
        </div>

        <div v-if="obtainedBadges.length > 0" class="section">
          <h2 class="section-title">Obtenus</h2>
          <div class="badges-grid">
            <div
              v-for="badge in obtainedBadges"
              :key="badge.id"
              class="badge-card obtained"
              @click="selectedBadge = badge"
            >
              <div class="badge-icon-wrapper">
                <img v-if="badge.icone_url" :src="badge.icone_url" :alt="badge.nom" class="badge-img" />
                <ion-icon v-else :icon="ribbonOutline" class="badge-icon-fallback" />
              </div>
              <span class="badge-name">{{ badge.nom }}</span>
              <span v-if="badge.date_obtention" class="badge-date">{{ formatDate(badge.date_obtention) }}</span>
            </div>
          </div>
        </div>

        <div v-if="lockedBadges.length > 0" class="section">
          <h2 class="section-title">À débloquer</h2>
          <div class="badges-grid">
            <div
              v-for="badge in lockedBadges"
              :key="badge.id"
              class="badge-card locked"
              @click="selectedBadge = badge"
            >
              <div class="badge-icon-wrapper locked-icon">
                <ion-icon :icon="lockClosedOutline" class="lock-icon" />
              </div>
              <span class="badge-name">{{ badge.nom }}</span>
              <span class="badge-condition">{{ badge.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal détail badge -->
      <ion-modal :is-open="!!selectedBadge" @didDismiss="selectedBadge = null" :initial-breakpoint="0.4" :breakpoints="[0, 0.4]">
        <div v-if="selectedBadge" class="badge-detail">
          <div class="detail-icon-wrapper" :class="{ 'detail-obtained': selectedBadge.obtained }">
            <img v-if="selectedBadge.icone_url" :src="selectedBadge.icone_url" :alt="selectedBadge.nom" class="detail-img" />
            <ion-icon v-else :icon="selectedBadge.obtained ? ribbonOutline : lockClosedOutline" class="detail-icon" />
          </div>
          <h2 class="detail-name">{{ selectedBadge.nom }}</h2>
          <p class="detail-description">{{ selectedBadge.description }}</p>
          <div v-if="selectedBadge.obtained" class="detail-obtained-info">
            <ion-icon :icon="checkmarkCircleOutline" class="check-icon" />
            <span>Obtenu le {{ formatDate(selectedBadge.date_obtention) }}</span>
          </div>
          <div v-else class="detail-locked-info">
            <ion-icon :icon="lockClosedOutline" class="lock-detail-icon" />
            <span>Pas encore débloqué</span>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSpinner, IonModal
} from '@ionic/vue';
import { ribbonOutline, lockClosedOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';
import { checkAndAwardBadges } from '@/services/badges';

const loading = ref(true);
const allBadges = ref<any[]>([]);
const selectedBadge = ref<any>(null);

const obtainedBadges = computed(() => allBadges.value.filter(b => b.obtained));
const lockedBadges = computed(() => allBadges.value.filter(b => !b.obtained));
const obtainedCount = computed(() => obtainedBadges.value.length);

const loadBadges = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Vérifier et attribuer de nouveaux badges
  await checkAndAwardBadges(user.id);

  // Charger tous les badges
  const { data: badges } = await supabase
    .from('badge')
    .select('id, nom, description, icone_url, condition_obtention');

  // Charger les badges obtenus
  const { data: obtained } = await supabase
    .from('badge_obtenu')
    .select('id_badge, date_obtention')
    .eq('id_utilisateur', user.id);

  const obtainedMap = new Map(
    (obtained || []).map((b: any) => [b.id_badge, b.date_obtention])
  );

  allBadges.value = (badges || []).map((badge: any) => ({
    ...badge,
    obtained: obtainedMap.has(badge.id),
    date_obtention: obtainedMap.get(badge.id) || null
  }));

  loading.value = false;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

onMounted(loadBadges);
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.badges-container {
  padding: 20px;
  padding-bottom: 40px;
}

.badges-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 25px;
}

.summary-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #4ECDC4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.summary-count {
  font-size: 32px;
  font-weight: 700;
  color: #4ECDC4;
  line-height: 1;
}

.summary-total {
  font-size: 14px;
  color: #999999;
}

.summary-label {
  font-size: 16px;
  color: #666666;
  margin: 0;
}

.section {
  margin-bottom: 25px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  margin: 0 0 12px;
}

.badges-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.badge-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.badge-card.obtained {
  border-color: #4ECDC4;
  background: #f0faf9;
}

.badge-card.locked {
  opacity: 0.7;
}

.badge-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  background: #f0faf9;
}

.badge-icon-wrapper.locked-icon {
  background: #f0f0f0;
}

.badge-img {
  width: 45px;
  height: 45px;
  object-fit: contain;
}

.badge-icon-fallback {
  font-size: 36px;
  color: #4ECDC4;
}

.lock-icon {
  font-size: 28px;
  color: #999999;
}

.badge-name {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 2px;
}

.badge-date {
  font-size: 11px;
  color: #999999;
}

.badge-condition {
  font-size: 11px;
  color: #999999;
}

/* Modal détail */
.badge-detail {
  padding: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.detail-icon-wrapper {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  background: #f0f0f0;
}

.detail-icon-wrapper.detail-obtained {
  background: #f0faf9;
  border: 3px solid #4ECDC4;
}

.detail-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.detail-icon {
  font-size: 48px;
  color: #4ECDC4;
}

.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 8px;
}

.detail-description {
  font-size: 15px;
  color: #666666;
  margin: 0 0 15px;
  line-height: 1.4;
}

.detail-obtained-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4ECDC4;
  font-size: 14px;
  font-weight: 500;
}

.check-icon {
  font-size: 20px;
}

.detail-locked-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #999999;
  font-size: 14px;
}

.lock-detail-icon {
  font-size: 18px;
}
</style>
