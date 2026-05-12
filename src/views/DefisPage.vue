<template>
  <ion-page>
    <ion-content :fullscreen="true" class="defis-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">Défis sportifs</h1>
        <button class="add-btn" @click="$router.push('/creer-defi')">
          <ion-icon :icon="addOutline" />
        </button>
      </div>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="loading && defis.length === 0" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="defis.length === 0" class="empty-container">
        <ion-icon :icon="trophyOutline" class="empty-icon" />
        <p>Aucun défi pour le moment</p>
        <button class="btn-create" @click="$router.push('/creer-defi')">Créer un défi</button>
      </div>

      <div v-else class="defis-list">
        <div v-for="defi in defis" :key="defi.id" class="defi-card" @click="$router.push(`/defi/${defi.id}`)">
          <div v-if="defi.photo_url" class="defi-photo">
            <img :src="defi.photo_url" alt="Photo défi" />
          </div>
          <div class="defi-info">
            <h3 class="defi-titre">{{ defi.titre }}</h3>
            <p class="defi-createur">Créé par : {{ defi.createur?.pseudo || 'Inconnu' }}</p>
            <div class="defi-meta">
              <span v-if="defi.distance_cible" class="meta-badge">
                <ion-icon :icon="navigateOutline" /> {{ defi.distance_cible }} km
              </span>
              <span v-if="defi.duree_cible" class="meta-badge">
                <ion-icon :icon="timeOutline" /> {{ defi.duree_cible }}
              </span>
              <span class="meta-badge participants">
                <ion-icon :icon="peopleOutline" /> {{ defi.nbParticipants }}
              </span>
            </div>
            <div class="defi-status">
              <span :class="['status-badge', defi.userStatus]">
                {{ getStatusLabel(defi.userStatus) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonContent, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent
} from '@ionic/vue';
import {
  chevronBackOutline, addOutline, trophyOutline,
  navigateOutline, timeOutline, peopleOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const defis = ref<any[]>([]);
const currentUserId = ref('');

const getStatusLabel = (status: string | null): string => {
  if (status === 'en_cours') return 'En cours';
  if (status === 'termine') return 'Terminé';
  if (status === 'abandonne') return 'Abandonné';
  return 'Rejoindre';
};

const loadDefis = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const { data, error } = await supabase
    .from('defi')
    .select('id, titre, description, type_activite, distance_cible, duree_cible, photo_url, date_creation, statut, id_createur, createur:utilisateur!id_createur(pseudo)')
    .order('date_creation', { ascending: false });

  if (error) {
    console.error('Erreur chargement défis:', error.message);
    loading.value = false;
    return;
  }

  if (data) {
    const enriched = await Promise.all(data.map(async (defi: any) => {
      const { count } = await supabase
        .from('participation_defi')
        .select('*', { count: 'exact', head: true })
        .eq('id_defi', defi.id);

      let userStatus: string | null = null;
      if (currentUserId.value) {
        const { data: participation } = await supabase
          .from('participation_defi')
          .select('statut')
          .eq('id_defi', defi.id)
          .eq('id_utilisateur', currentUserId.value)
          .maybeSingle();
        userStatus = participation?.statut || null;
      }

      return {
        ...defi,
        nbParticipants: count || 0,
        userStatus
      };
    }));

    defis.value = enriched;
  }

  loading.value = false;
};

const handleRefresh = async (event: CustomEvent) => {
  await loadDefis();
  (event.target as HTMLIonRefresherElement).complete();
};

onMounted(() => loadDefis());
</script>

<style scoped>
.defis-content {
  --background: #ffffff;
}

.header-bar {
  background: #4ECDC4;
  display: flex;
  align-items: center;
  padding: 15px 15px 20px;
}

.back-btn,
.add-btn {
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
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999999;
}

.empty-icon {
  font-size: 64px;
  color: #cccccc;
  margin-bottom: 15px;
}

.empty-container p {
  font-size: 16px;
  margin-bottom: 20px;
}

.btn-create {
  padding: 12px 30px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.defis-list {
  padding: 15px;
}

.defi-card {
  background: #f0faf9;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 15px;
  cursor: pointer;
  border: 1px solid #e0f0ee;
}

.defi-photo {
  width: 100%;
  height: 150px;
  overflow: hidden;
}

.defi-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.defi-info {
  padding: 12px 15px;
}

.defi-titre {
  margin: 0 0 5px;
  font-size: 17px;
  font-weight: 700;
  color: #333333;
}

.defi-createur {
  font-size: 13px;
  color: #666666;
  margin: 0 0 8px;
}

.defi-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.meta-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #4ECDC4;
  font-weight: 600;
}

.meta-badge ion-icon {
  font-size: 14px;
}

.defi-status {
  display: flex;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.en_cours {
  background: #4ECDC4;
  color: #ffffff;
}

.status-badge.termine {
  background: #28a745;
  color: #ffffff;
}

.status-badge.abandonne {
  background: #eb445a;
  color: #ffffff;
}

.status-badge:not(.en_cours):not(.termine):not(.abandonne) {
  background: #e0e0e0;
  color: #666666;
}
</style>
