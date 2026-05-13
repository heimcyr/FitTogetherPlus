<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/amis" />
        </ion-buttons>
        <ion-title>Demandes d'amitié</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else>
        <!-- Demandes reçues -->
        <div class="section">
          <h3 class="section-title">Demandes reçues</h3>
          <div v-if="demandesRecues.length === 0" class="empty-section">
            <p>Aucune demande en attente</p>
          </div>
          <div v-for="demande in demandesRecues" :key="demande.id_demandeur" class="demande-item">
            <div class="demande-info" @click="$router.push(`/utilisateur/${demande.utilisateur.id}`)">
              <div class="demande-avatar">
                <img v-if="demande.utilisateur.photo_profil" :src="demande.utilisateur.photo_profil" alt="Avatar" />
                <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
              </div>
              <div class="demande-text">
                <span class="demande-pseudo">{{ demande.utilisateur.pseudo }}</span>
                <span class="demande-date">{{ formatDate(demande.date_demande) }}</span>
              </div>
            </div>
            <div class="demande-actions">
              <button class="btn-accept" @click="acceptDemande(demande)">
                <ion-icon :icon="checkmarkOutline" />
              </button>
              <button class="btn-refuse" @click="refuseDemande(demande)">
                <ion-icon :icon="closeOutline" />
              </button>
              <button class="btn-block" @click="blockUser(demande)">
                <ion-icon :icon="banOutline" />
              </button>
            </div>
          </div>
        </div>

        <!-- Demandes envoyées -->
        <div class="section">
          <h3 class="section-title">Demandes envoyées</h3>
          <div v-if="demandesEnvoyees.length === 0" class="empty-section">
            <p>Aucune demande envoyée</p>
          </div>
          <div v-for="demande in demandesEnvoyees" :key="demande.id_receveur" class="demande-item">
            <div class="demande-info" @click="$router.push(`/utilisateur/${demande.utilisateur.id}`)">
              <div class="demande-avatar">
                <img v-if="demande.utilisateur.photo_profil" :src="demande.utilisateur.photo_profil" alt="Avatar" />
                <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
              </div>
              <div class="demande-text">
                <span class="demande-pseudo">{{ demande.utilisateur.pseudo }}</span>
                <span class="demande-date">En attente</span>
              </div>
            </div>
            <button class="btn-cancel" @click="cancelDemande(demande)">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSpinner
} from '@ionic/vue';
import { personCircleOutline, checkmarkOutline, closeOutline, banOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const demandesRecues = ref<any[]>([]);
const demandesEnvoyees = ref<any[]>([]);
let currentUserId = '';

const loadDemandes = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  currentUserId = user.id;

  // Demandes reçues
  const { data: recues } = await supabase
    .from('amitie')
    .select('id_demandeur, id_receveur, date_demande, statut')
    .eq('id_receveur', user.id)
    .eq('statut', 'en_attente');

  if (recues && recues.length > 0) {
    const demandeurIds = recues.map((d: any) => d.id_demandeur);
    const { data: users } = await supabase
      .from('utilisateur')
      .select('id, pseudo, photo_profil')
      .in('id', demandeurIds);

    demandesRecues.value = recues.map((d: any) => ({
      ...d,
      utilisateur: users?.find((u: any) => u.id === d.id_demandeur) || { id: d.id_demandeur, pseudo: '?', photo_profil: null }
    }));
  }

  // Demandes envoyées
  const { data: envoyees } = await supabase
    .from('amitie')
    .select('id_demandeur, id_receveur, date_demande, statut')
    .eq('id_demandeur', user.id)
    .eq('statut', 'en_attente');

  if (envoyees && envoyees.length > 0) {
    const receveurIds = envoyees.map((d: any) => d.id_receveur);
    const { data: users } = await supabase
      .from('utilisateur')
      .select('id, pseudo, photo_profil')
      .in('id', receveurIds);

    demandesEnvoyees.value = envoyees.map((d: any) => ({
      ...d,
      utilisateur: users?.find((u: any) => u.id === d.id_receveur) || { id: d.id_receveur, pseudo: '?', photo_profil: null }
    }));
  }

  loading.value = false;
};

const acceptDemande = async (demande: any) => {
  await supabase
    .from('amitie')
    .update({ statut: 'acceptee' })
    .eq('id_demandeur', demande.id_demandeur)
    .eq('id_receveur', currentUserId);

  demandesRecues.value = demandesRecues.value.filter(
    d => d.id_demandeur !== demande.id_demandeur
  );
};

const refuseDemande = async (demande: any) => {
  await supabase
    .from('amitie')
    .update({ statut: 'refusee' })
    .eq('id_demandeur', demande.id_demandeur)
    .eq('id_receveur', currentUserId);

  demandesRecues.value = demandesRecues.value.filter(
    d => d.id_demandeur !== demande.id_demandeur
  );
};

const blockUser = async (demande: any) => {
  await supabase
    .from('amitie')
    .update({ statut: 'bloquee' })
    .eq('id_demandeur', demande.id_demandeur)
    .eq('id_receveur', currentUserId);

  demandesRecues.value = demandesRecues.value.filter(
    d => d.id_demandeur !== demande.id_demandeur
  );
};

const cancelDemande = async (demande: any) => {
  await supabase
    .from('amitie')
    .delete()
    .eq('id_demandeur', currentUserId)
    .eq('id_receveur', demande.id_receveur);

  demandesEnvoyees.value = demandesEnvoyees.value.filter(
    d => d.id_receveur !== demande.id_receveur
  );
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days < 1) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

onMounted(loadDemandes);
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.section {
  padding: 15px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #4ECDC4;
}

.empty-section {
  text-align: center;
  padding: 15px;
  color: #999999;
}

.empty-section p {
  margin: 0;
  font-size: 14px;
}

.demande-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.demande-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}

.demande-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  flex-shrink: 0;
}

.demande-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 42px;
  color: #cccccc;
}

.demande-text {
  display: flex;
  flex-direction: column;
}

.demande-pseudo {
  font-weight: 600;
  font-size: 15px;
  color: #333333;
}

.demande-date {
  font-size: 12px;
  color: #999999;
}

.demande-actions {
  display: flex;
  gap: 8px;
}

.btn-accept {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #4ECDC4;
  border: none;
  color: #ffffff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-refuse {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eb445a;
  border: none;
  color: #ffffff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-block {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #666666;
  border: none;
  color: #ffffff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-cancel {
  padding: 6px 14px;
  background: transparent;
  border: 1.5px solid #999999;
  border-radius: 15px;
  color: #666666;
  font-size: 13px;
  cursor: pointer;
}
</style>
