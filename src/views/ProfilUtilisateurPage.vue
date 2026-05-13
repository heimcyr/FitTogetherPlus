<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/feed" />
        </ion-buttons>
        <ion-title>{{ profil.pseudo || 'Profil' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>
      <div v-else class="profil-container">
        <div class="photo-section">
          <div class="avatar-wrapper">
            <img
              v-if="profil.photo_profil"
              :src="profil.photo_profil"
              alt="Photo de profil"
              class="avatar-img"
            />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-placeholder" />
          </div>
          <button
            v-if="!isOwnProfile && !isFriend"
            class="btn-outline btn-ami"
            :disabled="friendLoading"
            @click="handleAddFriend"
          >
            <ion-spinner v-if="friendLoading" name="crescent" />
            <span v-else>{{ friendButtonText }}</span>
          </button>
        </div>

        <div class="info-section">
          <h2 class="pseudo-label">{{ profil.pseudo }}</h2>

          <div class="bio-section">
            <p class="bio-label">Bio courte :</p>
            <div class="bio-box">
              <p>{{ profil.bio || '' }}</p>
            </div>
          </div>

          <div class="badges-section">
            <p class="section-label">Badges :</p>
            <div class="badges-list">
              <div v-for="badge in badges" :key="badge.id" class="badge-item">
                <img v-if="badge.icone_url" :src="badge.icone_url" :alt="badge.nom" class="badge-icon" />
                <ion-icon v-else :icon="ribbonOutline" class="badge-icon-default" />
              </div>
              <p v-if="badges.length === 0" class="empty-text">Aucun badge</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Entraînements</span>
              <span class="stat-value">{{ stats.entrainements }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Défis</span>
              <span class="stat-value">{{ stats.defis }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Badges</span>
              <span class="stat-value">{{ stats.badges }}</span>
            </div>
          </div>
        </div>

        <div v-if="publications.length > 0" class="posts-grid">
          <div v-for="pub in publications" :key="pub.id" class="post-item">
            <img v-if="pub.photo_url" :src="pub.photo_url" alt="Publication" />
            <div v-else class="post-placeholder">
              <ion-icon :icon="imageOutline" />
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSpinner
} from '@ionic/vue';
import { personCircleOutline, ribbonOutline, imageOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const loading = ref(true);
const friendLoading = ref(false);
const isOwnProfile = ref(false);
const isFriend = ref(false);
const friendStatus = ref('');
const friendButtonText = ref('Ajouter en ami');

const profil = ref({
  id: '',
  pseudo: '',
  email: '',
  photo_profil: '',
  bio: ''
});

const stats = ref({ entrainements: 0, defis: 0, badges: 0 });
const badges = ref<Array<{ id: string; nom: string; icone_url: string | null }>>([]);
const publications = ref<Array<{ id: string; photo_url: string | null }>>([]);

const loadProfil = async () => {
  loading.value = true;
  const userId = route.params.id as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === userId) {
    isOwnProfile.value = true;
  }

  const { data: utilisateur } = await supabase
    .from('utilisateur')
    .select('*')
    .eq('id', userId)
    .single();

  if (utilisateur) {
    profil.value = utilisateur;
  }

  const { count: nbEntrainements } = await supabase
    .from('entrainement')
    .select('*', { count: 'exact', head: true })
    .eq('id_utilisateur', userId);

  const { count: nbDefis } = await supabase
    .from('participation_defi')
    .select('*', { count: 'exact', head: true })
    .eq('id_utilisateur', userId);

  const { count: nbBadges } = await supabase
    .from('badge_obtenu')
    .select('*', { count: 'exact', head: true })
    .eq('id_utilisateur', userId);

  stats.value = {
    entrainements: nbEntrainements || 0,
    defis: nbDefis || 0,
    badges: nbBadges || 0
  };

  const { data: badgesData } = await supabase
    .from('badge_obtenu')
    .select('badge(id, nom, icone_url)')
    .eq('id_utilisateur', userId);

  if (badgesData) {
    badges.value = badgesData.map((b: any) => b.badge);
  }

  const { data: pubs } = await supabase
    .from('publication')
    .select('id, photo_url')
    .eq('id_utilisateur', userId)
    .order('date_publication', { ascending: false });

  if (pubs) {
    publications.value = pubs;
  }

  if (user && !isOwnProfile.value) {
    await checkFriendship(user.id, userId);
  }

  loading.value = false;
};

const checkFriendship = async (myId: string, otherId: string) => {
  const { data } = await supabase
    .from('amitie')
    .select('statut, id_demandeur')
    .or(`and(id_demandeur.eq.${myId},id_receveur.eq.${otherId}),and(id_demandeur.eq.${otherId},id_receveur.eq.${myId})`);

  if (data && data.length > 0) {
    const relation = data[0];
    friendStatus.value = relation.statut;
    if (relation.statut === 'acceptee') {
      isFriend.value = true;
      friendButtonText.value = 'Ami(e)';
    } else if (relation.statut === 'en_attente') {
      friendButtonText.value = 'Demande envoyée';
    }
  }
};

const handleAddFriend = async () => {
  if (friendStatus.value) return;

  friendLoading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('amitie')
    .insert({
      id_demandeur: user.id,
      id_receveur: route.params.id as string,
      statut: 'en_attente'
    });

  friendLoading.value = false;

  if (!error) {
    friendStatus.value = 'en_attente';
    friendButtonText.value = 'Demande envoyée';
  }
};

onMounted(loadProfil);
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.profil-container {
  padding-bottom: 20px;
}

.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 10px;
}

.avatar-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 15px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 120px;
  color: #cccccc;
}

.btn-outline {
  border: 1.5px solid #999999;
  border-radius: 20px;
  background: transparent;
  color: #333333;
  padding: 8px 24px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 8px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-ami:disabled {
  opacity: 0.7;
}

.info-section {
  padding: 10px 20px;
}

.pseudo-label {
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  margin: 0 0 10px;
}

.bio-section {
  margin-bottom: 15px;
}

.bio-label {
  font-size: 14px;
  color: #333333;
  margin: 0 0 5px;
}

.bio-box {
  background: #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  min-height: 50px;
}

.bio-box p {
  margin: 0;
  font-size: 14px;
  color: #555555;
}

.badges-section {
  margin-bottom: 15px;
}

.section-label {
  font-size: 14px;
  color: #333333;
  margin: 0 0 8px;
}

.badges-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge-item {
  width: 40px;
  height: 40px;
}

.badge-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.badge-icon-default {
  font-size: 36px;
  color: #4ECDC4;
}

.empty-text {
  font-size: 13px;
  color: #999999;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 5px;
  border-right: 1px solid #e0e0e0;
}

.stat-item:last-child {
  border-right: none;
}

.stat-label {
  font-size: 12px;
  color: #666666;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
}

.posts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2px;
  padding: 15px 0 0;
}

.post-item {
  aspect-ratio: 1;
  overflow: hidden;
}

.post-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-placeholder {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cccccc;
  font-size: 30px;
}
</style>
