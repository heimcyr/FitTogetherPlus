<template>
  <ion-page>
    <ion-content :fullscreen="true" class="story-viewer-content" @click="handleTap">
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="light" />
      </div>

      <template v-else-if="currentStory">
        <!-- Barre de progression en haut -->
        <div class="progress-bars">
          <div
            v-for="(story, index) in userStories"
            :key="story.id"
            class="progress-track"
          >
            <div
              class="progress-fill"
              :class="{ 'filled': index < currentIndex, 'active': index === currentIndex, 'empty': index > currentIndex }"
            />
          </div>
        </div>

        <!-- Header avec infos utilisateur -->
        <div class="story-header">
          <div class="story-user-info">
            <div class="story-user-avatar">
              <img v-if="storyUser?.photo_profil" :src="storyUser.photo_profil" alt="Avatar" />
              <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
            </div>
            <div class="story-user-meta">
              <span class="story-username">{{ storyUser?.pseudo || 'Inconnu' }}</span>
              <span class="story-time">{{ formatStoryTime(currentStory.date_publication) }}</span>
            </div>
          </div>
          <button class="close-btn" @click="closeViewer">
            <ion-icon :icon="closeOutline" />
          </button>
        </div>

        <!-- Image de la story -->
        <div class="story-image-container">
          <img :src="currentStory.media_url" alt="Story" class="story-image" />
        </div>

        <!-- Zones tap gauche/droite -->
        <div class="tap-zones">
          <div class="tap-left" @click.stop="prevStory" />
          <div class="tap-right" @click.stop="nextStory" />
        </div>

        <!-- Vues (si c'est ma story) -->
        <div v-if="isMyStory && viewers.length > 0" class="viewers-bar" @click.stop>
          <ion-icon :icon="eyeOutline" class="viewers-icon" />
          <span class="viewers-count">{{ viewers.length }} vue{{ viewers.length > 1 ? 's' : '' }}</span>
        </div>
      </template>

      <div v-else class="empty-container">
        <p>Aucune story disponible</p>
        <button class="btn-back" @click="closeViewer">Retour</button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { personCircleOutline, closeOutline, eyeOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const userStories = ref<any[]>([]);
const currentIndex = ref(0);
const currentUserId = ref('');
const storyUser = ref<any>(null);
const viewers = ref<any[]>([]);
let autoTimer: ReturnType<typeof setTimeout> | null = null;

const STORY_DURATION = 5000; // 5 secondes par story

const currentStory = computed(() => userStories.value[currentIndex.value] || null);
const isMyStory = computed(() => storyUser.value?.id === currentUserId.value);

const loadStories = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;

  const userId = route.params.userId as string;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Charger l'utilisateur
  const { data: userData } = await supabase
    .from('utilisateur')
    .select('id, pseudo, photo_profil')
    .eq('id', userId)
    .single();

  storyUser.value = userData;

  // Charger ses stories des dernières 24h
  const { data: storiesData } = await supabase
    .from('story')
    .select('id, media_url, date_publication')
    .eq('id_utilisateur', userId)
    .gte('date_publication', yesterday)
    .order('date_publication', { ascending: true });

  userStories.value = storiesData || [];

  // Trouver la première story non vue
  if (currentUserId.value && userStories.value.length > 0) {
    const { data: vues } = await supabase
      .from('vue_story')
      .select('id_story')
      .eq('id_utilisateur', currentUserId.value);

    const viewedIds = (vues || []).map((v: any) => v.id_story);
    const firstUnseen = userStories.value.findIndex((s: any) => !viewedIds.includes(s.id));
    currentIndex.value = firstUnseen >= 0 ? firstUnseen : 0;
  }

  loading.value = false;

  if (userStories.value.length > 0) {
    markAsSeen();
    startTimer();
    loadViewers();
  }
};

const markAsSeen = async () => {
  const story = currentStory.value;
  if (!story || !currentUserId.value) return;
  if (storyUser.value?.id === currentUserId.value) return; // Ne pas marquer ses propres stories

  await supabase.from('vue_story').upsert({
    id_story: story.id,
    id_utilisateur: currentUserId.value
  }, { onConflict: 'id_story,id_utilisateur' });
};

const loadViewers = async () => {
  const story = currentStory.value;
  if (!story || !isMyStory.value) return;

  const { data } = await supabase
    .from('vue_story')
    .select('id_utilisateur, utilisateur:utilisateur!id_utilisateur(pseudo)')
    .eq('id_story', story.id);

  viewers.value = data || [];
};

const startTimer = () => {
  clearTimer();
  autoTimer = setTimeout(() => {
    nextStory();
  }, STORY_DURATION);
};

const clearTimer = () => {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
};

const nextStory = () => {
  clearTimer();
  if (currentIndex.value < userStories.value.length - 1) {
    currentIndex.value++;
    markAsSeen();
    loadViewers();
    startTimer();
  } else {
    closeViewer();
  }
};

const prevStory = () => {
  clearTimer();
  if (currentIndex.value > 0) {
    currentIndex.value--;
    loadViewers();
    startTimer();
  }
};

const handleTap = () => {
  // Fallback tap
};

const closeViewer = () => {
  clearTimer();
  router.back();
};

const formatStoryTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes}min`;
  return `il y a ${hours}h`;
};

onMounted(() => loadStories());
onUnmounted(() => clearTimer());
</script>

<style scoped>
.story-viewer-content {
  --background: #000000;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ffffff;
}

.btn-back {
  margin-top: 15px;
  padding: 10px 25px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 20px;
  font-size: 15px;
  cursor: pointer;
}

/* Progress bars */
.progress-bars {
  display: flex;
  gap: 4px;
  padding: 10px 10px 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.filled {
  width: 100%;
  background: #ffffff;
}

.progress-fill.active {
  width: 100%;
  background: #ffffff;
  animation: fillProgress 5s linear forwards;
}

.progress-fill.empty {
  width: 0%;
}

@keyframes fillProgress {
  from { width: 0%; }
  to { width: 100%; }
}

/* Header */
.story-header {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  z-index: 10;
}

.story-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.story-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #333333;
}

.story-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 36px;
  color: #666666;
}

.story-user-meta {
  display: flex;
  flex-direction: column;
}

.story-username {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.story-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.close-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* Image */
.story-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Tap zones */
.tap-zones {
  position: absolute;
  top: 70px;
  bottom: 60px;
  left: 0;
  right: 0;
  display: flex;
  z-index: 5;
}

.tap-left,
.tap-right {
  flex: 1;
  cursor: pointer;
}

/* Viewers bar */
.viewers-bar {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 8px 18px;
  z-index: 10;
}

.viewers-icon {
  font-size: 18px;
  color: #ffffff;
}

.viewers-count {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
}
</style>
