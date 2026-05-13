<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/feed" />
        </ion-buttons>
        <ion-title>Publication</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>
      <div v-else-if="publication" class="detail-container">
        <!-- Publication -->
        <div class="pub-header" @click="goToProfile(publication.utilisateur.id)">
          <div class="pub-avatar">
            <img
              v-if="publication.utilisateur.photo_profil"
              :src="publication.utilisateur.photo_profil"
              alt="Avatar"
            />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
          </div>
          <div class="pub-author-info">
            <span class="pub-author">{{ publication.utilisateur.pseudo }}</span>
            <span class="pub-date">{{ formatDate(publication.date_publication) }}</span>
          </div>
        </div>

        <div v-if="publication.photo_url" class="pub-image">
          <img :src="publication.photo_url" alt="Publication" />
        </div>

        <div v-if="publication.entrainement" class="pub-entrainement">
          <div class="entrainement-badge">
            <ion-icon :icon="fitnessOutline" />
            <span>{{ publication.entrainement.nom }}</span>
          </div>
          <div class="entrainement-details">
            <span v-if="publication.entrainement.distance_km">{{ publication.entrainement.distance_km }} km</span>
            <span v-if="publication.entrainement.duree">{{ publication.entrainement.duree }}</span>
            <span v-if="publication.entrainement.calories">{{ publication.entrainement.calories }} cal</span>
          </div>
        </div>

        <div v-if="publication.description" class="pub-description">
          <p><strong>{{ publication.utilisateur.pseudo }}</strong> {{ publication.description }}</p>
        </div>

        <!-- Réactions avec types -->
        <div class="reactions-section">
          <div class="reactions-summary">
            <span v-for="(count, type) in reactionCounts" :key="type" class="reaction-badge">
              {{ reactionEmoji(type as string) }} {{ count }}
            </span>
          </div>
          <div class="reaction-buttons">
            <button
              v-for="rType in reactionTypes"
              :key="rType.value"
              class="reaction-btn"
              :class="{ active: userReactionType === rType.value }"
              @click="setReaction(rType.value)"
            >
              <span class="reaction-emoji">{{ rType.emoji }}</span>
              <span class="reaction-label">{{ rType.label }}</span>
            </button>
          </div>
        </div>

        <!-- Commentaires -->
        <div class="comments-section">
          <h3 class="comments-title">Commentaires ({{ commentaires.length }})</h3>

          <div v-if="commentaires.length === 0" class="no-comments">
            <p>Aucun commentaire</p>
          </div>

          <div v-for="com in commentaires" :key="com.id" class="comment-item">
            <div class="comment-avatar" @click="goToProfile(com.utilisateur.id)">
              <img
                v-if="com.utilisateur.photo_profil"
                :src="com.utilisateur.photo_profil"
                alt="Avatar"
              />
              <ion-icon v-else :icon="personCircleOutline" class="comment-avatar-default" />
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author" @click="goToProfile(com.utilisateur.id)">
                  {{ com.utilisateur.pseudo }}
                </span>
                <span class="comment-date">{{ formatDate(com.date_commentaire) }}</span>
              </div>
              <p class="comment-text">{{ com.contenu }}</p>
              <button
                v-if="com.utilisateur.id === currentUserId"
                class="comment-delete"
                @click="deleteComment(com.id)"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barre de saisie commentaire -->
      <div class="comment-input-bar">
        <input
          v-model="newComment"
          type="text"
          placeholder="Ajouter un commentaire..."
          class="comment-input"
          @keyup.enter="postComment"
        />
        <button
          class="comment-send"
          :disabled="!newComment.trim() || sending"
          @click="postComment"
        >
          <ion-icon :icon="sendOutline" />
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSpinner
} from '@ionic/vue';
import { personCircleOutline, fitnessOutline, sendOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const sending = ref(false);
const currentUserId = ref('');
const newComment = ref('');

const publication = ref<any>(null);
const commentaires = ref<any[]>([]);
const reactionCounts = ref<Record<string, number>>({});
const userReactionType = ref<string | null>(null);

const reactionTypes = [
  { value: 'like', emoji: '❤️', label: 'Like' },
  { value: 'bravo', emoji: '👏', label: 'Bravo' },
  { value: 'force', emoji: '💪', label: 'Force' },
  { value: 'feu', emoji: '🔥', label: 'Feu' }
];

const reactionEmoji = (type: string): string => {
  const found = reactionTypes.find(r => r.value === type);
  return found ? found.emoji : '❤️';
};

const loadPublication = async () => {
  loading.value = true;
  const pubId = route.params.id as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const { data } = await supabase
    .from('publication')
    .select(`
      id, description, photo_url, date_publication,
      utilisateur(id, pseudo, photo_profil),
      entrainement(id, nom, type_activite, distance_km, duree, calories)
    `)
    .eq('id', pubId)
    .single();

  if (data) {
    publication.value = data;
  }

  await loadReactions(pubId);
  await loadCommentaires(pubId);

  loading.value = false;
};

const loadReactions = async (pubId: string) => {
  const { data: reactions } = await supabase
    .from('reaction')
    .select('type_reaction, id_utilisateur')
    .eq('id_publication', pubId);

  const counts: Record<string, number> = {};
  userReactionType.value = null;

  if (reactions) {
    reactions.forEach((r: any) => {
      counts[r.type_reaction] = (counts[r.type_reaction] || 0) + 1;
      if (r.id_utilisateur === currentUserId.value) {
        userReactionType.value = r.type_reaction;
      }
    });
  }

  reactionCounts.value = counts;
};

const setReaction = async (type: string) => {
  if (!currentUserId.value || !publication.value) return;
  const pubId = publication.value.id;

  if (userReactionType.value === type) {
    // Retirer la réaction
    await supabase
      .from('reaction')
      .delete()
      .eq('id_publication', pubId)
      .eq('id_utilisateur', currentUserId.value);
  } else if (userReactionType.value) {
    // Changer le type de réaction
    await supabase
      .from('reaction')
      .update({ type_reaction: type })
      .eq('id_publication', pubId)
      .eq('id_utilisateur', currentUserId.value);
  } else {
    // Nouvelle réaction
    await supabase
      .from('reaction')
      .insert({
        id_utilisateur: currentUserId.value,
        id_publication: pubId,
        type_reaction: type
      });
  }

  await loadReactions(pubId);
};

const loadCommentaires = async (pubId: string) => {
  const { data } = await supabase
    .from('commentaire')
    .select('id, contenu, date_commentaire, utilisateur(id, pseudo, photo_profil)')
    .eq('id_publication', pubId)
    .order('date_commentaire', { ascending: true });

  if (data) {
    commentaires.value = data;
  }
};

const postComment = async () => {
  if (!newComment.value.trim() || !currentUserId.value || !publication.value) return;

  sending.value = true;

  const { error } = await supabase
    .from('commentaire')
    .insert({
      id_utilisateur: currentUserId.value,
      id_publication: publication.value.id,
      contenu: newComment.value.trim()
    });

  sending.value = false;

  if (!error) {
    newComment.value = '';
    await loadCommentaires(publication.value.id);
  }
};

const deleteComment = async (commentId: string) => {
  await supabase
    .from('commentaire')
    .delete()
    .eq('id', commentId)
    .eq('id_utilisateur', currentUserId.value);

  await loadCommentaires(publication.value.id);
};

const goToProfile = (userId: string) => {
  if (userId === currentUserId.value) {
    router.push('/profil');
  } else {
    router.push(`/utilisateur/${userId}`);
  }
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

onMounted(loadPublication);
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.detail-container {
  padding-bottom: 70px;
}

/* Publication header */
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

/* Réactions */
.reactions-section {
  padding: 10px 15px;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.reactions-summary {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.reaction-badge {
  font-size: 14px;
  color: #666666;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 15px;
}

.reaction-buttons {
  display: flex;
  justify-content: space-around;
}

.reaction-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reaction-btn.active {
  border-color: #4ECDC4;
  background: #f0faf9;
}

.reaction-emoji {
  font-size: 24px;
}

.reaction-label {
  font-size: 11px;
  color: #666666;
  margin-top: 2px;
}

/* Commentaires */
.comments-section {
  padding: 15px;
}

.comments-title {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  margin: 0 0 15px;
}

.no-comments {
  text-align: center;
  color: #999999;
  padding: 20px 0;
}

.no-comments p {
  margin: 0;
  font-size: 14px;
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  flex-shrink: 0;
  cursor: pointer;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-avatar-default {
  font-size: 32px;
  color: #cccccc;
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.comment-author {
  font-weight: 600;
  font-size: 14px;
  color: #333333;
  cursor: pointer;
}

.comment-date {
  font-size: 11px;
  color: #999999;
}

.comment-text {
  margin: 3px 0 0;
  font-size: 14px;
  color: #444444;
  line-height: 1.4;
}

.comment-delete {
  background: transparent;
  border: none;
  color: #eb445a;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
  margin-top: 3px;
}

/* Barre de saisie */
.comment-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background: #ffffff;
  border-top: 1px solid #e0e0e0;
  gap: 10px;
  z-index: 10;
}

.comment-input {
  flex: 1;
  padding: 10px 15px;
  border: 1.5px solid #e0e0e0;
  border-radius: 25px;
  font-size: 14px;
  color: #333333;
  outline: none;
  background: #f9f9f9;
}

.comment-input::placeholder {
  color: #aaaaaa;
}

.comment-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #4ECDC4;
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.comment-send:disabled {
  opacity: 0.5;
}

.comment-send ion-icon {
  font-size: 18px;
}
</style>
