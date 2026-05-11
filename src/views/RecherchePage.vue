<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Recherche</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="search-bar-row">
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Champ recherche"
          :debounce="300"
          @ionInput="handleSearch"
        />
        <button class="btn-amis" @click="$router.push('/amis')">
          <ion-icon :icon="peopleOutline" />
        </button>
      </div>

      <div v-if="searching" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="searchQuery && results.length === 0 && hasSearched" class="empty-container">
        <p>Aucun utilisateur trouvé</p>
      </div>

      <div v-else-if="results.length > 0" class="results-list">
        <div
          v-for="user in results"
          :key="user.id"
          class="result-item"
          @click="$router.push(`/utilisateur/${user.id}`)"
        >
          <div class="result-avatar">
            <img v-if="user.photo_profil" :src="user.photo_profil" alt="Avatar" />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
          </div>
          <div class="result-info">
            <span class="result-pseudo">{{ user.pseudo }}</span>
            <span v-if="user.friendStatus" class="result-status">{{ user.friendStatus }}</span>
          </div>
          <button
            v-if="user.id !== currentUserId && !user.isFriend && !user.hasPending"
            class="btn-add"
            @click.stop="sendFriendRequest(user)"
          >
            <ion-icon :icon="personAddOutline" />
          </button>
          <span v-else-if="user.isFriend" class="status-badge friend">Ami</span>
          <span v-else-if="user.hasPending" class="status-badge pending">En attente</span>
        </div>
      </div>

      <div v-else-if="!searchQuery" class="placeholder-container">
        <ion-icon :icon="searchOutline" size="large" class="placeholder-icon" />
        <p>Rechercher des utilisateurs par pseudo</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSearchbar, IonIcon, IonSpinner
} from '@ionic/vue';
import { searchOutline, personCircleOutline, personAddOutline, peopleOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const searchQuery = ref('');
const searching = ref(false);
const hasSearched = ref(false);
const results = ref<any[]>([]);
const currentUserId = ref('');

const handleSearch = async () => {
  const query = searchQuery.value?.trim();
  if (!query || query.length < 2) {
    results.value = [];
    hasSearched.value = false;
    return;
  }

  searching.value = true;
  hasSearched.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const { data: users } = await supabase
    .from('utilisateur')
    .select('id, pseudo, photo_profil')
    .ilike('pseudo', `%${query}%`)
    .limit(20);

  if (users && user) {
    const { data: friendships } = await supabase
      .from('amitie')
      .select('id_demandeur, id_receveur, statut')
      .or(`id_demandeur.eq.${user.id},id_receveur.eq.${user.id}`);

    results.value = users.map((u: any) => {
      const relation = friendships?.find(
        (f: any) =>
          (f.id_demandeur === user.id && f.id_receveur === u.id) ||
          (f.id_demandeur === u.id && f.id_receveur === user.id)
      );

      return {
        ...u,
        isFriend: relation?.statut === 'acceptee',
        hasPending: relation?.statut === 'en_attente',
        friendStatus: relation?.statut === 'acceptee' ? 'Ami(e)' : ''
      };
    });
  } else {
    results.value = [];
  }

  searching.value = false;
};

const sendFriendRequest = async (targetUser: any) => {
  if (!currentUserId.value) return;

  const { error } = await supabase
    .from('amitie')
    .insert({
      id_demandeur: currentUserId.value,
      id_receveur: targetUser.id,
      statut: 'en_attente'
    });

  if (!error) {
    targetUser.hasPending = true;
  }
};
</script>

<style scoped>
.search-bar-row {
  display: flex;
  align-items: center;
  padding-right: 10px;
}

.search-bar-row ion-searchbar {
  flex: 1;
}

.btn-amis {
  background: transparent;
  border: none;
  color: #4ECDC4;
  font-size: 26px;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-container {
  text-align: center;
  padding: 40px;
  color: #999999;
}

.placeholder-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50%;
  color: var(--ion-color-medium);
}

.placeholder-icon {
  margin-bottom: 10px;
}

.placeholder-container p {
  font-size: 14px;
  color: #999999;
}

.results-list {
  padding: 5px 15px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.result-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  margin-right: 12px;
  flex-shrink: 0;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 42px;
  color: #cccccc;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-pseudo {
  font-weight: 600;
  font-size: 15px;
  color: #333333;
}

.result-status {
  font-size: 12px;
  color: #4ECDC4;
}

.btn-add {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #4ECDC4;
  border: none;
  color: #ffffff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-badge.friend {
  background: #e0f7f5;
  color: #4ECDC4;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}
</style>
