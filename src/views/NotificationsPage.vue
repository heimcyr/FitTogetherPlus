<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/feed" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="unreadCount > 0" @click="markAllRead">
            <span class="tout-lire">Tout lire</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="notifications.length === 0" class="empty-container">
        <ion-icon :icon="notificationsOutline" class="empty-icon" />
        <p>Aucune notification</p>
      </div>

      <div v-else class="notif-list">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="notif-item"
          :class="{ 'notif-unread': !notif.est_lue }"
          @click="handleNotifClick(notif)"
        >
          <div class="notif-icon-wrapper" :class="notif.type">
            <ion-icon :icon="getIcon(notif.type)" class="notif-type-icon" />
          </div>
          <div class="notif-content">
            <p class="notif-message">{{ notif.message }}</p>
            <span class="notif-time">{{ formatTime(notif.date_envoi) }}</span>
          </div>
          <div v-if="!notif.est_lue" class="unread-dot"></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent
} from '@ionic/vue';
import {
  notificationsOutline, heartOutline, chatbubbleOutline,
  personAddOutline, ribbonOutline, trophyOutline, personCircleOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const notifications = ref<any[]>([]);
let realtimeChannel: any = null;

const unreadCount = computed(() => notifications.value.filter(n => !n.est_lue).length);

const getIcon = (type: string) => {
  const icons: Record<string, any> = {
    reaction: heartOutline,
    commentaire: chatbubbleOutline,
    amitie: personAddOutline,
    badge: ribbonOutline,
    defi: trophyOutline
  };
  return icons[type] || notificationsOutline;
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 30) return `${days}j`;
  return `${Math.floor(days / 30)}mois`;
};

const loadNotifications = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('notification')
    .select('id, type, message, est_lue, date_envoi')
    .eq('id_utilisateur', user.id)
    .order('date_envoi', { ascending: false })
    .limit(50);

  notifications.value = data || [];

  // Marquer toutes comme lues automatiquement après 2s
  setTimeout(() => markAllRead(), 2000);

  loading.value = false;
};

const markAllRead = async () => {
  const unread = notifications.value.filter(n => !n.est_lue);
  if (unread.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notification')
    .update({ est_lue: true })
    .eq('id_utilisateur', user.id)
    .eq('est_lue', false);

  notifications.value = notifications.value.map(n => ({ ...n, est_lue: true }));
};

const handleNotifClick = async (notif: any) => {
  if (!notif.est_lue) {
    await supabase
      .from('notification')
      .update({ est_lue: true })
      .eq('id', notif.id);
    notif.est_lue = true;
  }
};

const handleRefresh = async (event: CustomEvent) => {
  await loadNotifications();
  (event.target as HTMLIonRefresherElement).complete();
};

const setupRealtime = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  realtimeChannel = supabase
    .channel('notifications-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification',
        filter: `id_utilisateur=eq.${user.id}`
      },
      (payload: any) => {
        notifications.value.unshift(payload.new);
      }
    )
    .subscribe();
};

onMounted(async () => {
  await loadNotifications();
  await setupRealtime();
});

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80%;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.tout-lire {
  font-size: 13px;
  color: #ffffff;
}

.notif-list {
  padding: 8px 0;
}

.notif-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.notif-item:active {
  background: #f5f5f5;
}

.notif-unread {
  background: #f0faf9;
}

.notif-icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e0e0e0;
}

.notif-icon-wrapper.reaction { background: #ffe5ec; }
.notif-icon-wrapper.commentaire { background: #e5f0ff; }
.notif-icon-wrapper.amitie { background: #e5ffe8; }
.notif-icon-wrapper.badge { background: #fff8e5; }
.notif-icon-wrapper.defi { background: #f0e5ff; }

.notif-type-icon {
  font-size: 20px;
  color: #4ECDC4;
}

.notif-icon-wrapper.reaction .notif-type-icon { color: #eb445a; }
.notif-icon-wrapper.commentaire .notif-type-icon { color: #3880ff; }
.notif-icon-wrapper.amitie .notif-type-icon { color: #2dd36f; }
.notif-icon-wrapper.badge .notif-type-icon { color: #ffc409; }
.notif-icon-wrapper.defi .notif-type-icon { color: #8b5cf6; }

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-message {
  margin: 0 0 3px;
  font-size: 14px;
  color: #333333;
  line-height: 1.3;
}

.notif-time {
  font-size: 12px;
  color: #999999;
}

.unread-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #4ECDC4;
  flex-shrink: 0;
}
</style>
