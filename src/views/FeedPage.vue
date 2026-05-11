<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mon Profil</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/notifications">
            <ion-icon slot="icon-only" :icon="notificationsOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="loading && publications.length === 0" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="publications.length === 0" class="empty-container">
        <ion-icon :icon="newspaperOutline" size="large" />
        <p>Aucune publication pour le moment</p>
      </div>

      <div v-else class="feed-list">
        <div v-for="pub in publications" :key="pub.id" class="publication-card">
          <div class="pub-header" @click="goToProfile(pub.utilisateur.id)">
            <div class="pub-avatar">
              <img
                v-if="pub.utilisateur.photo_profil"
                :src="pub.utilisateur.photo_profil"
                alt="Avatar"
              />
              <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
            </div>
            <div class="pub-author-info">
              <span class="pub-author">{{ pub.utilisateur.pseudo }}</span>
              <span class="pub-date">{{ formatDate(pub.date_publication) }}</span>
            </div>
          </div>

          <div v-if="pub.photo_url" class="pub-image">
            <img :src="pub.photo_url" alt="Publication" />
          </div>

          <div v-if="pub.entrainement" class="pub-entrainement">
            <div class="entrainement-badge">
              <ion-icon :icon="fitnessOutline" />
              <span>{{ pub.entrainement.nom }}</span>
            </div>
            <div class="entrainement-details">
              <span v-if="pub.entrainement.distance_km">{{ pub.entrainement.distance_km }} km</span>
              <span v-if="pub.entrainement.duree">{{ pub.entrainement.duree }}</span>
              <span v-if="pub.entrainement.calories">{{ pub.entrainement.calories }} cal</span>
            </div>
          </div>

          <div v-if="pub.description" class="pub-description">
            <p><strong>{{ pub.utilisateur.pseudo }}</strong> {{ pub.description }}</p>
          </div>

          <div class="pub-actions">
            <button class="action-btn" @click="toggleReaction(pub)">
              <ion-icon :icon="pub.userReaction ? heart : heartOutline" :class="{ liked: pub.userReaction }" />
              <span>{{ pub.reactionCount }}</span>
            </button>
            <button class="action-btn" @click="goToComments(pub.id)">
              <ion-icon :icon="chatbubbleOutline" />
              <span>{{ pub.commentCount }}</span>
            </button>
            <button class="action-btn" @click="sharePublication(pub)">
              <ion-icon :icon="shareSocialOutline" />
            </button>
          </div>
        </div>

        <ion-infinite-scroll @ionInfinite="loadMore" :disabled="noMoreData">
          <ion-infinite-scroll-content loading-spinner="crescent" />
        </ion-infinite-scroll>
      </div>

      <!-- Bouton flottant + -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" @click="showActionChoice = true">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>

      <!-- Modal choix d'action -->
      <ion-modal :is-open="showActionChoice" @didDismiss="showActionChoice = false" :initial-breakpoint="0.35" :breakpoints="[0, 0.35]">
        <div class="modal-choice">
          <button class="close-btn" @click="showActionChoice = false">
            <ion-icon :icon="closeOutline" color="danger" />
          </button>
          <button class="choice-btn" @click="openEnregistrerEntrainement">
            Enregistrer un entrainement
          </button>
          <button class="choice-btn" @click="showCreationChoice = true; showActionChoice = false">
            Création
          </button>
        </div>
      </ion-modal>

      <!-- Modal sous-choix Création -->
      <ion-modal :is-open="showCreationChoice" @didDismiss="showCreationChoice = false" :initial-breakpoint="0.4" :breakpoints="[0, 0.4]">
        <div class="modal-choice">
          <button class="close-btn" @click="showCreationChoice = false">
            <ion-icon :icon="closeOutline" color="danger" />
          </button>
          <h2 class="modal-title">Création</h2>
          <button class="choice-btn" @click="openCreerPublication">
            Créer un entrainement
          </button>
          <button class="choice-btn" @click="showCreationChoice = false">
            Créer un défis
          </button>
        </div>
      </ion-modal>

      <!-- Modal création publication / entrainement -->
      <ion-modal :is-open="showCreateForm" @didDismiss="resetForm">
        <ion-content class="create-content">
          <div class="create-header">
            <h1>Nouvel entrainement</h1>
          </div>

          <div class="create-form">
            <div class="photo-picker" @click="pickPublicationPhoto">
              <img v-if="newPub.photoPreview" :src="newPub.photoPreview" alt="Aperçu" class="photo-preview" />
              <span v-else class="photo-placeholder-text">Selectionner une photo</span>
            </div>

            <div class="activity-select">
              <select v-model="newPub.typeActivite" class="select-activite">
                <option value="" disabled>Sélectionner une activité</option>
                <option value="course">Course</option>
                <option value="velo">Vélo</option>
                <option value="natation">Natation</option>
                <option value="musculation">Musculation</option>
                <option value="marche">Marche</option>
                <option value="yoga">Yoga</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div class="metrics-row">
              <div class="metric-group">
                <label>Durée</label>
                <div class="time-input">
                  <input v-model="newPub.heures" type="number" min="0" max="23" placeholder="00" class="time-field" />
                  <span>:</span>
                  <input v-model="newPub.minutes" type="number" min="0" max="59" placeholder="00" class="time-field" />
                  <span>:</span>
                  <input v-model="newPub.secondes" type="number" min="0" max="59" placeholder="00" class="time-field" />
                </div>
              </div>
              <div class="metric-group">
                <label>Distance</label>
                <div class="distance-input">
                  <input v-model="newPub.distance" type="number" min="0" step="0.1" placeholder="00" class="distance-field" />
                  <span>KM</span>
                </div>
              </div>
            </div>

            <div class="description-section">
              <h3>Description</h3>
              <textarea
                v-model="newPub.description"
                placeholder="Décrivez votre entraînement..."
                rows="3"
                class="description-textarea"
              ></textarea>
            </div>

            <p v-if="createError" class="error-text">{{ createError }}</p>

            <div class="form-actions">
              <button class="btn-publier" :disabled="publishing" @click="handlePublish">
                <ion-spinner v-if="publishing" name="crescent" />
                <span v-else>Publier</span>
              </button>
              <button class="btn-annuler" @click="resetForm">Annuler</button>
            </div>
          </div>

          <input
            ref="pubFileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onPubPhotoSelected"
          />
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner, IonRefresher,
  IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
  IonFab, IonFabButton, IonModal
} from '@ionic/vue';
import {
  notificationsOutline, newspaperOutline, personCircleOutline,
  heartOutline, heart, chatbubbleOutline, shareSocialOutline,
  addOutline, closeOutline, fitnessOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const loading = ref(true);
const publishing = ref(false);
const noMoreData = ref(false);
const createError = ref('');

const publications = ref<any[]>([]);
const currentUserId = ref('');
const PAGE_SIZE = 10;
let currentPage = 0;

const showActionChoice = ref(false);
const showCreationChoice = ref(false);
const showCreateForm = ref(false);

const pubFileInput = ref<HTMLInputElement | null>(null);
let pubPhotoFile: File | null = null;

const newPub = ref({
  description: '',
  typeActivite: '',
  heures: '',
  minutes: '',
  secondes: '',
  distance: '',
  photoPreview: ''
});

const loadPublications = async (reset = false) => {
  if (reset) {
    currentPage = 0;
    publications.value = [];
    noMoreData.value = false;
  }

  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('publication')
    .select(`
      id, description, photo_url, date_publication,
      id_entrainement, id_publication_originale,
      utilisateur(id, pseudo, photo_profil),
      entrainement(id, nom, type_activite, distance_km, duree, calories)
    `)
    .order('date_publication', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Erreur chargement publications:', error.message);
    loading.value = false;
    return;
  }

  if (data) {
    const enriched = await Promise.all(data.map(async (pub: any) => {
      const { count: reactionCount } = await supabase
        .from('reaction')
        .select('*', { count: 'exact', head: true })
        .eq('id_publication', pub.id);

      const { count: commentCount } = await supabase
        .from('commentaire')
        .select('*', { count: 'exact', head: true })
        .eq('id_publication', pub.id);

      let userReaction = null;
      if (currentUserId.value) {
        const { data: reactionData } = await supabase
          .from('reaction')
          .select('id')
          .eq('id_publication', pub.id)
          .eq('id_utilisateur', currentUserId.value)
          .maybeSingle();
        userReaction = reactionData;
      }

      return {
        ...pub,
        reactionCount: reactionCount || 0,
        commentCount: commentCount || 0,
        userReaction
      };
    }));

    if (enriched.length < PAGE_SIZE) {
      noMoreData.value = true;
    }

    publications.value = [...publications.value, ...enriched];
    currentPage++;
  }

  loading.value = false;
};

const handleRefresh = async (event: CustomEvent) => {
  await loadPublications(true);
  (event.target as HTMLIonRefresherElement).complete();
};

const loadMore = async (event: CustomEvent) => {
  await loadPublications();
  (event.target as HTMLIonInfiniteScrollElement).complete();
};

const toggleReaction = async (pub: any) => {
  if (!currentUserId.value) return;

  if (pub.userReaction) {
    await supabase
      .from('reaction')
      .delete()
      .eq('id_publication', pub.id)
      .eq('id_utilisateur', currentUserId.value);
    pub.userReaction = null;
    pub.reactionCount--;
  } else {
    const { data } = await supabase
      .from('reaction')
      .insert({
        id_utilisateur: currentUserId.value,
        id_publication: pub.id,
        type_reaction: 'like'
      })
      .select('id')
      .single();
    pub.userReaction = data;
    pub.reactionCount++;
  }
};

const goToProfile = (userId: string) => {
  if (userId === currentUserId.value) {
    router.push('/profil');
  } else {
    router.push(`/utilisateur/${userId}`);
  }
};

const goToComments = (pubId: string) => {
  // Sera implémenté dans l'issue #7
};

const sharePublication = async (pub: any) => {
  if (!currentUserId.value) return;

  await supabase.from('publication').insert({
    id_utilisateur: currentUserId.value,
    id_publication_originale: pub.id_publication_originale || pub.id,
    description: pub.description,
    photo_url: pub.photo_url
  });

  await loadPublications(true);
};

const openEnregistrerEntrainement = () => {
  showActionChoice.value = false;
  showCreateForm.value = true;
};

const openCreerPublication = () => {
  showCreationChoice.value = false;
  showCreateForm.value = true;
};

const pickPublicationPhoto = () => {
  pubFileInput.value?.click();
};

const onPubPhotoSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  pubPhotoFile = input.files[0];
  newPub.value.photoPreview = URL.createObjectURL(pubPhotoFile);
};

