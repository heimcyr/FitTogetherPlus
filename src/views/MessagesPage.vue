<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Messages</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="loading && conversations.length === 0" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="conversations.length === 0" class="empty-container">
        <ion-icon :icon="chatbubblesOutline" class="empty-icon" />
        <p>Aucune conversation</p>
        <p class="empty-hint">Envoie un message à un ami pour commencer !</p>
      </div>

      <div v-else class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ 'unread': conv.unread }"
          @click="openConversation(conv)"
        >
          <div class="conv-avatar">
            <img
              v-if="conv.otherUser?.photo_profil"
              :src="conv.otherUser.photo_profil"
              alt="Avatar"
            />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
          </div>
          <div class="conv-info">
            <div class="conv-top-row">
              <span class="conv-pseudo">{{ conv.otherUser?.pseudo || 'Inconnu' }}</span>
              <span class="conv-date">{{ formatDate(conv.lastMessageDate) }}</span>
            </div>
            <p class="conv-last-message" :class="{ 'unread-text': conv.unread }">
              {{ conv.lastMessage || 'Aucun message' }}
            </p>
          </div>
          <div v-if="conv.unread" class="unread-dot" />
        </div>
      </div>

      <!-- FAB nouveau message -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" @click="showNewConvModal = true">
          <ion-icon :icon="createOutline" />
        </ion-fab-button>
      </ion-fab>

      <!-- Modal nouvelle conversation -->
      <ion-modal :is-open="showNewConvModal" @didDismiss="showNewConvModal = false">
        <ion-content class="new-conv-content">
          <div class="new-conv-header">
            <h1>Nouveau message</h1>
            <button class="close-btn" @click="showNewConvModal = false">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="search-wrapper">
            <ion-icon :icon="searchOutline" class="search-icon" />
            <input
              v-model="friendSearch"
              type="text"
              placeholder="Rechercher un ami..."
              class="search-input"
              @input="searchFriends"
            />
          </div>

          <div class="friends-list">
            <div
              v-for="friend in filteredFriends"
              :key="friend.id"
              class="friend-item"
              @click="startConversation(friend)"
            >
              <div class="friend-avatar">
                <img
                  v-if="friend.photo_profil"
                  :src="friend.photo_profil"
                  alt="Avatar"
                />
                <ion-icon v-else :icon="personCircleOutline" class="avatar-default-sm" />
              </div>
              <span class="friend-pseudo">{{ friend.pseudo }}</span>
            </div>
          </div>
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
  IonIcon, IonSpinner, IonRefresher, IonRefresherContent,
  IonFab, IonFabButton, IonModal
} from '@ionic/vue';
import {
  chatbubblesOutline, personCircleOutline, createOutline,
  closeOutline, searchOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const loading = ref(true);
const conversations = ref<any[]>([]);
const currentUserId = ref('');

const showNewConvModal = ref(false);
const friendSearch = ref('');
const allFriends = ref<any[]>([]);
const filteredFriends = ref<any[]>([]);

const loadConversations = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  currentUserId.value = user.id;

  // Charger les conversations où l'utilisateur est participant
  const { data: convs } = await supabase
    .from('conversation')
    .select('id, id_utilisateur1, id_utilisateur2, date_creation')
    .or(`id_utilisateur1.eq.${user.id},id_utilisateur2.eq.${user.id}`)
    .order('date_creation', { ascending: false });

  if (!convs) {
    loading.value = false;
    return;
  }

  const enriched = await Promise.all(convs.map(async (conv: any) => {
    const otherUserId = conv.id_utilisateur1 === user.id ? conv.id_utilisateur2 : conv.id_utilisateur1;

    // Charger l'autre utilisateur
    const { data: otherUser } = await supabase
      .from('utilisateur')
      .select('id, pseudo, photo_profil')
      .eq('id', otherUserId)
      .single();

    // Charger le dernier message
    const { data: lastMsg } = await supabase
      .from('message')
      .select('contenu, date_envoi, id_expediteur, lu')
      .eq('id_conversation', conv.id)
      .order('date_envoi', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Vérifier si non lu (dernier message pas de moi et pas lu)
    const unread = lastMsg && lastMsg.id_expediteur !== user.id && !lastMsg.lu;

    return {
      ...conv,
      otherUser,
      lastMessage: lastMsg?.contenu || null,
      lastMessageDate: lastMsg?.date_envoi || conv.date_creation,
      unread
    };
  }));

  // Trier par date du dernier message
  enriched.sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

  conversations.value = enriched;
  loading.value = false;
};

const loadFriends = async () => {
  if (!currentUserId.value) return;

  const { data } = await supabase
    .from('amitie')
    .select('id_demandeur, id_receveur')
    .eq('statut', 'accepte')
    .or(`id_demandeur.eq.${currentUserId.value},id_receveur.eq.${currentUserId.value}`);

  if (!data) return;

  const friendIds = data.map((a: any) =>
    a.id_demandeur === currentUserId.value ? a.id_receveur : a.id_demandeur
  );

  if (friendIds.length === 0) return;

  const { data: friends } = await supabase
    .from('utilisateur')
    .select('id, pseudo, photo_profil')
    .in('id', friendIds)
    .order('pseudo');

  allFriends.value = friends || [];
  filteredFriends.value = friends || [];
};

const searchFriends = () => {
  const query = friendSearch.value.toLowerCase().trim();
  if (!query) {
    filteredFriends.value = allFriends.value;
    return;
  }
  filteredFriends.value = allFriends.value.filter(
    (f: any) => f.pseudo.toLowerCase().includes(query)
  );
};

const startConversation = async (friend: any) => {
  showNewConvModal.value = false;

  // Vérifier si une conversation existe déjà
  const existing = conversations.value.find(
    (c: any) => c.otherUser?.id === friend.id
  );

  if (existing) {
    router.push(`/conversation/${existing.id}`);
    return;
  }

  // Créer la conversation
  const { data: conv, error } = await supabase
    .from('conversation')
    .insert({
      id_utilisateur1: currentUserId.value,
      id_utilisateur2: friend.id
    })
    .select('id')
    .single();

  if (error || !conv) return;

  router.push(`/conversation/${conv.id}`);
};

const openConversation = (conv: any) => {
  router.push(`/conversation/${conv.id}`);
};

const handleRefresh = async (event: CustomEvent) => {
  await loadConversations();
  (event.target as HTMLIonRefresherElement).complete();
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'maintenant';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

onMounted(async () => {
  await loadConversations();
  await loadFriends();
});
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

.empty-icon {
  font-size: 64px;
  color: #cccccc;
  margin-bottom: 10px;
}

.empty-hint {
  font-size: 13px;
  color: #aaaaaa;
}

/* Liste conversations */
.conversations-list {
  padding-bottom: 80px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 14px 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  gap: 12px;
}

.conversation-item.unread {
  background: #f0faf9;
}

.conv-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  flex-shrink: 0;
}

.conv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 50px;
  color: #cccccc;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.conv-pseudo {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.conv-date {
  font-size: 12px;
  color: #999999;
  flex-shrink: 0;
}

.conv-last-message {
  font-size: 13px;
  color: #999999;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-last-message.unread-text {
  color: #333333;
  font-weight: 600;
}

.unread-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ECDC4;
  flex-shrink: 0;
}

/* Modal nouvelle conversation */
.new-conv-content {
  --background: #ffffff;
}

.new-conv-header {
  background: #4ECDC4;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 20px 20px;
}

.new-conv-header h1 {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 26px;
  cursor: pointer;
  display: flex;
}

.search-wrapper {
  display: flex;
  align-items: center;
  margin: 15px;
  padding: 10px 15px;
  border: 1.5px solid #e0e0e0;
  border-radius: 25px;
  background: #ffffff;
}

.search-icon {
  font-size: 20px;
  color: #999999;
  margin-right: 10px;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 15px;
  color: #333333;
  background: transparent;
}

.friends-list {
  padding: 0 15px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.friend-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  flex-shrink: 0;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default-sm {
  font-size: 42px;
  color: #cccccc;
}

.friend-pseudo {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}
</style>
