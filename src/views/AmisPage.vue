<template>
  <ion-page>
    <ion-content :fullscreen="true" class="amis-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">Amis</h1>
      </div>

      <div class="search-row">
        <div class="search-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Champ recherche"
            class="search-input"
            @input="filterAmis"
          />
        </div>
        <button class="btn-demandes" @click="$router.push('/demandes-amis')">
          <ion-icon :icon="peopleOutline" />
          <span v-if="demandesCount > 0" class="badge-count">{{ demandesCount }}</span>
        </button>
      </div>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="light" />
      </div>

      <div v-else-if="filteredAmis.length === 0" class="empty-container">
        <p>{{ searchQuery ? 'Aucun ami trouvé' : 'Aucun ami pour le moment' }}</p>
      </div>

      <div v-else class="amis-list">
        <div
          v-for="ami in filteredAmis"
          :key="ami.id"
          class="ami-item"
        >
          <div class="ami-info" @click="$router.push(`/utilisateur/${ami.id}`)">
            <div class="ami-avatar">
              <img v-if="ami.photo_profil" :src="ami.photo_profil" alt="Avatar" />
              <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
            </div>
            <span class="ami-pseudo">{{ ami.pseudo }}</span>
          </div>
          <button class="btn-remove" @click="confirmRemove(ami)">
            <ion-icon :icon="closeOutline" />
          </button>
        </div>
      </div>

      <!-- Alert de confirmation suppression -->
      <ion-alert
        :is-open="showRemoveAlert"
        header="Supprimer l'ami"
        :message="`Voulez-vous vraiment retirer ${amiToRemove?.pseudo} de vos amis ?`"
        :buttons="[
          { text: 'Annuler', role: 'cancel', handler: () => { showRemoveAlert = false } },
          { text: 'Supprimer', role: 'destructive', handler: handleRemoveFriend }
        ]"
        @didDismiss="showRemoveAlert = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonContent, IonIcon, IonSpinner, IonAlert } from '@ionic/vue';
import { chevronBackOutline, peopleOutline, personCircleOutline, closeOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const searchQuery = ref('');
const showRemoveAlert = ref(false);
const amiToRemove = ref<any>(null);
const demandesCount = ref(0);

const amis = ref<any[]>([]);
const filteredAmis = ref<any[]>([]);
let currentUserId = '';

const loadAmis = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  currentUserId = user.id;

  const { data } = await supabase
    .from('amitie')
    .select('id_demandeur, id_receveur')
    .eq('statut', 'acceptee')
    .or(`id_demandeur.eq.${user.id},id_receveur.eq.${user.id}`);

  if (data) {
    const friendIds = data.map((a: any) =>
      a.id_demandeur === user.id ? a.id_receveur : a.id_demandeur
    );

    if (friendIds.length > 0) {
      const { data: users } = await supabase
        .from('utilisateur')
        .select('id, pseudo, photo_profil')
        .in('id', friendIds);

      if (users) {
        amis.value = users;
        filteredAmis.value = users;
      }
    }
  }

  // Compter les demandes en attente
  const { count } = await supabase
    .from('amitie')
    .select('*', { count: 'exact', head: true })
    .eq('id_receveur', user.id)
    .eq('statut', 'en_attente');

  demandesCount.value = count || 0;

  loading.value = false;
};

const filterAmis = () => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) {
    filteredAmis.value = amis.value;
  } else {
    filteredAmis.value = amis.value.filter(a =>
      a.pseudo.toLowerCase().includes(q)
    );
  }
};

const confirmRemove = (ami: any) => {
  amiToRemove.value = ami;
  showRemoveAlert.value = true;
};

const handleRemoveFriend = async () => {
  if (!amiToRemove.value) return;
  const friendId = amiToRemove.value.id;

  await supabase
    .from('amitie')
    .delete()
    .or(`and(id_demandeur.eq.${currentUserId},id_receveur.eq.${friendId}),and(id_demandeur.eq.${friendId},id_receveur.eq.${currentUserId})`);

  amis.value = amis.value.filter(a => a.id !== friendId);
  filteredAmis.value = filteredAmis.value.filter(a => a.id !== friendId);
  showRemoveAlert.value = false;
  amiToRemove.value = null;
};

onMounted(loadAmis);
</script>

<style scoped>
.amis-content {
  --background: #4ECDC4;
}

.header-bar {
  display: flex;
  align-items: center;
  padding: 15px 15px 5px;
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

.search-row {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  gap: 10px;
}

.search-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 25px;
  padding: 0;
}

.search-input {
  width: 100%;
  padding: 10px 18px;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  color: #333333;
  outline: none;
  background: transparent;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: #aaaaaa;
}

.btn-demandes {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 28px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
}

.badge-count {
  position: absolute;
  top: -5px;
  right: -8px;
  background: #eb445a;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-container {
  text-align: center;
  padding: 40px;
  color: #ffffff;
}

.empty-container p {
  font-size: 15px;
}

.amis-list {
  padding: 5px 15px;
}

.ami-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 10px 15px;
  margin-bottom: 8px;
}

.ami-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex: 1;
}

.ami-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  flex-shrink: 0;
}

.ami-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 42px;
  color: #cccccc;
}

.ami-pseudo {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #333333;
  font-size: 22px;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
}
</style>