const handlePublish = async () => {
  if (!newPub.value.typeActivite) {
    createError.value = 'Veuillez sélectionner une activité.';
    return;
  }

  publishing.value = true;
  createError.value = '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let photoUrl: string | null = null;

  if (pubPhotoFile) {
    const fileExt = pubPhotoFile.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('publications')
      .upload(filePath, pubPhotoFile);

    if (uploadError) {
      createError.value = 'Erreur lors de l\'upload de la photo.';
      publishing.value = false;
      return;
    }

    const { data: urlData } = supabase.storage
      .from('publications')
      .getPublicUrl(filePath);

    photoUrl = urlData.publicUrl;
  }

  const h = newPub.value.heures || '0';
  const m = newPub.value.minutes || '0';
  const s = newPub.value.secondes || '0';
  const duree = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;

  const { data: entrainement, error: entrError } = await supabase
    .from('entrainement')
    .insert({
      id_utilisateur: user.id,
      nom: newPub.value.typeActivite,
      type_activite: newPub.value.typeActivite,
      distance_km: newPub.value.distance ? parseFloat(newPub.value.distance) : null,
      duree: duree !== '00:00:00' ? duree : null,
      date_enregistrement: new Date().toISOString()
    })
    .select('id')
    .single();

  if (entrError) {
    createError.value = 'Erreur lors de la création de l\'entraînement.';
    publishing.value = false;
    return;
  }

  const { error: pubError } = await supabase
    .from('publication')
    .insert({
      id_utilisateur: user.id,
      id_entrainement: entrainement?.id || null,
      photo_url: photoUrl,
      description: newPub.value.description || null
    });

  publishing.value = false;

  if (pubError) {
    createError.value = 'Erreur lors de la publication.';
    return;
  }

  resetForm();
  await loadPublications(true);
};

