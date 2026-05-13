<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mon espace</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <span class="logout-text">déconnexion</span>
            <ion-icon slot="end" :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <!-- Résumé du jour -->
      <div class="day-summary">
        <div class="day-header">{{ jourSemaine }}</div>
        <div class="day-stats">
          <div class="day-stat">
            <ion-icon :icon="footstepsOutline" class="stat-icon" />
            <span>{{ todayPas }} pas</span>
          </div>
          <div class="day-stat">
            <ion-icon :icon="flameOutline" class="stat-icon" />
            <span>{{ todayCalories }} calories</span>
          </div>
        </div>
      </div>

      <!-- Bouton enregistrer -->
      <div class="action-section">
        <button class="btn-enregistrer" @click="$router.push('/enregistrer-entrainement')">
          Enregistrer un entrainement
        </button>
      </div>

      <div class="separator"></div>

      <!-- Historique -->
      <div class="section">
        <h3 class="section-title">Historique</h3>
        <button class="section-link" @click="$router.push('/historique-pas')">
          <span>Pas et calories</span>
          <ion-icon :icon="chevronForwardOutline" />
        </button>
        <button class="section-link" @click="$router.push('/historique-entrainements')">
          <span>Entrainements</span>
          <ion-icon :icon="chevronForwardOutline" />
        </button>
      </div>

      <div class="separator"></div>

      <!-- Paramètres -->
      <div class="section">
        <h3 class="section-title">Paramètres</h3>
        <button class="section-link" @click="$router.push('/profil')">
          <span>Mon profil</span>
          <ion-icon :icon="chevronForwardOutline" />
        </button>
        <button class="section-link" @click="showChangePassword = true">
          <span>Changer mot de passe</span>
          <ion-icon :icon="chevronForwardOutline" />
        </button>
        <button class="section-link danger-link" @click="showDeleteConfirm = true">
          <span>Supprimer compte</span>
        </button>
      </div>

      <!-- Modal changer mot de passe -->
      <ion-modal :is-open="showChangePassword" @didDismiss="showChangePassword = false" :initial-breakpoint="0.45" :breakpoints="[0, 0.45]">
        <div class="modal-content">
          <h3>Changer mot de passe</h3>
          <input v-model="newPassword" type="password" placeholder="Nouveau mot de passe" class="modal-input" />
          <input v-model="confirmPassword" type="password" placeholder="Confirmer le mot de passe" class="modal-input" />
          <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="success-text">{{ passwordSuccess }}</p>
          <button class="btn-modal" @click="handleChangePassword">Confirmer</button>
        </div>
      </ion-modal>

      <!-- Alert suppression compte -->
      <ion-alert
        :is-open="showDeleteConfirm"
        header="Supprimer le compte"
        message="Cette action est irréversible. Toutes vos données seront supprimées."
        :buttons="[
          { text: 'Annuler', role: 'cancel', handler: () => { showDeleteConfirm = false } },
          { text: 'Supprimer', role: 'destructive', handler: handleDeleteAccount }
        ]"
        @didDismiss="showDeleteConfirm = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonModal, IonAlert
} from '@ionic/vue';
import {
  logOutOutline, footstepsOutline, flameOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const showChangePassword = ref(false);
const showDeleteConfirm = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref('');
const passwordSuccess = ref('');

const todayPas = ref(0);
const todayCalories = ref(0);

const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const jourSemaine = jours[new Date().getDay()];

const loadTodayStats = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('historique_pas')
    .select('nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .eq('jour', today)
    .maybeSingle();

  if (data) {
    todayPas.value = data.nb_pas;
    todayCalories.value = data.calories;
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.replace('/login');
};

const handleChangePassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (!newPassword.value || newPassword.value.length < 6) {
    passwordError.value = 'Le mot de passe doit contenir au moins 6 caractères.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Les mots de passe ne correspondent pas.';
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword.value
  });

  if (error) {
    passwordError.value = 'Erreur lors du changement de mot de passe.';
  } else {
    passwordSuccess.value = 'Mot de passe modifié !';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => { showChangePassword.value = false; }, 1500);
  }
};

const handleDeleteAccount = async () => {
  await supabase.auth.signOut();
  router.replace('/login');
};

onMounted(loadTodayStats);
</script>

<style scoped>
.logout-text {
  font-size: 0.85rem;
}

/* Résumé du jour */
.day-summary {
  margin: 20px 15px;
  border: 1.5px solid #4ECDC4;
  border-radius: 12px;
  overflow: hidden;
}

.day-header {
  background: #4ECDC4;
  color: #ffffff;
  text-align: center;
  padding: 8px;
  font-size: 16px;
  font-weight: 600;
}

.day-stats {
  display: flex;
}

.day-stat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(78, 205, 196, 0.15);
}

.day-stat:first-child {
  border-right: 1px solid #4ECDC4;
}

.stat-icon {
  font-size: 22px;
  color: #4ECDC4;
}

.day-stat span {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}

/* Bouton enregistrer */
.action-section {
  padding: 10px 15px 20px;
}

.btn-enregistrer {
  width: 100%;
  padding: 14px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 30px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}

.separator {
  height: 2px;
  background: #4ECDC4;
  margin: 0 15px;
}

/* Sections */
.section {
  padding: 20px 15px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 12px;
}

.section-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 15px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 8px;
}

.section-link ion-icon {
  font-size: 20px;
}

.danger-link {
  background: transparent;
  border: 1.5px solid #eb445a;
  color: #eb445a;
}

/* Modal */
.modal-content {
  padding: 25px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 15px;
  text-align: center;
  color: #333333;
}

.modal-input {
  width: 100%;
  padding: 12px 15px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  color: #333333;
  outline: none;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.error-text {
  color: #eb445a;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.success-text {
  color: #28a745;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.btn-modal {
  width: 100%;
  padding: 12px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 5px;
}
</style>
