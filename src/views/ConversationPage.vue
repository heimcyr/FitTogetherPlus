<template>
  <ion-page>
    <ion-content :fullscreen="true" class="conversation-content">
      <!-- Header turquoise -->
      <div class="conv-header">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <div class="header-user" @click="goToProfile">
          <div class="header-avatar">
            <img v-if="otherUser?.photo_profil" :src="otherUser.photo_profil" alt="Avatar" />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-default" />
          </div>
          <span class="header-pseudo">{{ otherUser?.pseudo || 'Conversation' }}</span>
        </div>
      </div>

      <!-- Bouton voir le profil -->
      <div v-if="otherUser" class="voir-profil-wrapper">
        <button class="btn-voir-profil" @click="goToProfile">Voir le profil</button>
      </div>

      <!-- Messages -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="loadingMessages" class="loading-messages">
          <ion-spinner name="crescent" color="primary" />
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="{ 'mine': msg.id_utilisateur === currentUserId }"
        >
          <div class="message-bubble" :class="msg.id_utilisateur === currentUserId ? 'bubble-mine' : 'bubble-other'">
            <p class="message-text">{{ msg.contenu }}</p>
          </div>
        </div>
      </div>

      <!-- Input message fixé en bas -->
      <div class="input-bar">
        <input
          v-model="newMessage"
          type="text"
          placeholder="votre message"
          class="message-input"
          @keyup.enter="sendMessage"
        />
        <button class="send-btn" :disabled="!newMessage.trim()" @click="sendMessage">
          <ion-icon :icon="sendOutline" />
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { chevronBackOutline, personCircleOutline, sendOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const route = useRoute();
const router = useRouter();
const loadingMessages = ref(true);
const messages = ref<any[]>([]);
const newMessage = ref('');
const currentUserId = ref('');
const otherUser = ref<any>(null);
const messagesContainer = ref<HTMLElement | null>(null);
let realtimeChannel: any = null;

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const loadConversation = async () => {
  loadingMessages.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  currentUserId.value = user.id;

  const convId = route.params.id as string;

  // Trouver l'autre participant via la table de jonction
  const { data: participants } = await supabase
    .from('participe_conversation')
    .select('id_utilisateur')
    .eq('id_conversation', convId)
    .neq('id_utilisateur', user.id);

  if (!participants || participants.length === 0) {
    loadingMessages.value = false;
    return;
  }

  const otherUserId = participants[0].id_utilisateur;

  // Charger l'autre utilisateur
  const { data: userData } = await supabase
    .from('utilisateur')
    .select('id, pseudo, photo_profil')
    .eq('id', otherUserId)
    .single();

  otherUser.value = userData;

  // Charger les messages
  const { data: msgs } = await supabase
    .from('message')
    .select('id, id_utilisateur, contenu, date_envoi, est_lu')
    .eq('id_conversation', convId)
    .order('date_envoi', { ascending: true });

  messages.value = msgs || [];
  loadingMessages.value = false;

  // Marquer les messages reçus comme lus
  await supabase
    .from('message')
    .update({ est_lu: true })
    .eq('id_conversation', convId)
    .neq('id_utilisateur', user.id)
    .eq('est_lu', false);

  scrollToBottom();

  // Abonnement temps réel
  realtimeChannel = supabase
    .channel(`conversation-${convId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message',
        filter: `id_conversation=eq.${convId}`
      },
      async (payload: any) => {
        const newMsg = payload.new;
        // Éviter les doublons
        if (!messages.value.find((m: any) => m.id === newMsg.id)) {
          messages.value.push(newMsg);
          scrollToBottom();

          // Marquer comme lu si c'est un message reçu
          if (newMsg.id_utilisateur !== currentUserId.value) {
            await supabase
              .from('message')
              .update({ est_lu: true })
              .eq('id', newMsg.id);
          }
        }
      }
    )
    .subscribe();
};

const sendMessage = async () => {
  const text = newMessage.value.trim();
  if (!text || !currentUserId.value) return;

  const convId = route.params.id as string;
  newMessage.value = '';

  const { data: msg } = await supabase
    .from('message')
    .insert({
      id_conversation: convId,
      id_utilisateur: currentUserId.value,
      contenu: text
    })
    .select('id, id_utilisateur, contenu, date_envoi, est_lu')
    .single();

  if (msg && !messages.value.find((m: any) => m.id === msg.id)) {
    messages.value.push(msg);
    scrollToBottom();
  }
};

const goToProfile = () => {
  if (!otherUser.value) return;
  if (otherUser.value.id === currentUserId.value) {
    router.push('/profil');
  } else {
    router.push(`/utilisateur/${otherUser.value.id}`);
  }
};

onMounted(() => loadConversation());

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});
</script>

<style scoped>
.conversation-content {
  --background: #ffffff;
  display: flex;
  flex-direction: column;
}

/* Header */
.conv-header {
  background: #4ECDC4;
  display: flex;
  align-items: center;
  padding: 15px;
  gap: 10px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid #ffffff;
}

.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-default {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.7);
}

.header-pseudo {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

/* Voir le profil */
.voir-profil-wrapper {
  display: flex;
  justify-content: center;
  padding: 10px;
}

.btn-voir-profil {
  padding: 8px 25px;
  background: #ffffff;
  color: #333333;
  border: 1.5px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px 15px;
  padding-bottom: 70px;
}

.loading-messages {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.message-row {
  display: flex;
  margin-bottom: 8px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.bubble-mine {
  background: #4ECDC4;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-other {
  background: #E8D5F5;
  color: #333333;
  border-bottom-left-radius: 4px;
}

.message-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
}

/* Input bar */
.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background: #ffffff;
  border-top: 1px solid #eeeeee;
  gap: 10px;
  z-index: 10;
}

.message-input {
  flex: 1;
  padding: 10px 15px;
  border: 1.5px solid #e0e0e0;
  border-radius: 25px;
  font-size: 15px;
  color: #333333;
  outline: none;
  background: #f8f8f8;
  box-sizing: border-box;
  min-width: 0;
}

.message-input::placeholder {
  color: #aaaaaa;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  flex-shrink: 0;
}

.send-btn:disabled {
  opacity: 0.5;
}
</style>