const resetForm = () => {
  showCreateForm.value = false;
  newPub.value = {
    description: '',
    typeActivite: '',
    heures: '',
    minutes: '',
    secondes: '',
    distance: '',
    photoPreview: ''
  };
  pubPhotoFile = null;
  createError.value = '';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

onMounted(() => loadPublications(true));
</script>

<style scoped>
.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}

.feed-list {
  padding-bottom: 80px;
}

/* Publication card */
.publication-card {
  background: #ffffff;
  margin-bottom: 8px;
  border-bottom: 1px solid #eeeeee;
}

.pub-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
}

.pub-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 10px;
  background: #e0e0e0;
  flex-shrink: 0;
}

.pub-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 40px;
  color: #cccccc;
}

.pub-author-info {
  display: flex;
  flex-direction: column;
}

.pub-author {
  font-weight: 600;
  font-size: 15px;
  color: #333333;
}

.pub-date {
  font-size: 12px;
  color: #999999;
}

.pub-image {
  width: 100%;
}

.pub-image img {
  width: 100%;
  display: block;
}

.pub-entrainement {
  padding: 8px 15px;
  background: #f0faf9;
  border-left: 3px solid #4ECDC4;
  margin: 0 15px;
  border-radius: 5px;
}

.entrainement-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #4ECDC4;
  font-size: 14px;
  margin-bottom: 3px;
}

.entrainement-details {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666666;
}

.pub-description {
  padding: 8px 15px;
}

.pub-description p {
  margin: 0;
  font-size: 14px;
  color: #333333;
  line-height: 1.4;
}

.pub-actions {
  display: flex;
  padding: 8px 15px;
  gap: 20px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: #666666;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}

.action-btn ion-icon {
  font-size: 20px;
}

.action-btn .liked {
  color: #eb445a;
}

/* Modals */
.modal-choice {
  padding: 20px 25px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  font-size: 22px;
  cursor: pointer;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px;
  color: #333333;
}

.choice-btn {
  display: block;
  width: 100%;
  padding: 18px;
  background: #4ECDC4;
  color: #333333;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 15px;
  text-align: center;
}

/* Formulaire création */
.create-content {
  --background: #ffffff;
}

.create-header {
  background: #4ECDC4;
  padding: 20px;
  border-radius: 0 0 20px 20px;
  text-align: center;
}

.create-header h1 {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.create-form {
  padding: 20px;
}

.photo-picker {
  width: 100%;
  aspect-ratio: 4/3;
  background: #cccccc;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  margin-bottom: 20px;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder-text {
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
}

.activity-select {
  margin-bottom: 15px;
}

.select-activite {
  width: 100%;
  padding: 12px 15px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 15px;
  appearance: none;
  cursor: pointer;
  text-align: center;
}

.select-activite option {
  background: #ffffff;
  color: #333333;
}

.metrics-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.metric-group {
  flex: 1;
}

.metric-group label {
  display: block;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #4ECDC4;
  margin-bottom: 5px;
}

.time-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.time-field {
  width: 40px;
  padding: 8px 4px;
  border: none;
  border-bottom: 2px solid #4ECDC4;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  background: transparent;
  outline: none;
}

.time-input span {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
}

.distance-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.distance-field {
  width: 60px;
  padding: 8px 4px;
  border: none;
  border-bottom: 2px solid #4ECDC4;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  background: transparent;
  outline: none;
}

.distance-input span {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.description-section {
  margin-bottom: 20px;
}

.description-section h3 {
  text-align: center;
  color: #4ECDC4;
  font-size: 16px;
  margin: 0 0 8px;
}

.description-textarea {
  width: 100%;
  padding: 12px;
  border: none;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 14px;
  color: #333333;
  resize: none;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.error-text {
  color: #eb445a;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn-publier {
  padding: 12px 30px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-publier:disabled {
  opacity: 0.7;
}

.btn-annuler {
  padding: 12px 30px;
  background: #eb445a;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
